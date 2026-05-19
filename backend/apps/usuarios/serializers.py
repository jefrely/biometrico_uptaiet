from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Usuario


class UsuarioSerializer (serializers.ModelSerializer):
    class Meta:
        model= Usuario
        fields= ["id", "username", "email", "first_name", "last_name", "rol", "telefono", "activo_sistema"]
        read_only_fields= ["id"]


class CambiarPasswordSerializer (serializers.Serializer):
    password_actual= serializers.CharField(required=True)
    password_nuevo= serializers.CharField(required=True, validators=[validate_password])

    def validate_password_nuevo(self, value):
        if len(value) <8:
            raise serializers.ValidationError ("La contraseña debe tener al menos 8 caracteres")
        return value