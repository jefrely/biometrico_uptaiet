from django.db import models

class RegistroAsistencia (models.Model):
    """
    se crea un registro cada que un empleado coloque su huella, guardando si es entrada o salida, hora y con que score de verificación
    """

    TIPO_CHOICES =[
        ('entrada', 'Entrada'),
        ('salida',  'Salida'),
    ]

    ESTADO_CHOICES =[
        ("verificado",   "Verificado"),
        ("fallido",   "Fallido"),
        ("manual",   "Manual"),
    ]

    empleado = models.ForeignKey(
        "personal.Empleado",
        on_delete= models.PROTECT,
        related_name= "registros"
    )
    
    dispositivo = models.ForeignKey(
         "biometrico.DispositivoBiometrico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )


    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default="vereficado")
    timestamp =models.DateTimeField(auto_now_add=True)
    score_verificacion = models.IntegerField (default=0)
    es_retardo = models.BooleanField (default=False)
    minutos_retardo =models.IntegerField(default=0)
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)
    observacion = models.TextField(blank=True)

    class Meta:
        db_table = "registros_asistencia"
        verbose_name = "Registro de asistencia"
        verbose_name_plural = "Registros de asistencia"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["empleado", "timestamp"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["tipo"]),
        ]

    def __str__(self):
         return f'{self.empleado.nombre_completo} - {self.tipo} {self.timestamp.strftime("%d/%m/%Y %H:%M")}'
    
class AusenciaAutomatica(models.Model):
    """
    se crea cada noche para los empleados que no se registraron durante el dia 
    """
    empleado = models.ForeignKey(
        "personal.Empleado",
        on_delete= models.PROTECT,
        related_name= "ausencias"
    )

    fecha = models.DateField()
    justificada = models.BooleanField(default=False)
    observacion = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ausencias_automaticas"
        verbose_name = "Ausencia automática"
        verbose_name_plural = "Ausencias automáticas"
        unique_together = ["empleado", "fecha"]

    def __str__(self):
        return f'{self.empleado.nombre_completo} - Ausente {self.fecha}'


class LogAuditoria(models.Model):
    """
    Registra todas las acciones importantes del sistema.quien, que y desde que IP hizo
    """

    usuario =models.ForeignKey(
        "usuarios.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        related_name= "acciones"
    )

    accion = models.CharField(max_length=200)
    tabla_afectada =models.CharField(max_length=100)
    registro_id =models.IntegerField(null=True, blank=True)
    datos_antes =models.JSONField(null=True, blank=True)
    datos_despues =models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    timestamp =models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "log_auditoria"
        verbose_name = "Log de auditoría"
        verbose_name_plural = "Logs de aditoría"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.usuario} - {self.accion} ({self.timestamp.strftime("%d/%m/%Y  %H:%M")})"