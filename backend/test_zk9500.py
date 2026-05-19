import os
import sys
from decouple import config

os.environ['FINGERPRINT_ENCRYPTION_KEY'] = config('FINGERPRINT_ENCRYPTION_KEY')

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.biometrico.zkfinger_service import ZK9500Service
from apps.biometrico.models import HuellaDigital
from apps.personal.models import Empleado

print("=" * 55)
print("  REGISTRO DE HUELLA EN BD - UPTAIET")
print("=" * 55)

service = ZK9500Service()

print("\n[1] Inicializando escaner...")
resultado = service.inicializar()
print(f"    {resultado['msg']}")
if not resultado['ok']:
    print("    No se pudo conectar.")
    sys.exit(1)

# Mostrar empleados disponibles
empleados = Empleado.objects.filter(activo=True)
print("\n[2] Empleados en el sistema:")
for e in empleados:
    print(f"    ID {e.id} — {e.nombre_completo} ({e.cedula})")

emp_id = input("\n    Ingrese el ID del empleado a registrar: ")
try:
    empleado = Empleado.objects.get(id=int(emp_id), activo=True)
except:
    print("    Empleado no encontrado.")
    service.cerrar()
    sys.exit(1)

print(f"\n    Registrando huella de: {empleado.nombre_completo}")
print("    Se capturara 3 veces el mismo dedo.")
input("    Presione Enter y coloque el dedo...")

registro = service.registrar_huella(empleado_id=empleado.id, numero_dedo=1)

if not registro['ok']:
    print(f"    Error: {registro['msg']}")
    service.cerrar()
    sys.exit(1)

print(f"\n    Calidad: {registro['calidad']}/100")

# Guardar en BD
HuellaDigital.objects.filter(empleado=empleado, numero_dedo=1).delete()
huella = HuellaDigital.objects.create(
    empleado            = empleado,
    numero_dedo         = 1,
    template_encriptado = registro['template_encriptado'],
    calidad             = registro['calidad'],
    activa              = True,
)
print(f"    ✅ Huella guardada en BD — ID: {huella.id}")

service.cerrar()
print("\n[3] Listo. Ahora puede usar el marcaje.")
print("=" * 55)