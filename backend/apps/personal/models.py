from django.db import models

class Departamento (models.Model):
    """
    Representa cada departamento de UPTAIET
    """
    nombre = models.CharField (max_length=100)
    codigo = models.CharField (max_length=20, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField (default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table ="departamentos"
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["nombre"]

    def __str__(self):
            return f"{self.codigo} - {self.nombre}"
        
class Empleado(models.Model):
    """
    Representa a cada trabajador de UPTAIET(docente,obrero,administrativo)
    """
    TIPO_CHOICES = [
        ("docente",   "Docente"),
        ("obrero",   "Obrero"),
        ("administrativo",   "Administrativo"),
    ]

    cedula = models.CharField(max_length=15, unique=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    departamento = models.ForeignKey(
         Departamento,
         on_delete=models.PROTECT , 
         related_name= "empleados"
    )

    cargo = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    foto = models.ImageField(upload_to= "fotos_empleados/", null=True, blank=True)
    activo = models.BooleanField(default=True)
    fecha_ingreso = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "empleados"
        verbose_name = "Empleado"
        verbose_name_plural = "Empleados"
        ordering = ["apellidos", "nombres"]
        indexes = [
            models.Index(fields=["cedula"]),
            models.Index(fields=["tipo"]),
            models.Index(fields=["activo"]),
         ]

    def __str__(self):
        return f"{self.cedula} - {self.apellidos}, {self.nombres}"
    
    @property
    def nombre_completo (self):
         return f"{self.nombres} {self.apellidos}"
    

class Horario(models.Model):
     """
     Define el horario de trabajo de cada empleado
     Implementado para calcular retrasos, horas extras e inasistencias
     """
     DIAS_CHOICES =[
          ("lunes",   "Lunes"),
          ("martes",   "Martes"),
          ("miercoles",   "Miercoles"),
          ("jueves",   "Jueves"),
          ("viernes",   "Viernes"),
          ("sabado",   "Sabado"),
          ("domingo",   "Domingo"),
     ]

     empleado = models.ForeignKey(
          Empleado,
          on_delete=models.CASCADE,
          related_name= "horarios"
     )

     dia =models.CharField(max_length=10, choices=DIAS_CHOICES)
     hora_entrada =models.TimeField()
     hora_salida =models.TimeField()
     tolerancia_min = models.IntegerField(default=10)
     activo =models.BooleanField(default=True)

     class Meta:
          db_table = "horarios"
          verbose_name = "Horario"
          verbose_name_plural = "Horarios"
          unique_together = ["empleado", "dia"]

     def __str__(self):
      return f"{self.empleado.nombre_completo} - {self.get_dia_display()} {self.hora_entrada} - {self.hora_salida}"