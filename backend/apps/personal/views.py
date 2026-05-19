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
        empleados= Empleado.objects.filter(activo=True).select_related("departamento")
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
        return Response ({
            "empleado":{
                "id": empleado.id,
                "nombre": empleado.nombre_completo,
                "cedula": empleado.cedula,
                "tipo": empleado.tipo,
                "departamento": empleado.departamento.nombre,
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