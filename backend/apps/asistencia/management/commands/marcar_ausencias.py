from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.personal.models import Empleado
from apps.asistencia.models import (RegistroAsistencia, AusenciaAutomatica, PermisoEmpleado, DiaFeriado)
import datetime


class Command(BaseCommand):
    help = "Marca ausentes a empleados sin entrada, respetando permisos y feriados"

    def handle(self, *args, **options):
        hoy= timezone.localtime(timezone.now()).date()
        inicio= timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.min))
        fin= timezone.make_aware(datetime.datetime.combine(hoy, datetime.time.max))

        self.stdout.write(f"\n=== Procesando ausencias para {hoy} ===")

        # 1 — Verificar si es feriado ANTES del loop
        if DiaFeriado.es_feriado(hoy):
            nombre_feriado = DiaFeriado.objects.get(fecha=hoy).nombre
            self.stdout.write(
                self.style.WARNING(f"Hoy es día feriado: {nombre_feriado}. No se crean ausencias.")
            )
            return

        # 2 — Día de la semana en español
        dias_map = {
            "Monday": "lunes",
            "Tuesday": "martes",
            "Wednesday":"miercoles",
            "Thursday": "jueves",
            "Friday": "viernes",
            "Saturday": "sabado",
            "Sunday": "domingo"
        }
        dia_hoy = dias_map[hoy.strftime("%A")]
        self.stdout.write(f"Día: {dia_hoy}")

        # 3 — Empleados que tienen horario hoy
        empleados_con_horario = Empleado.objects.filter(
            activo=True,
            horarios__dia=dia_hoy,
            horarios__activo=True
        ).distinct()

        self.stdout.write(f"Empleados con horario hoy: {empleados_con_horario.count()}")

        # 4 — Empleados que SÍ marcaron entrada hoy
        con_entrada =set(
            RegistroAsistencia.objects.filter(
                timestamp__range=(inicio, fin),
                tipo="entrada",
                estado="verificado"
            ).values_list("empleado_id", flat=True)
        )

        # 5 — Empleados con permiso aprobado que cubre hoy
        con_permiso= set(
            PermisoEmpleado.objects.filter(
                estado="APROBADO",
                activo=True,
                fecha_inicio__lte=hoy,
                fecha_fin__gte=hoy
            ).values_list("empleado_id", flat=True)
        )

        # 6 — Procesar cada empleado
        ausencias_creadas= 0
        omitidos_entrada= 0
        omitidos_permiso= 0

        for empleado in empleados_con_horario:

            # ¿Marcó entrada?
            if empleado.id in con_entrada:
                omitidos_entrada += 1
                continue

            # ¿Tiene permiso aprobado?
            if empleado.id in con_permiso:
                omitidos_permiso += 1
                self.stdout.write(f" Con permiso: {empleado.nombre_completo}")
                continue

            # Crear ausencia
            _, creado = AusenciaAutomatica.objects.get_or_create(
                empleado=empleado,
                fecha=hoy,
                defaults={"justificada": False}
            )
            if creado:
                ausencias_creadas += 1
                self.stdout.write(f"Ausente: {empleado.nombre_completo}")

        self.stdout.write(self.style.SUCCESS(
            f'\nResumen:\n'
            f'Con entrada:{omitidos_entrada}\n'
            f'Con permiso:{omitidos_permiso}\n'
            f'Ausencias:{ausencias_creadas}\n'
            f'Total procesados:{empleados_con_horario.count()}'
        ))