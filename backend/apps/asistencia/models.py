from django.db import models

class RegistroAsistencia (models.Model):
    """
    se crea un registro cada que un empleado coloque su huella, guardando si es entrada o salida, hora y con que score de verificación
    """

    TIPO_CHOICES =[
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('salida_almuerzo', 'Salida Almuerzo'),
        ('entrada_almuerzo','Entrada Almuerzo'),
    ]

    ESTADO_CHOICES =[
        ("verificado", "Verificado"),
        ("fallido", "Fallido"),
        ("manual", "Manual"),
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


    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default="vereficado")
    timestamp =models.DateTimeField(auto_now_add=True)
    score_verificacion = models.IntegerField (default=0)
    es_retardo = models.BooleanField (default=False)
    minutos_retardo =models.IntegerField(default=0)
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)
    observacion = models.TextField(blank=True)
    es_almuerzo = models.BooleanField(default=False)
    minutos_antes = models.IntegerField(default=0)
    horas_extras= models.DecimalField(max_digits=5, decimal_places=2, default=0)
    horas_faltantes= models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sin_horario = models.BooleanField(default=False)

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
    
class PermisoEmpleado(models.Model):

    class TipoPermiso(models.TextChoices):
        PERMISO="PERMISO", "Permiso"
        REPOSO="REPOSO", "Reposo Médico"
        VACACIONES= "VACACIONES", "Vacaciones"
        COMISION="COMISION", "Comisión"
        MATERNIDAD= "MATERNIDAD", "Maternidad/Paternidad"
        DUELO= "DUELO", "Duelo"
        CAPACITACION= "CAPACITACION", "Capacitación"

    class EstadoPermiso (models.TextChoices):
        PENDIENTE="PENDIENTE", "Pendiente"
        APROBADO="APROBADO", "Aprobado"
        RECHAZADO="RECHAZADO", "Rechazado"

    empleado= models.ForeignKey(
        "personal.Empleado",
        on_delete=models.PROTECT,
        related_name="permisos"
    )

    tipo= models.CharField(
        max_length=20,
        choices=TipoPermiso.choices,
        default=TipoPermiso.PERMISO
    )

    fecha_inicio= models.DateField()
    fecha_fin=models.DateField()
    motivo=models.TextField()
    documento= models.FileField(
        upload_to="permisos_documentos/",
        null=True,
        blank=True
    )

    estado=models.CharField(
        max_length=10,
        choices=EstadoPermiso.choices,
        default=EstadoPermiso.PENDIENTE
    )

    aprobado_por=models.ForeignKey(
        "usuarios.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="permisos_aprobados"
    )

    observacion= models.TextField(blank=True)
    activo=models.BooleanField(default=True)
    created_at= models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)


    class Meta:
        db_table= "permisos_empleados"
        verbose_name= "Permiso de empleado"
        verbose_name_plural= "Permisos de empleados"
        ordering= ["-fecha_inicio"]


    def __str__(self):
        return f"{self.empleado.nombre_completo} - {self.get_tipo_display()} ({self.fecha_inicio} al {self.fecha_fin})"
    
    def cubre_fecha(self, fecha):
        """retorna true si este permiso cubre la fecha dada y está aprobado"""
        return(
            self.estado==self.EstadoPermiso.APROBADO and
            self.activo and
            self.fecha_inicio <=fecha <=self.fecha_fin
        )
    
class DiaFeriado(models.Model):
    nombre= models.CharField(max_length=200)
    fecha= models.DateField(unique=True)
    obligatorio= models.BooleanField(default=True)
    descripcion= models.TextField(blank=True)
    created_at= models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table ="dias_feriados"
        verbose_name="Día feriado"
        verbose_name_plural = "Días feriados"
        ordering = ["fecha"]

    def __str__(self):
        return f"{self.nombre} - {self.fecha}"
    
    @classmethod
    def es_feriado(cls, fecha):
        """retorna true si la fecha es un dia feriado"""
        return cls.objects.filter(fecha=fecha, obligatorio=True).exists()