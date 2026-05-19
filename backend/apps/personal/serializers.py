from rest_framework import serializers
from .models import Departamento, Empleado, Horario


class DepartamentoSerializer (serializers.ModelSerializer):
    total_empleados= serializers.SerializerMethodField ()

    class Meta:
        model = Departamento
        fields = ["id", "nombre", "codigo", "descripcion", "activo", "total_empleados"]

    def get_total_empleados (self, obj):
        return obj.empleados.filter(activo=True).count()
    
class EmpleadoSerializer (serializers.ModelSerializer):
    departamento_nombre = serializers.CharField(
        source= "departamento.nombre",
        read_only=True
    )
    nombre_completo = serializers.CharField(read_only=True)
    tiene_huella = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields= ["id", "cedula","nombres", "apellidos", "nombre_completo", "tipo", "departamento", "departamento_nombre", "cargo", "email", "telefono",
        "foto", "activo", "fecha_ingreso", "tiene_huella"]

    def get_tiene_huella (self, obj):
        return obj.huellas.filter (activa=True).exists()
    
    def validate_cedula (self, value):
        value = value.upper().strip()
        if not value.startswith (("V-", "E-", "J-")):
            raise serializers.ValidationError(
                "La cedula de identidad debe comenzar con V-, E- o J-"
            )
        return value
    
    def validate_email(self, value):
        return value.lower().strip()
    
class HorarioSerializer(serializers.ModelSerializer):
    dia_display= serializers.CharField (source= "get_dia_display", read_only=True)

    class Meta:
        model =Horario
        fields = ["id","empleado","dia","dia_display","hora_entrada","hora_salida","tolerancia_min","activo"]

    def validate(self, data):
        if data["hora_entrada"]>= data["hora_salida"]:
            raise serializers.ValidationError(
                "La hora de entrada debe ser menor que la hora de salida."
            )
        return data