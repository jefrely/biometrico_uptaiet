import os, sys, ctypes
from decouple import config

os.environ['FINGERPRINT_ENCRYPTION_KEY'] = config('FINGERPRINT_ENCRYPTION_KEY')

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.biometrico.zkfinger_service import ZK9500Service
from apps.biometrico.models import HuellaDigital

service = ZK9500Service()
service.inicializar()

# Cargar el template más reciente de la BD
huella = HuellaDigital.objects.order_by('-fecha_registro').first()
t2 = service._fernet.decrypt(bytes(huella.template_encriptado))
print(f"Template en BD: {len(t2)} bytes, empleado_id={huella.empleado_id}")
print(f"db_handle: {service.db_handle}")

# Limpiar y cargar en BD interna
service.zkfp.ZKFPM_DBClear(service.db_handle)
arr2    = (ctypes.c_ubyte * len(t2))(*t2)
ret_add = service.zkfp.ZKFPM_DBAdd(
    service.db_handle,
    ctypes.c_uint(1),
    ctypes.cast(arr2, ctypes.POINTER(ctypes.c_ubyte)),
    ctypes.c_uint(len(t2))
)
print(f"DBAdd ret={ret_add}")

# Capturar y verificar
print("Coloca el dedo para verificar...")
captura = service.capturar_huella()
if not captura['ok']:
    print(f"Error: {captura['msg']}")
    service.cerrar()
    sys.exit(1)

t1 = captura['template']
print(f"Template capturado: {len(t1)} bytes")

arr1       = (ctypes.c_ubyte * len(t1))(*t1)
matched_id = ctypes.c_uint(0)
score      = ctypes.c_int(0)

ret = service.zkfp.ZKFPM_DBIdentify(
    service.db_handle,
    ctypes.cast(arr1, ctypes.POINTER(ctypes.c_ubyte)),
    ctypes.c_uint(len(t1)),
    ctypes.byref(matched_id),
    ctypes.byref(score)
)
print(f"DBIdentify ret={ret}, matched_id={matched_id.value}, score={score.value}")

# Probar ZKFPM_Identify directamente
print("\nProbando ZKFPM_Identify...")
service.zkfp.ZKFPM_Identify.argtypes = [
    ctypes.c_void_p,
    ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
    ctypes.POINTER(ctypes.c_uint),  ctypes.POINTER(ctypes.c_int)
]
service.zkfp.ZKFPM_Identify.restype = ctypes.c_int

matched_id2 = ctypes.c_uint(0)
score2      = ctypes.c_int(0)
ret2 = service.zkfp.ZKFPM_Identify(
    service.dev_handle,
    ctypes.cast(arr1, ctypes.POINTER(ctypes.c_ubyte)),
    ctypes.c_uint(len(t1)),
    ctypes.byref(matched_id2),
    ctypes.byref(score2)
)
print(f"ZKFPM_Identify ret={ret2}, matched_id={matched_id2.value}, score={score2.value}")

# Ver primeros bytes de ambos templates
print(f"\nBytes BD [0:4]:       {list(t2[:4])}")
print(f"Bytes capturado [0:4]: {list(t1[:4])}")

service.cerrar()