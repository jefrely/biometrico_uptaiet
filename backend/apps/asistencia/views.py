from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.http import StreamingHttpResponse
from django.utils import timezone
from .models import RegistroAsistencia, AusenciaAutomatica
from .serializers import RegistroAsistenciaSerializer, AusenciaSerializer
from apps.personal.models import Empleado, Horario
from apps.biometrico.models import HuellaDigital
from apps.biometrico.zkfinger_service import ZK9500Service
import datetime
import json

def _formatear_retardo(minutos):
    """Convierte minutos a formato legible: 37min, 1h, 1h 25min"""
    if minutos <= 0:
        return ''
    if minutos < 60:
        return f'{minutos} min'
    horas   = minutos // 60
    minutos_restantes = minutos % 60
    if minutos_restantes == 0:
        return f'{horas}h'
    return f'{horas}h {minutos_restantes}min'

def obtener_servicio_zk():
    """
    Crea una instancia nueva del servicio en cada llamada.
    Esto garantiza que el SDK se inicialice limpio en cada uso.
    """
    service   = ZK9500Service()
    resultado = service.inicializar()
    if not resultado['ok']:
        print(f"  Error al inicializar ZK9500: {resultado['msg']}")
        return None
    return service


# ── Marcaje biométrico ─────────────────────────────────────────────────────────

class MarcarAsistenciaView(APIView):
    """
    Endpoint principal de marcaje.
    Activa el escaner, captura la huella, identifica al empleado y registra.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        tipo = request.data.get('tipo', 'entrada')

        if tipo not in ('entrada', 'salida'):
            return Response({'ok': False, 'msg': 'Tipo invalido. Use entrada o salida.'}, status=400)

        # Inicializar escaner
        service = obtener_servicio_zk()
        if service is None:
            return Response({
                'ok':  False,
                'msg': 'Escaner no disponible. Verifique que este conectado al USB.'
            }, status=503)

        # Cargar todos los templates activos de la BD
        huellas = HuellaDigital.objects.filter(activa=True).select_related('empleado')
        if not huellas.exists():
            service.cerrar()
            return Response({
                'ok': False,
                'msg':'No hay huellas registradas en el sistema.'
            }, status=400)

        templates_bd = [
            (bytes(h.template_encriptado), h.empleado.id)
            for h in huellas
        ]

        # Verificar huella
        resultado = service.verificar_huella(templates_bd)
        service.cerrar()  # Siempre cerrar el escaner al terminar

        if not resultado['ok']:
            return Response({
                'ok': False,
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
        ya_marco  = RegistroAsistencia.objects.filter(
            empleado=empleado,
            tipo=tipo,
            timestamp__gte=cinco_min
        ).exists()

        if ya_marco:
            return Response({
                'ok': False,
                'msg': f'Ya registro {tipo} recientemente. Espere unos minutos.',
                'empleado': empleado.nombre_completo
            })

        # Calcular si hay retardo
        es_retardo= False
        minutos_retardo = 0
        ahora = timezone.now()
        dias_map = {
            'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles',
            'thursday': 'jueves', 'friday': 'viernes',
            'saturday': 'sabado', 'sunday': 'domingo'
        }
        dia_es  = dias_map.get(ahora.strftime('%A').lower(), '')
        horario = Horario.objects.filter(empleado=empleado, dia=dia_es, activo=True).first()

        if horario and tipo == 'entrada':
            # Usar hora LOCAL de Venezuela para comparar con el horario
            ahora_local = timezone.localtime(ahora)

            hora_entrada_dt = datetime.datetime.combine(
                ahora_local.date(),
                horario.hora_entrada
            ).replace(tzinfo=ahora_local.tzinfo)

            hora_limite = hora_entrada_dt + datetime.timedelta(minutes=horario.tolerancia_min)

            if ahora_local > hora_limite:
                es_retardo = True
                diff = ahora_local - hora_entrada_dt
                minutos_retardo = int(diff.total_seconds() / 60)

        # Guardar registro de asistencia
        registro = RegistroAsistencia.objects.create(
            empleado= empleado,
            tipo= tipo,
            estado= 'verificado',
            score_verificacion = resultado['score'],
            es_retardo= es_retardo,
            minutos_retardo = minutos_retardo,
            ip_origen = request.META.get('REMOTE_ADDR')
        )

        return Response({
            'ok':True,
            'empleado':empleado.nombre_completo,
            'cedula':empleado.cedula,
            'tipo':tipo,
            'hora':timezone.localtime(registro.timestamp).strftime('%I:%M %p'),
            'fecha':registro.timestamp.strftime('%d/%m/%Y'),
            'es_retardo':es_retardo,
            'minutos_retardo':minutos_retardo,
            'retardo_display': _formatear_retardo(minutos_retardo),
            'departamento':empleado.departamento.nombre,
            'score':resultado['score']
        })


# ── Registro de huellas (SSE — mensajes en tiempo real) ───────────────────────

class RegistrarHuellaView(APIView):
    """
    Registra la huella de un empleado con Server-Sent Events.
    Envía mensajes en tiempo real al frontend durante las 3 capturas.
    Solo administradores y supervisores pueden registrar huellas.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.es_admin and not request.user.es_supervisor:
            return Response({'ok': False, 'msg': 'Sin permisos.'}, status=403)

        empleado_id = request.data.get('empleado_id')
        numero_dedo = int(request.data.get('numero_dedo', 1))

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

            service = None
            try:
                service = ZK9500Service()
                init    = service.inicializar()
                if not init['ok']:
                    yield evento('error', init['msg'])
                    return

                templates = []
                for intento in range(1, 4):
                    yield evento('instruccion', f'Captura {intento} de 3 — Coloque el dedo en el escaner')
                    import time
                    time.sleep(0.5)

                    captura = service.capturar_huella(timeout=20)
                    if not captura['ok']:
                        yield evento('error', f'Error en captura {intento}: {captura["msg"]}')
                        service.cerrar()
                        return

                    templates.append(captura['template'])
                    yield evento('captura_ok', f'Captura {intento} exitosa — {len(captura["template"])} bytes')

                    if intento < 3:
                        yield evento('instruccion', 'Retire el dedo del escaner')
                        time.sleep(1.5)

                # Usar el template más grande como definitivo
                template_final = max(templates, key=len)
                template_encriptado = service._fernet.encrypt(template_final)
                service.cerrar()

                # Eliminar huella anterior del mismo dedo y guardar la nueva
                HuellaDigital.objects.filter(
                    empleado_id=empleado_id,
                    numero_dedo=numero_dedo
                ).delete()

                huella = HuellaDigital.objects.create(
                    empleado_id = empleado_id,
                    numero_dedo = numero_dedo,
                    template_encriptado = template_encriptado,
                    calidad = 80,
                    activa = True,
                    registrado_por = request.user
                )

                yield evento('exito', f'Huella registrada correctamente. Calidad: {huella.calidad}/100')

            except Exception as e:
                if service:
                    try:
                        service.cerrar()
                    except Exception:
                        pass
                yield evento('error', f'Error inesperado: {str(e)}')

        response = StreamingHttpResponse(stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Access-Control-Allow-Origin'] = '*'
        return response


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy = timezone.now().date()
        inicio = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.min))
        fin = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max))

        total_personal = Empleado.objects.filter(activo=True).count()
        asistencias_hoy = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin),
            tipo='entrada',
            estado='verificado'
        ).values('empleado').distinct().count()
        retrasos_hoy= RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin),
            tipo='entrada',
            es_retardo=True
        ).count()
        inasistencias_hoy = AusenciaAutomatica.objects.filter(fecha=hoy).count()

        ultimos = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin)
        ).select_related('empleado').order_by('-timestamp')[:10]

        return Response({
            'total_personal':total_personal,
            'asistencias_hoy': asistencias_hoy,
            'retrasos_hoy': retrasos_hoy,
            'inasistencias_hoy': inasistencias_hoy,
            'ultimos_registros': RegistroAsistenciaSerializer(ultimos, many=True).data
        })


# ── Historial por empleado ─────────────────────────────────────────────────────

class HistorialEmpleadoView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request, empleado_id):
        try:
            empleado= Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=404)

        registros = RegistroAsistencia.objects.filter(empleado=empleado).order_by('-timestamp')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')

        if fecha_inicio:
            registros = registros.filter(timestamp__date__gte=fecha_inicio)
        if fecha_fin:
            registros = registros.filter(timestamp__date__lte=fecha_fin)

        return Response({
            'empleado': {
                'id':empleado.id,
                'nombre':empleado.nombre_completo,
                'cedula':empleado.cedula,
                'departamento': empleado.departamento.nombre,
            },
            'registros': RegistroAsistenciaSerializer(registros, many=True).data
        })


# ── Huellas por empleado ───────────────────────────────────────────────────────

class HuellasEmpleadoView(APIView):
    permission_classes = [IsAuthenticated]

    DEDOS = {
        1:'Pulgar derecho', 2: 'Indice derecho',
        3:'Medio derecho', 4:'Anular derecho',
        5:'Menique derecho',6:'Pulgar izquierdo',
        7:'Indice izquierdo',8:'Medio izquierdo',
        9:'Anular izquierdo',10:'Menique izquierdo',
    }

    def get(self, request, empleado_id):
        huellas = HuellaDigital.objects.filter(
            empleado_id=empleado_id, activa=True
        ).values('id', 'numero_dedo', 'calidad', 'fecha_registro')

        registrados = {h['numero_dedo']: h for h in huellas}

        dedos = []
        for num, nombre in self.DEDOS.items():
            if num in registrados:
                h = registrados[num]
                dedos.append({
                    'numero':num,
                    'nombre':nombre,
                    'registrado': True,
                    'calidad':h['calidad'],
                    'fecha':h['fecha_registro'].strftime('%d/%m/%Y')
                })
            else:
                dedos.append({
                    'numero':num,
                    'nombre':nombre,
                    'registrado': False,
                    'calidad':0,
                    'fecha':''
                })

        return Response({'empleado_id': empleado_id, 'dedos': dedos})

    def delete(self, request, empleado_id):
        if not request.user.es_admin:
            return Response({'ok': False, 'msg': 'Sin permisos.'}, status=403)

        numero_dedo = request.data.get('numero_dedo')
        HuellaDigital.objects.filter(
            empleado_id=empleado_id,
            numero_dedo=numero_dedo
        ).delete()

        return Response({'ok': True, 'msg': 'Huella eliminada correctamente.'})
    


class PermisoListView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request):
        from .models import PermisoEmpleado
        permisos = PermisoEmpleado.objects.filter(activo=True).select_related(
            "empleado", "aprobado_por"
        ).order_by("-fecha_inicio")

        empleado_id = request.query_params.get('empleado')
        estado= request.query_params.get('estado')
        if empleado_id:
            permisos=permisos.filter(empleado_id=empleado_id)
        if estado:
            permisos= permisos.filter(estado=estado)

        data=[]
        for p in permisos:
            data.append({
                'id': p.id,
                'empleado_id':p.empleado.id,
                'empleado': p.empleado.nombre_completo,
                'cedula':p.empleado.cedula,
                'tipo':p.tipo,
                'tipo_display':p.get_tipo_display(),
                'fecha_inicio':p.fecha_inicio.strftime('%d/%m/%Y'),
                'fecha_fin':p.fecha_fin.strftime('%d/%m/%Y'),
                'fecha_inicio_iso':str(p.fecha_inicio),
                'fecha_fin_iso':str(p.fecha_fin),
                'motivo': p.motivo,
                'estado':p.estado,
                'observacion':p.observacion,
                'aprobado_por':p.aprobado_por.username if p.aprobado_por else None,
                'created_at':timezone.localtime(p.created_at).strftime('%d/%m/%Y'),
            })
        return Response(data)

    def post(self, request):
        from .models import PermisoEmpleado
        from apps.personal.models import Empleado

        if request.user.rol not in ('admin', 'supervisor'):
            return Response({'error': 'Sin permisos.'}, status=403)

        empleado_id= request.data.get('empleado_id')
        tipo= request.data.get('tipo')
        fecha_inicio= request.data.get('fecha_inicio')
        fecha_fin = request.data.get('fecha_fin')
        motivo = request.data.get('motivo', '')

        if not all([empleado_id, tipo, fecha_inicio, fecha_fin]):
            return Response({'error':'Faltan campos requeridos.'}, status=400)

        try:
            empleado = Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return Response({'error':'Empleado no encontrado.'}, status=404)

        permiso= PermisoEmpleado.objects.create(
            empleado= empleado,
            tipo= tipo,
            fecha_inicio= fecha_inicio,
            fecha_fin=fecha_fin,
            motivo= motivo,
            estado= 'PENDIENTE',
        )

        return Response({'ok': True, 'id': permiso.id, 'msg': 'Permiso creado correctamente.'}, status=201)


class PermisoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, permiso_id):
        from .models import PermisoEmpleado

        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)

        try:
            permiso = PermisoEmpleado.objects.get(id=permiso_id)
        except PermisoEmpleado.DoesNotExist:
            return Response({'error':'Permiso no encontrado.'}, status=404)

        estado= request.data.get('estado')
        observacion= request.data.get('observacion', '')

        if estado not in ('APROBADO','RECHAZADO','PENDIENTE'):
            return Response({'error':'Estado inválido.'}, status=400)

        permiso.estado= estado
        permiso.observacion=observacion
        if estado =='APROBADO':
            permiso.aprobado_por = request.user
        permiso.save()

        return Response({'ok': True, 'msg': f'Permiso {estado.lower()} correctamente.'})

    def delete(self, request, permiso_id):
        from .models import PermisoEmpleado

        if not request.user.es_admin:
            return Response({'error': 'Sin permisos.'}, status=403)

        try:
            permiso = PermisoEmpleado.objects.get(id=permiso_id)
            permiso.activo = False
            permiso.save()
            return Response({'ok': True, 'msg': 'Permiso eliminado.'})
        except PermisoEmpleado.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)


class FeriadoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import DiaFeriado
        feriados = DiaFeriado.objects.all().order_by('fecha')
        data = [{
            'id':f.id,
            'nombre': f.nombre,
            'fecha': f.fecha.strftime('%d/%m/%Y'),
            'fecha_iso':str(f.fecha),
            'obligatorio':f.obligatorio,
            'descripcion': f.descripcion,
        } for f in feriados]
        return Response(data)

    def post(self, request):
        from .models import DiaFeriado

        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)

        nombre= request.data.get('nombre')
        fecha= request.data.get('fecha')
        if not nombre or not fecha:
            return Response({'error':'Nombre y fecha son requeridos.'}, status=400)

        if DiaFeriado.objects.filter(fecha=fecha).exists():
            return Response({'error': 'Ya existe un feriado para esa fecha.'}, status=400)

        feriado = DiaFeriado.objects.create(
            nombre = nombre,
            fecha= fecha,
            obligatorio= request.data.get('obligatorio',True),
            descripcion= request.data.get('descripcion',''),
        )
        return Response({'ok': True, 'id': feriado.id, 'msg': 'Feriado creado.'}, status=201)

    def delete(self, request, feriado_id=None):
        from .models import DiaFeriado

        if not request.user.es_admin:
            return Response({'error':'Sin permisos.'}, status=403)

        feriado_id = request.data.get('feriado_id') or feriado_id
        try:
            DiaFeriado.objects.get(id=feriado_id).delete()
            return Response({'ok': True,'msg':'Feriado eliminado.'})
        except DiaFeriado.DoesNotExist:
            return Response({'error':'No encontrado.'}, status=404)