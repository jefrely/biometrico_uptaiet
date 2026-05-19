from django.db import models

class DispositivoBiometrico(models.Model):
    """
    Representa cada escáner ZK9500 conectado al sistema 
    """
    nombre = models.CharField(max_length=100)
    modelo =models.CharField(max_length=50, default="ZK9500")
    numero_serie = models.CharField(max_length=100, unique=True)
    ubicacion = models.CharField(max_length=100, blank=True)
    activo = models.BooleanField(default=True)
    ultima_sincronizacion = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField (auto_now_add=True)

    class Meta:
        db_table = "dispositivos_biometricos"
        verbose_name = "Dispositivo Biométrico"
        verbose_name_plural = "Dispositivos Biométricos"

    def __str__(self):
        return f"{self.modelo} - {self.numero_serie} ({self.ubicacion})"
    
class HuellaDigital (models.Model):
    """
    Guarda el template matematico de la huella de cada empleado, se guarda encriptado con AES-256, 
    Sin la clave de encriptacion del .env los datos son ilegibles 
    """

    DEDO_CHOICES = [
        (1,  'Pulgar derecho'),
        (2,  'Índice derecho'),
        (3,  'Medio derecho'),
        (4,  'Anular derecho'),
        (5,  'Meñique derecho'),
        (6,  'Pulgar izquierdo'),
        (7,  'Índice izquierdo'),
        (8,  'Medio izquierdo'),
        (9,  'Anular izquierdo'),
        (10, 'Meñique izquierdo'),
    ]

    empleado = models.ForeignKey(
        "personal.Empleado",
        on_delete=models.CASCADE,
        related_name= "huellas"
    )

    numero_dedo =models.IntegerField(choices=DEDO_CHOICES)
    template_encriptado =models.BinaryField()
    calidad =models.IntegerField(default=0)
    activa =models.BooleanField(default=True)
    intentos_fallidos =models.IntegerField(default=0)
    fecha_registro =models.DateTimeField(auto_now_add=True)
    registrado_por =models.ForeignKey (
        "usuarios.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        related_name="huellas_registradas"
    )

    class Meta:
        db_table = "huellas_digitales"
        verbose_name = "Huella digital"
        verbose_name_plural = "Huellas digitales"
        unique_together = ["empleado", "numero_dedo"]

    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.get_numero_dedo_display ()}"