from django.contrib.auth.models import AbstractUser #usuario base de django
from django.db import models #models es el modulo para crear tablas en base de datos

class Usuario(AbstractUser): #usuario hereda de abstractuser
    ROL_CHOICES =[ #crear menu desplegable automatico
        ("admin", "Administrador"), #guarda en base de datos // lo que muestra en pantalla
        ("supervisor", "Supervisor"),
        ("operador", "Operador"),
    ]
#campos nuevos que le agrega al usuario// c/u columna en tabla de db
    rol =models.CharField (max_length=20, choices=ROL_CHOICES, default="operador") #charfield texto corto
    telefono =models.CharField (max_length=20, blank=True)
    activo_sistema =models.BooleanField(default=True)#v/f
    ultimo_acceso_ip =models.GenericIPAddressField (null=True, blank=True)#generic.. guarda IP. blank=True: campo puede dejar vacio


    def __str__(self):
            return f"{self.username} ({self.get_rol_display()})"
        
    @property
    def es_admin(self): #metodo rapido para verificar el rol
            return self.rol == "admin"
        
    @property
    def es_supervisor(self):
            return self.rol in ["admin ", "supervisor "]
        
    class Meta: #clase especial de django, le da instrucciones a Django de como comportarse
        db_table = "usuarios" #dice a django como nombrar la tabla
        verbose_name = "Usuario" #nombre que django muestra en el panel 
        verbose_name_plural = "Usuarios"



from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Agregar datos del usuario al token
        token['rol']= user.rol
        token['username']= user.username
        token['email'] = user.email
        return token
    
class PermisoModulo(models.Model):
    MODULOS = [
        ('dashboard','Dashboard'),
        ('personal','Gestión de Personal'),
        ('biometrico','Registro Biométrico'),
        ('historial','Asistencia/Historial'),
        ('reportes','Reportes'),
        ('horarios','Horarios'),
        ('incidencias','Incidencias'),
        ('dispositivos','Dispositivos'),
        ('configuracion','Configuración'),
    ]

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='permisos_modulos'
    )
    modulo = models.CharField(max_length=30, choices=MODULOS)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'permisos_modulos'
        unique_together = ['usuario', 'modulo']

    def __str__(self):
        return f'{self.usuario.username} — {self.modulo}'