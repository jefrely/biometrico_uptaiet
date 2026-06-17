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
        import datetime
        from apps.usuarios.models import ConfiguracionSistema

        tipo = request.data.get('tipo', 'entrada')

        if tipo not in ('entrada', 'salida', 'salida_almuerzo', 'entrada_almuerzo'):
            return Response({'ok': False, 'msg': 'Tipo de marcaje inválido.'}, status=400)

        config = ConfiguracionSistema.obtener()
        tz = timezone.get_current_timezone()
        ahora = timezone.localtime(timezone.now())
        hoy = ahora.date()

        service = obtener_servicio_zk()
        if service is None:
            return Response({
                'ok': False,
                'msg': 'Escáner no disponible. Verifique que esté conectado al USB.'
            }, status=503)

        huellas = HuellaDigital.objects.filter(activa=True).select_related('empleado')
        if not huellas.exists():
            service.cerrar()
            return Response({'ok': False, 'msg': 'No hay huellas registradas en el sistema.'}, status=400)

        templates_bd = [(bytes(h.template_encriptado), h.empleado.id) for h in huellas]
        resultado = service.verificar_huella(templates_bd)
        service.cerrar()

        if not resultado['ok']:
            return Response({'ok': False, 'msg': resultado['msg'], 'tip': 'Coloque el dedo centrado sobre el sensor.'})

        from apps.personal.models import Empleado, Horario
        try:
            empleado = Empleado.objects.get(id=resultado['empleado_id'], activo=True)
        except Empleado.DoesNotExist:
            return Response({'ok': False, 'msg': 'Empleado no encontrado o inactivo.'})

        inicio_dia = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.min), tz)
        fin_dia= timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max), tz)

        # ── Validación de doble marcaje ──
        registros_hoy = RegistroAsistencia.objects.filter(
            empleado=empleado,
            timestamp__range=(inicio_dia, fin_dia)
        ).order_by('timestamp')

        ultimo = registros_hoy.last()

        # No puede marcar entrada si ya marcó entrada sin salida
        if tipo == 'entrada':
            if ultimo and ultimo.tipo in ('entrada', 'entrada_almuerzo'):
                return Response({
                    'ok':False,
                    'msg':f'Ya registró {ultimo.get_tipo_display()} a las {timezone.localtime(ultimo.timestamp).strftime("%I:%M %p")}. Debe marcar salida primero.',
                    'empleado':empleado.nombre_completo
                })

        # No puede marcar salida sin entrada previa
        if tipo in ('salida', 'salida_almuerzo'):
            if not ultimo or ultimo.tipo in ('salida', 'salida_almuerzo'):
                return Response({
                    'ok':  False,
                    'msg': 'No puede registrar salida sin haber marcado entrada primero.',
                    'empleado': empleado.nombre_completo
                })

        # No puede marcar entrada_almuerzo sin salida_almuerzo
        if tipo == 'entrada_almuerzo':
            if not ultimo or ultimo.tipo != 'salida_almuerzo':
                return Response({
                    'ok':  False,
                    'msg': 'Debe registrar salida de almuerzo antes de marcar entrada de almuerzo.',
                    'empleado': empleado.nombre_completo
                })

        # ── Verificar horario del día ──
        dias_map = {
            'Monday':'lunes','Tuesday':'martes','Wednesday':'miercoles',
            'Thursday':'jueves','Friday':'viernes','Saturday':'sabado','Sunday':'domingo'
        }
        dia_hoy= dias_map[hoy.strftime('%A')]
        horario= Horario.objects.filter(empleado=empleado, dia=dia_hoy, activo=True).first()
        sin_horario = horario is None

        # ── Calcular estado del marcaje ──
        es_retardo = False
        minutos_retardo = 0
        minutos_antes = 0
        horas_extras = 0
        horas_faltantes = 0
        es_almuerzo = tipo in ('salida_almuerzo', 'entrada_almuerzo')
        mensaje_estado= ''

        hora_alm_inicio = datetime.datetime.combine(hoy, config.hora_almuerzo_inicio)
        hora_alm_fin= datetime.datetime.combine(hoy, config.hora_almuerzo_fin)
        hora_alm_inicio = timezone.make_aware(hora_alm_inicio, tz)
        hora_alm_fin= timezone.make_aware(hora_alm_fin, tz)

        if horario and not es_almuerzo:
            hora_entrada_horario = timezone.make_aware(
                datetime.datetime.combine(hoy, horario.hora_entrada), tz
            )
            hora_salida_horario = timezone.make_aware(
                datetime.datetime.combine(hoy, horario.hora_salida), tz
            )
            tolerancia = datetime.timedelta(minutes=horario.tolerancia_min)

            if tipo == 'entrada':
                diff = ahora - hora_entrada_horario
                if ahora > hora_entrada_horario + tolerancia:
                    es_retardo = True
                    minutos_retardo = int(diff.total_seconds() / 60)
                    mensaje_estado = f'Retraso de {minutos_retardo} minutos'
                elif ahora < hora_entrada_horario:
                    minutos_antes = int((hora_entrada_horario - ahora).total_seconds() / 60)
                    mensaje_estado = f'Llegó {minutos_antes} minutos antes'
                else:
                    mensaje_estado = 'Llegó a tiempo'

            elif tipo == 'salida':
                diff = ahora - hora_salida_horario
                seg = diff.total_seconds()
                if ahora < hora_salida_horario:
                    faltantes = hora_salida_horario - ahora
                    horas_faltantes = round(faltantes.total_seconds() / 3600, 2)
                    mensaje_estado = f'Salió {int(faltantes.total_seconds() / 60)} min antes del horario'
                elif seg > 0:
                    horas_extras = round(seg / 3600, 2)
                    mensaje_estado = f'Horas extras: {horas_extras:.1f}h'
                else:
                    mensaje_estado = 'Salida a tiempo'

                # Calcular horas trabajadas
                entrada = registros_hoy.filter(tipo='entrada').first()
                if entrada:
                    tiempo_trabajado = ahora - timezone.localtime(entrada.timestamp)
                    # Restar tiempo de almuerzo si marcó
                    salida_alm  = registros_hoy.filter(tipo='salida_almuerzo').first()
                    entrada_alm = registros_hoy.filter(tipo='entrada_almuerzo').first()
                    if salida_alm and entrada_alm:
                        tiempo_almuerzo  = timezone.localtime(entrada_alm.timestamp) - timezone.localtime(salida_alm.timestamp)
                        tiempo_trabajado -= tiempo_almuerzo

        elif tipo in ('salida_almuerzo', 'entrada_almuerzo'):
            tol_alm = datetime.timedelta(minutes=config.tolerancia_almuerzo_min)
            if tipo == 'salida_almuerzo':
                if ahora < hora_alm_inicio:
                    minutos_antes  = int((hora_alm_inicio - ahora).total_seconds() / 60)
                    mensaje_estado = f'Salió al almuerzo {minutos_antes} min antes'
                elif ahora > hora_alm_inicio + tol_alm:
                    minutos_retardo = int((ahora - hora_alm_inicio).total_seconds() / 60)
                    mensaje_estado  = f'Salió al almuerzo {minutos_retardo} min tarde'
                else:
                    mensaje_estado = 'Salida a almuerzo a tiempo'
            else:
                if ahora < hora_alm_fin:
                    minutos_antes  = int((hora_alm_fin - ahora).total_seconds() / 60)
                    mensaje_estado = f'Regresó del almuerzo {minutos_antes} min antes'
                elif ahora > hora_alm_fin + tol_alm:
                    es_retardo      = True
                    minutos_retardo = int((ahora - hora_alm_fin).total_seconds() / 60)
                    mensaje_estado  = f'Retraso de {minutos_retardo} min en regreso de almuerzo'
                else:
                    mensaje_estado = 'Regresó del almuerzo a tiempo'

        # ── Calcular horas trabajadas al marcar salida ──
        horas_trabajadas = None
        if tipo == 'salida':
            entrada = registros_hoy.filter(tipo='entrada').first()
            if entrada:
                diff_trabajo = ahora - timezone.localtime(entrada.timestamp)
                salida_alm   = registros_hoy.filter(tipo='salida_almuerzo').first()
                entrada_alm  = registros_hoy.filter(tipo='entrada_almuerzo').first()
                if salida_alm and entrada_alm:
                    diff_almuerzo = timezone.localtime(entrada_alm.timestamp) - timezone.localtime(salida_alm.timestamp)
                    diff_trabajo -= diff_almuerzo
                horas_trabajadas = round(diff_trabajo.total_seconds() / 3600, 2)

         # ── Crear registro ──
        registro = RegistroAsistencia.objects.create(
            empleado         = empleado,
            tipo             = tipo,
            estado           = 'verificado',
            es_retardo       = es_retardo,
            minutos_retardo  = minutos_retardo,
            minutos_antes    = minutos_antes,
            horas_extras     = horas_extras,
            horas_faltantes  = horas_faltantes,
            horas_trabajadas = horas_trabajadas,
            es_almuerzo      = es_almuerzo,
            sin_horario      = sin_horario,
            ip_origen        = request.META.get('REMOTE_ADDR'),
            score_verificacion = resultado['score'],
        )

        # ── Respuesta ──
        tipo_display = {
            'entrada':          '✅ Entrada registrada',
            'salida':           '🚪 Salida registrada',
            'salida_almuerzo':  '🍽 Salida a almuerzo',
            'entrada_almuerzo': '✅ Regreso de almuerzo',
        }.get(tipo, tipo)

        respuesta = {
            'ok':              True,
            'empleado':        empleado.nombre_completo,
            'cedula':          empleado.cedula,
            'tipo':            tipo,
            'tipo_display':    tipo_display,
            'hora':            ahora.strftime('%I:%M %p'),
            'fecha':           ahora.strftime('%d/%m/%Y'),
            'departamento':    empleado.departamento.nombre,
            'cargo':           empleado.cargo,
            'es_retardo':      es_retardo,
            'minutos_retardo': minutos_retardo,
            'minutos_antes':   minutos_antes,
            'horas_extras':    float(horas_extras),
            'horas_faltantes': float(horas_faltantes),
            'horas_trabajadas':float(horas_trabajadas) if horas_trabajadas else None,
            'mensaje_estado':  mensaje_estado,
            'sin_horario':     sin_horario,
            'es_almuerzo':     es_almuerzo,
            'foto':            request.build_absolute_uri(empleado.foto.url) if empleado.foto else None,
        }

        if sin_horario:
            respuesta['aviso'] = f'{empleado.nombres} no tiene horario asignado para el día de hoy.'

        return Response(respuesta)


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
        from apps.personal.models import Empleado

        tz     = timezone.get_current_timezone()
        ahora  = timezone.localtime(timezone.now())
        hoy    = ahora.date()
        inicio = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.min), tz)
        fin    = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max), tz)

        # Inicio del mes
        primer_dia_mes = hoy.replace(day=1)
        inicio_mes     = timezone.make_aware(datetime.datetime.combine(primer_dia_mes, datetime.time.min), tz)

        total_personal  = Empleado.objects.filter(activo=True).count()

        asistencias_hoy = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin), tipo='entrada', estado='verificado'
        ).values('empleado').distinct().count()

        retrasos_hoy = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin), tipo='entrada', es_retardo=True
        ).count()

        inasistencias_hoy = AusenciaAutomatica.objects.filter(fecha=hoy).count()

        # Estadísticas del mes
        dias_transcurridos = (hoy - primer_dia_mes).days + 1

        presentes_mes = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio_mes, fin),
            tipo='entrada',
            estado='verificado'
        ).values('empleado', 'timestamp__date').distinct().count()

        ausentes_mes = AusenciaAutomatica.objects.filter(
            fecha__gte=primer_dia_mes,
            fecha__lte=hoy
        ).count()

        retrasos_mes = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio_mes, fin),
            tipo='entrada',
            es_retardo=True
        ).count()

        total_posible = total_personal * dias_transcurridos
        indice = round((presentes_mes / total_posible * 100), 1) if total_posible > 0 else 0

        # Gráfica por día del mes
        grafica_mes = []
        for dia_num in range(1, dias_transcurridos + 1):
            fecha_dia = primer_dia_mes.replace(day=dia_num)
            ini_dia = timezone.make_aware(datetime.datetime.combine(fecha_dia, datetime.time.min), tz)
            fin_dia = timezone.make_aware(datetime.datetime.combine(fecha_dia, datetime.time.max), tz)

            presentes_dia = RegistroAsistencia.objects.filter(
                timestamp__range=(ini_dia, fin_dia),
                tipo='entrada', estado='verificado'
            ).values('empleado').distinct().count()

            ausentes_dia= AusenciaAutomatica.objects.filter(fecha=fecha_dia).count()
            retrasos_dia= RegistroAsistencia.objects.filter(
                timestamp__range=(ini_dia, fin_dia),
                tipo='entrada', es_retardo=True
            ).count()

            grafica_mes.append({
                'dia':dia_num,
                'presentes': presentes_dia,
                'ausentes': ausentes_dia,
                'retrasos': retrasos_dia,
            })

        ultimos = RegistroAsistencia.objects.filter(
            timestamp__range=(inicio, fin)
        ).select_related('empleado').order_by('-timestamp')[:10]

        return Response({
            'total_personal': total_personal,
            'asistencias_hoy': asistencias_hoy,
            'retrasos_hoy': retrasos_hoy,
            'inasistencias_hoy': inasistencias_hoy,
            'mes': {
                'presentes':presentes_mes,
                'ausentes': ausentes_mes,
                'retrasos':retrasos_mes,
                'indice': indice,
               'dias': dias_transcurridos,
            },
            'grafica_mes': grafica_mes,
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
                'documento': request.build_absolute_uri(p.documento.url) if p.documento else None,
            })
        return Response(data)

    def post(self, request):
        from .models import PermisoEmpleado
        from apps.personal.models import Empleado

        if request.user.rol not in ('admin', 'supervisor', 'operador'):
            return Response({'error': 'Sin permisos.'}, status=403)
        empleado_id= request.data.get('empleado_id')
        tipo= request.data.get('tipo')
        fecha_inicio= request.data.get('fecha_inicio')
        fecha_fin= request.data.get('fecha_fin')
        motivo= request.data.get('motivo', '')

        if not all([empleado_id,tipo,fecha_inicio,fecha_fin]):
            return Response({'error': 'Faltan campos requeridos.'}, status=400)

        try:
            empleado= Empleado.objects.get(id=empleado_id, activo=True)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=404)

        permiso = PermisoEmpleado.objects.create(
            empleado=empleado,
            tipo=tipo,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            motivo=motivo,
            estado='PENDIENTE',
        )

        # Guardar documento si viene adjunto
        if 'documento' in request.FILES:
            permiso.documento = request.FILES['documento']
            permiso.save()
        return Response({'ok': True, 'id': permiso.id, 'msg': 'Permiso creado correctamente.'}, status=201)


class PermisoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, permiso_id):
        from .models import PermisoEmpleado

        if request.user.rol not in ('admin', 'supervisor'):
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