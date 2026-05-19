from django.contrib import admin
from .models import Departamento, Empleado, Horario

@admin.register(Departamento)
class DepartamentoAdmin (admin.ModelAdmin):
    list_display= ["codigo", "nombre", "activo"]
    list_filter= ["activo"]
    search_fields= ["nombre", "codigo"]


@admin.register (Empleado)
class EmpleadoAdmin (admin.ModelAdmin):
    list_display= ["cedula", "apellidos", "nombres", "tipo", "activo"]
    list_filter= ["tipo", "activo"]
    search_fields= ["cedula", "nombres", "apellidos"]

@admin.register (Horario)
class HorarioAdmin (admin.ModelAdmin):
    list_display= ["empleado", "dia", "hora_entrada", "hora_salida", "tolerancia_min"]
    list_filter= ["dia", "activo"]