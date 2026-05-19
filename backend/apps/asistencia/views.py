from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from .models import RegistroAsistencia, AusenciaAutomatica
from .serializers import RegistroAsistenciaSerializer, AusenciaSerializer
from apps.personal.models import Empleado, Horario
from apps.biometrico.models import HuellaDigital
from apps.biometrico.zkfinger_service import ZK9500Service
import datetime

# ── Instancia global del escaner (se inicializa una sola vez) ─────────────────
_zk_service = None

def obtener_servicio_zk():
    global _zk_service
    if _zk_service is None:
        _zk_service = ZK9500Service()
        resultado = _zk_service.inicializar()
        if not resultado['ok']:
            _zk_service = None
    return _zk_service


class MarcarAsistenciaView(APIView):
    """
    Endpoint principal de marcaje biometrico.
    El frontend llama a este endpoint, el backend activa el escaner,
    captura la huella y registra la asistencia automaticamente.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        tipo = request.data.get('tipo', 'entrada')

        if tipo not in ('entrada', 'salida'):
            return Response({'ok': False, 'msg': 'Tipo invalido. Use entrada o salida.'}, status=400)

        # Obtener el servicio del escaner
        service = obtener_servicio_zk()
        if service is None:
            return Response({
                'ok':  False,
                'msg': 'Escaner no disponible. Verifique que este conectado al USB.'
            }, status=503)

        # Cargar todos los templates activos de la BD
        huellas = HuellaDigital.objects.filter(activa=True).select_related('empleado')
        if not huellas.exists():
            return Response({
                'ok':  False,
                'msg': 'No hay huellas registradas en el sistema.'
            }, status=400)

        templates_bd = [
            (bytes(h.template_encriptado), h.empleado.id)
            for h in huellas
        ]

        # Capturar y verificar huella contra la BD
        resultado = service.verificar_huella(templates_bd)

        if not resultado['ok']:
            return Response({
                'ok':  False,
                'msg': resultado['msg'],
                'tip': 'Coloque el dedo centrado sobre el sensor.'
            })

        # Obtener el empleado identificado
        try:
            empleado = Empleado.objects.get(id=resultado['empleado_id'], activo=True)
        except Empleado.DoesNotExist:
            return Response({'ok': False, 'msg': 'Empleado no encontrado o inactivo.'}, status=404)

        # Detectar doble marcaje (mismo tipo en los ultimos 5 minutos)
        cinco_min = timezone.now() - datetime.timedelta(minutes=5)
        ya_marco = RegistroAsistencia.objects.filter(
            empleado=empleado,
            tipo=tipo,
            timestamp__gte=cinco_min
        ).exists()

        if ya_marco:
            return Response({
                'ok':      False,
                'msg':     f'Ya registro {tipo} recientemente. Espere unos minutos.',
                'empleado': empleado.nombre_completo
            })

        # Calcular si hay retardo
        es_retardo      = False
        minutos_retardo = 0
        ahora           = timezone.now()
        dias_map = {
            'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles',
            'thursday': 'jueves', 'friday': 'viernes',
            'saturday': 'sabado', 'sunday': 'domingo'
        }
        dia_es  = dias_map.get(ahora.strftime('%A').lower(), '')
        horario = Horario.objects.filter(empleado=empleado, dia=dia_es, activo=True).first()

        if horario and tipo == 'entrada':
            hora_limite = datetime.datetime.combine(
                ahora.date(), horario.hora_entrada, tzinfo=ahora.tzinfo
            ) + datetime.timedelta(minutes=horario.tolerancia_min)
            if ahora > hora_limite:
                es_retardo = True
                diff = ahora - datetime.datetime.combine(
                    ahora.date(), horario.hora_entrada, tzinfo=ahora.tzinfo
                )
                minutos_retardo = int(diff.total_seconds() / 60)

        # Guardar el registro de asistencia
        registro = RegistroAsistencia.objects.create(
            empleado         = empleado,
            tipo             = tipo,
            estado           = 'verificado',
            score_verificacion = resultado['score'],
            es_retardo       = es_retardo,
            minutos_retardo  = minutos_retardo,
            ip_origen        = request.META.get('REMOTE_ADDR')
        )

        return Response({
            'ok':             True,
            'empleado':       empleado.nombre_completo,
            'cedula':         empleado.cedula,
            'tipo':           tipo,
            'hora':           registro.timestamp.strftime('%I:%M %p'),
            'fecha':          registro.timestamp.strftime('%d/%m/%Y'),
            'es_retardo':     es_retardo,
            'minutos_retardo': minutos_retardo,
            'departamento':   empleado.departamento.nombre,
            'score':          resultado['score']
        })


class RegistrarHuellaView(APIView):
    """
    Registra la huella de un empleado desde el panel admin.
    Solo administradores pueden registrar huellas.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.es_admin:
            return Response({'error': 'Sin permisos para registrar huellas.'}, status=403)

        empleado_id = request.data.get('empleado_id')
        numero_dedo = request.data.get('numero_dedo', 1)

        try:
            empleado = Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=404)

        service = obtener_servicio_zk()
        if service is None:
            return Response({'error': 'Escaner no disponible.'}, status=503)

        resultado = service.registrar_huella(empleado_id=empleado.id, numero_dedo=numero_dedo)

        if not resultado['ok']:
            return Response({'error': resultado['msg']}, status=400)

        # Reemplazar huella existente del mismo dedo
        HuellaDigital.objects.filter(empleado=empleado, numero_dedo=numero_dedo).delete()

        huella = HuellaDigital.objects.create(
            empleado            = empleado,
            numero_dedo         = numero_dedo,
            template_encriptado = resultado['template_encriptado'],
            calidad             = resultado['calidad'],
            activa              = True,
            registrado_por      = request.user
        )

        return Response({
            'ok':         True,
            'msg':        f'Huella registrada para {empleado.nombre_completo}',
            'huella_id':  huella.id,
            'calidad':    huella.calidad
        })


class DashboardView(APIView):
    """
    Datos del dashboard: totales, asistencias del dia, ultimos registros.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy    = timezone.now().date()
        inicio = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.min))
        fin    = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max))

        total_personal    = Empleado.objects.filter(activo=True).count()
        asistencias_hoy   = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin),
            tipo='entrada',
            estado='verificado'
        ).values('empleado').distinct().count()
        retrasos_hoy      = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin),
            tipo='entrada',
            es_retardo=True
        ).count()
        inasistencias_hoy = AusenciaAutomatica.objects.filter(fecha=hoy).count()

        ultimos = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin)
        ).select_related('empleado').order_by('-timestamp')[:10]

        return Response({
            'total_personal':    total_personal,
            'asistencias_hoy':   asistencias_hoy,
            'retrasos_hoy':      retrasos_hoy,
            'inasistencias_hoy': inasistencias_hoy,
            'ultimos_registros': RegistroAsistenciaSerializer(ultimos, many=True).data
        })


class HistorialEmpleadoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, empleado_id):
        try:
            empleado = Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=404)

        registros = RegistroAsistencia.objects.filter(empleado=empleado).order_by('-timestamp')

        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin    = request.query_params.get('fecha_fin')
        if fecha_inicio:
            registros = registros.filter(timestamp__date__gte=fecha_inicio)
        if fecha_fin:
            registros = registros.filter(timestamp__date__lte=fecha_fin)

        return Response({
            'empleado': {
                'id':           empleado.id,
                'nombre':       empleado.nombre_completo,
                'cedula':       empleado.cedula,
                'departamento': empleado.departamento.nombre,
            },
            'registros': RegistroAsistenciaSerializer(registros, many=True).data
        })
    
class RegistrarHuellaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.biometrico.zkfinger_service import ZK9500Service
        from apps.biometrico.models import HuellaDigital
        from apps.personal.models import Empleado
        from django.http import StreamingHttpResponse
        import json

        if not request.user.es_admin and not request.user.es_supervisor:
            return Response({'ok': False, 'msg': 'Sin permisos.'}, status=403)

        empleado_id = request.data.get('empleado_id')
        numero_dedo = request.data.get('numero_dedo', 1)

        if not empleado_id:
            return Response({'ok': False, 'msg': 'empleado_id es requerido.'}, status=400)

        try:
            empleado = Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return Response({'ok': False, 'msg': 'Empleado no encontrado.'}, status=404)

        def stream():
            def evento(tipo, msg):
                data = json.dumps({'tipo': tipo, 'msg': msg})
                return f"data: {data}\n\n"

            try:
                service = ZK9500Service()
                init    = service.inicializar()
                if not init['ok']:
                    yield evento('error', init['msg'])
                    return

                templates = []
                for intento in range(1, 4):
                    yield evento('instruccion', f'Captura {intento} de 3 — Coloque el dedo en el escáner')
                    import time
                    time.sleep(0.5)

                    captura = service.capturar_huella(timeout=20)
                    if not captura['ok']:
                        yield evento('error', f'Error en captura {intento}: {captura["msg"]}')
                        service.cerrar()
                        return

                    templates.append(captura['template'])
                    yield evento('captura_ok', f'Captura {intento} exitosa')

                    if intento < 3:
                        yield evento('instruccion', 'Retire el dedo del escáner')
                        time.sleep(1.5)

                # Guardar el mejor template
                template_final      = max(templates, key=lambda t: len(t))
                template_encriptado = service._fernet.encrypt(template_final)
                service.cerrar()

                HuellaDigital.objects.filter(
                    empleado_id=empleado_id, numero_dedo=numero_dedo
                ).delete()

                huella = HuellaDigital.objects.create(
                    empleado_id         = empleado_id,
                    numero_dedo         = numero_dedo,
                    template_encriptado = template_encriptado,
                    calidad             = 80,
                    activa              = True,
                    registrado_por      = request.user
                )

                yield evento('exito', f'Huella registrada correctamente. Calidad: {huella.calidad}/100')

            except Exception as e:
                yield evento('error', f'Error inesperado: {str(e)}')

        response = StreamingHttpResponse(stream(), content_type='text/event-stream')
        response['Cache-Control']               = 'no-cache'
        response['X-Accel-Buffering']           = 'no'
        response['Access-Control-Allow-Origin'] = '*'
        return response
        

class HuellasEmpleadosView (APIView):
    """devuelve que dedos tiene registrados un empleado"""
    permission_classes = [IsAuthenticated]

    def get (self, request, empleado_id):
        from apps.biometrico.models import HuellaDigital

        huellas =HuellaDigital.objects.filter(
            empleado_id=empleado_id, activa=True
        ).values("id", "numero_dedo","calidad", "fecha_registro")

        DEDOS ={
            1: 'Pulgar derecho',   2: 'Indice derecho',
            3: 'Medio derecho',    4: 'Anular derecho',
            5: 'Menique derecho',  6: 'Pulgar izquierdo',
            7: 'Indice izquierdo', 8: 'Medio izquierdo',
            9: 'Anular izquierdo', 10:'Menique izquierdo',
        }

        registrados= {h["numero_dedo"]: h for h in huellas}

        dedos = []
        for num, nombre in DEDOS.items():
            if num in registrados:
                h=registrados[num]
                dedos.append ({
                    "numero": num,
                    "nombre": nombre,
                    "registrado": True,
                    "calidad": h["calidad"],
                    "fecha": h["fecha_registro"].strftime("%d/%m/%Y")
                })
            else:
                dedos.append({
                    "numero": num,
                    "nombre": nombre,
                    "registrado": False,
                    "calidad": 0,
                    "fecha": ""
                })
        return Response ({"empleado_id": empleado_id, "dedos": dedos}) 
    

    def delete (self, request, empleado_id):
        """elimina una huella especifica de un empleado"""
        from apps.biometrico.models import HuellaDigital

        if not request.user.es_admin:
            return Response ({"ok": False, "msg": "Sin permisos"}, status=403)
        
        numero_dedo=request.data.get("numero_dedo")
        HuellaDigital.objects.filter(
            empleado_id=empleado_id, numero_dedo=numero_dedo
        ).delete()

        return Response ({"ok": True, "msg": "Huella eliminada "})