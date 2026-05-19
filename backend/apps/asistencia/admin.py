from django.contrib import admin
from .models import RegistroAsistencia, AusenciaAutomatica, LogAuditoria


@admin.register (RegistroAsistencia)
class RegistroAdmin (admin.ModelAdmin):
    list_display= ["empleado", "tipo", "estado", "timestamp", "es_retardo", "minutos_retardo"]
    list_filter= ["tipo", "estado", "es_retardo"]
    search_fields= ["empleado__cedula", "empleado__nombres"]


@admin.register (AusenciaAutomatica)
class AusenciaAdmin (admin.ModelAdmin):
    list_display= ["empleado", "fecha", "justificada"]
    list_filter= ["justificada", "fecha"]
    search_fields= ["empleado__cedula", "empleado__nombres"]


@admin.register (LogAuditoria)
class LogAdmin(admin.ModelAdmin):
    list_display= ["usuario", "accion", "tabla_afectada", "ip", "timestamp"]
    list_filter= ["tabla_afectada"]
    readonly_fields= ["usuario", "accion", "tabla_afectada", "registro_id", "datos_antes",
    "datos_despues", "ip", "timestamp"]