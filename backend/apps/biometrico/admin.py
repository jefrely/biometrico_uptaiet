from django.contrib import admin
from .models import DispositivoBiometrico, HuellaDigital

@admin.register (DispositivoBiometrico)
class DispositivoAdmin (admin.ModelAdmin):
    list_display= ["nombre", "modelo", "numero_serie", "ubicacion", "activo"]
    list_filter= ["activo", "modelo"]


@admin.register(HuellaDigital)
class HuellaAdmin (admin.ModelAdmin):
    list_display= ["empleado", "numero_dedo", "calidad", "activa", "fecha_registro"]
    list_filter= ["activa", "numero_dedo"]
    search_fields= ["empleado__cedula", "empleado__nombres"]