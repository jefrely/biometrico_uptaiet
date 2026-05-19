from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


@admin.register (Usuario)
class UsuarioAdmin (UserAdmin):
    list_display = ["username", "email", "rol", "activo_sistema", "is_staff"]
    list_filter = ["rol", "activo_sistema", "is_staff"]
    fieldsets = UserAdmin.fieldsets + (
        ("Datos UPTAIET", {
            "fields": ("rol", "telefono", "activo_sistema", "ultimo_acceso_ip")
        }),
    )