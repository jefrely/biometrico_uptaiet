from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Departamento, Empleado, Horario
from .serializers import DepartamentoSerializer, EmpleadoSerializer, HorarioSerializer

class DepartamentoListView(APIView):
    permission_classes= [IsAuthenticated]

    def get(self, request):
        departamentos= Departamento.objects.filter(activo=True)
        serializer= DepartamentoSerializer(departamentos, many=True)
        return Response (serializer.data)
    
    def post(self,request):
        if not request.user.es_admin:
            return Response({"ERROR": "Sin permisos."}, status=403)
        serializer= DepartamentoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    

class DepartamentoDetailView (APIView):
    permission_classes= [IsAuthenticated]

    def get_object (self, pk):
        try:
            return Departamento.objects.get(pk=pk)
        except Departamento.DoesNotExist:
            return None
        
    def get(self, request, pk):
        obj= self.get_object(pk)
        if not obj:
            return Response({"ERROR": "No encontrado"}, status=404)
        return Response (DepartamentoSerializer(obj).data)
    
    def put(self,request,pk):
        if not request.user.es_admin:
            return Response ({"ERROR": "Sin permisos"}, status=403)
        obj = self.get_object(pk)
        if not obj:
            return Response({"ERROR": "No encontrado"}, status=404)
        serializer = DepartamentoSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    

class EmpleadoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        incluir_inactivos = request.query_params.get('incluir_inactivos') == 'true'
        if incluir_inactivos:
            empleados = Empleado.objects.all().select_related('departamento')
        else:
            empleados = Empleado.objects.filter(activo=True).select_related('departamento')
        tipo= request.query_params.get("tipo")
        depto  = request.query_params.get("departamento")
        if tipo:
            empleados= empleados.filter(tipo=tipo)
        if depto:
            empleados= empleados.filter(departamento_id=depto)
        serializer= EmpleadoSerializer(empleados, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        if not request.user.es_admin:
            return Response({"ERROR": "Sin permisos."}, status=403)
        serializer= EmpleadoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    

class EmpleadoDetailView(APIView):
    permission_classes= [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Empleado.objects.get(pk=pk)
        except Empleado.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"ERROR": "No encontrado."}, status=404)
        return Response(EmpleadoSerializer(obj).data)

    def put(self, request, pk):
        if not request.user.es_admin:
            return Response({"ERROR":"Sin permisos."}, status=403)
        obj = self.get_object(pk)
        if not obj:
            return Response({"ERROR": "No encontrado."}, status=404)
        serializer = EmpleadoSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if not request.user.es_admin:
            return Response({"ERROR": "Sin permisos"}, status=403)
        obj = self.get_object(pk)
        if not obj:
            return Response({"ERROR": "No encontrado"}, status=404)
        obj.activo = False
        obj.save()
        return Response({"mensaje": "Empleado desactivado correctamente"})
    

class HorarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request):
        empleado_id = request.query_params.get("empleado")
        horarios= Horario.objects.filter(activo=True)
        if empleado_id:
            horarios =horarios.filter(empleado_id=empleado_id)
        serializer = HorarioSerializer(horarios, many=True)
        return Response(serializer.data)
        
    def post(self,request):
        if not request.user.es_admin:
            return Response({"error": "Sin permisos"}, status=403)
        serializer = HorarioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    

class HorarioEmpleadoView(APIView):
    permission_classes=[IsAuthenticated]

    def get (self, request, empleado_id):
        try:
            empleado = Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return Response ({"error": "empleado no encontrado"}, status=404)
        
        horarios = Horario.objects.filter (empleado=empleado, activo=True)
        serializer= HorarioSerializer(horarios, many=True)
        departamento_nombre = empleado.departamento.nombre if empleado.departamento else None
        if isinstance(departamento_nombre, str) and departamento_nombre.strip().lower() == 'personal de limpieza':
            departamento_nombre = 'No aplica'

        return Response ({
            "empleado":{
                "id": empleado.id,
                "nombre": empleado.nombre_completo,
                "cedula": empleado.cedula,
                "tipo": empleado.tipo,
                "tipo_display": empleado.get_tipo_display(),
                "departamento": departamento_nombre,
            },
            "horarios": serializer.data
        })
    
    def post (self,request, empleado_id):
        if not request.user.es_admin:
            return Response ({"error": "Sin permisos"}, status=403)
        try:
            empleado= Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return Response ({"error": "Empleado no encontrado"}, status=404)
        
        data = request.data.copy()
        data ["empleado"]=empleado_id

        #si ya existe ese dia,actualiza
        existente= Horario.objects.filter(empleado=empleado, dia=data.get ("dia")).first()
        if existente:
            serializer = HorarioSerializer(existente, data=data, partial=True)
        else:
            serializer =HorarioSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response (serializer.data, status=201)
        return Response (serializer.errors, status=400)
    
    def delete (self, request, empleado_id):
        if not request.user.es_admin:
            return Response ({"error": "sin permisos"}, status=403)
        horario_id =request.data.get("horario_id")
        try:
            horario = Horario.objects.get(id=horario_id, empleado_id=empleado_id)
            horario.delete()
            return Response ({"ok": True, "msg": "Horario Eliminado"})
        except Horario.DoesNotExist:
            return Response ({"error": "Horario no encontrado"}, status=404)
        
class PerfilEmpleadoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, empleado_id):
        from django.utils import timezone
        import datetime

        try:
            empleado = Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=404)

        # Huellas registradas
        from apps.biometrico.models import HuellaDigital
        huellas = HuellaDigital.objects.filter(empleado=empleado, activa=True).values(
            'numero_dedo', 'calidad', 'fecha_registro'
        )
        DEDOS = {
            1:'Pulgar derecho', 2:'Índice derecho', 3:'Medio derecho',
            4:'Anular derecho', 5:'Meñique derecho', 6:'Pulgar izquierdo',
            7:'Índice izquierdo', 8:'Medio izquierdo', 9:'Anular izquierdo',
            10:'Meñique izquierdo'
        }
        huellas_data = [{
            'numero_dedo': h['numero_dedo'],
            'nombre_dedo': DEDOS.get(h['numero_dedo'], f'Dedo {h["numero_dedo"]}'),
            'calidad':h['calidad'],
            'fecha': timezone.localtime(h['fecha_registro']).strftime('%d/%m/%Y'),
        } for h in huellas]

        # Horarios
        horarios = Horario.objects.filter(empleado=empleado, activo=True).values(
            'dia','hora_entrada','hora_salida','tolerancia_min'
        )
        DIAS_ORDEN = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
        DIAS_LABEL = {'lunes':'Lunes','martes':'Martes','miercoles':'Miércoles','jueves':'Jueves','viernes':'Viernes','sabado':'Sábado',
                      'domingo':'Domingo'  
        }

        horarios_data = sorted([{
            'dia':h['dia'],
            'dia_label':DIAS_LABEL.get(h['dia'], h['dia']),
            'hora_entrada': str(h['hora_entrada'])[:5],
            'hora_salida':  str(h['hora_salida'])[:5],
            'tolerancia':h['tolerancia_min'],
        } for h in horarios], key=lambda x: DIAS_ORDEN.index(x['dia']) if x['dia'] in DIAS_ORDEN else 99)

        # Estadísticas de asistencia del mes actual
        tz= timezone.get_current_timezone()
        hoy = timezone.localtime(timezone.now()).date()
        primer_dia_mes = hoy.replace(day=1)
        inicio_mes= timezone.make_aware(datetime.datetime.combine(primer_dia_mes, datetime.time.min), tz)
        fin_mes = timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max), tz)

        from apps.asistencia.models import RegistroAsistencia, AusenciaAutomatica
        dias_transcurridos = (hoy - primer_dia_mes).days + 1

        presentes = RegistroAsistencia.objects.filter(
            empleado=empleado,
            timestamp__range=(inicio_mes, fin_mes),
            tipo='entrada', estado='verificado'
        ).values('timestamp__date').distinct().count()

        ausentes = AusenciaAutomatica.objects.filter(
            empleado=empleado,
            fecha__gte=primer_dia_mes,
            fecha__lte=hoy
        ).count()

        retrasos = RegistroAsistencia.objects.filter(
            empleado=empleado,
            timestamp__range=(inicio_mes, fin_mes),
            tipo='entrada', es_retardo=True
        ).count()

        indice = round((presentes / dias_transcurridos * 100), 1) if dias_transcurridos > 0 else 0

        # Últimos 5 registros
        ultimos = RegistroAsistencia.objects.filter(
            empleado=empleado
        ).order_by('-timestamp')[:5]

        departamento_nombre = empleado.departamento.nombre if empleado.departamento else None
        if isinstance(departamento_nombre, str) and departamento_nombre.strip().lower() == 'personal de limpieza':
            departamento_nombre = 'No aplica'

        return Response({
            'id': empleado.id,
            'cedula': empleado.cedula,
            'nombres': empleado.nombres,
            'apellidos': empleado.apellidos,
            'nombre_completo':empleado.nombre_completo,
            'tipo': empleado.tipo,
            'tipo_display': empleado.get_tipo_display(),
            'cargo': empleado.cargo,
            'departamento': departamento_nombre,
            'email': empleado.email,
            'telefono': empleado.telefono,
            'fecha_ingreso': empleado.fecha_ingreso.strftime('%d/%m/%Y'),
            'activo': empleado.activo,
            'foto': request.build_absolute_uri(empleado.foto.url) if empleado.foto else None,
            'huellas': huellas_data,
            'horarios': horarios_data,
            'estadisticas': {
                'presentes': presentes,
                'ausentes': ausentes,
                'retrasos': retrasos,
                'indice': indice,
                'dias': dias_transcurridos,
            },
            'ultimos_registros': [{
                'tipo': r.tipo,
                'hora':timezone.localtime(r.timestamp).strftime('%I:%M %p'),
                'fecha':timezone.localtime(r.timestamp).strftime('%d/%m/%Y'),
                'es_retardo':r.es_retardo,
            } for r in ultimos],
        })