from rest_framework import serializers
from .models import RegistroAsistencia, AusenciaAutomatica

class RegistroAsistenciaSerializer (serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(
        source = "empleado.nombre_completo",
        read_only = True
    )

    empleado_cedula= serializers.CharField(
        source = "empleado.cedula",
        read_only= True
    )

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    hora= serializers.SerializerMethodField()
    fecha= serializers.SerializerMethodField()

    class Meta:
        model = RegistroAsistencia
        fields = ["id","empleado","empleado_nombre", "empleado_cedula", "tipo", "tipo_display", "estado", "estado_display", "timestamp", "hora", "fecha",
                  "es_retardo", "minutos_retardo", "horas_trabajadas", "observacion"]
        
    def get_hora (self, obj):
        return obj.timestamp.strftime("%I:%M:%p")
    
    def get_fecha (self, obj):
        return obj.timestamp.strftime("%d/%m/%Y")
    

class AusenciaSerializer (serializers.ModelSerializer):
    empleado_nombre= serializers.CharField(
        source= "empleado.nombre_completo",
        read_only= True
    )

    class Meta:
        model =AusenciaAutomatica
        fields= ["id","empleado","empleado_nombre","fecha","justificada","observacion"]