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
    


class ConfiguracionSistema(models.Model):
    """
    Configuración global del sistema. Solo existe un registro.
    """
    # Reglas de asistencia
    hora_almuerzo_inicio = models.TimeField(default='12:00')
    hora_almuerzo_fin = models.TimeField(default='13:00')
    tolerancia_almuerzo_min = models.IntegerField(default=10)
    horas_jornada_completa = models.DecimalField(max_digits=4, decimal_places=1, default=8.0)

    # Notificaciones
    notificar_retrasos = models.BooleanField(default=True)
    notificar_ausencias = models.BooleanField(default=True)

    # Información institucional
    nombre_institucion = models.CharField(max_length=200, default='UPTAIET')
    sede = models.CharField(max_length=100, default='Sede Rubio')
    logo_url = models.CharField(max_length=500, blank=True)

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
                                  'Usuario', on_delete=models.SET_NULL,
                                  null=True, blank=True,
                                  related_name='configuraciones'
                              )

    class Meta:
        db_table = 'configuracion_sistema'
        verbose_name = 'Configuración del sistema'

    def __str__(self):
        return f'Configuración — {self.nombre_institucion}'

    @classmethod
    def obtener(cls):
        """Siempre retorna la única configuración, creándola si no existe."""
        config, _ = cls.objects.get_or_create(id=1)
        return config
    


class PreguntaSeguridad(models.Model):
    PREGUNTAS = [
        ('pais','¿País que siempre a querido conocer?'),
        ('ciudad','¿País o ciudad de nacimiento?'),
        ('apellido','¿Segundo apellido de madre o padre?'),
        ('colegio','Nombre de su colegio primario?'),
        ('libro','Nombre de su libro favorito?'),
        ('pelicula', 'Nombre de su película favorita?'),
        ('deporte','¿Cuál es tu deporte favorito?'),
    ]

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='pregunta_seguridad'
                       )
    pregunta_1 = models.CharField(max_length=50, choices=PREGUNTAS)
    respuesta_1_hash = models.CharField(max_length=128)
    pregunta_2 = models.CharField(max_length=50, choices=PREGUNTAS)
    respuesta_2_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'preguntas_seguridad'

    def __str__(self):
        return f'Preguntas de {self.usuario.username}'

    def verificar_respuesta_1(self, respuesta):
        from django.contrib.auth.hashers import check_password
        return check_password(respuesta.lower().strip(), self.respuesta_1_hash)

    def verificar_respuesta_2(self, respuesta):
        from django.contrib.auth.hashers import check_password
        return check_password(respuesta.lower().strip(), self.respuesta_2_hash)


class TokenRecuperacion(models.Model):
    """
    Token temporal para recuperar contraseña.
    Expira en 15 minutos y solo se puede usar una vez.
    """
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    usado = models.BooleanField(default=False)
    expira_en = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tokens_recuperacion'

    def __str__(self):
        return f'Token de {self.usuario.username}'

    @property
    def es_valido(self):
        from django.utils import timezone
        return not self.usado and timezone.now() < self.expira_en
    


class PinSeguridad(models.Model):
    """
    Segundo factor de autenticación.
    El usuario configura un PIN de 6 dígitos que debe ingresar
    después de la contraseña para acceder al sistema.
    """
    usuario    = models.OneToOneField( Usuario, on_delete=models.CASCADE, related_name='pin_seguridad'
                 )
    pin_hash   = models.CharField(max_length=128)
    activo     = models.BooleanField(default=True)
    intentos   = models.IntegerField(default=0)
    bloqueado  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pins_seguridad'

    def verificar(self, pin):
        from django.contrib.auth.hashers import check_password
        return check_password(str(pin), self.pin_hash)

    def registrar_intento_fallido(self):
        self.intentos += 1
        if self.intentos >= 3:
            self.bloqueado = True
        self.save()

    def desbloquear(self):
        self.intentos  = 0
        self.bloqueado = False
        self.save()