# guarda como check_dbinit.py en backend\
import ctypes

dll = ctypes.WinDLL("libzkfp.dll")

# Probar diferentes firmas de ZKFPM_DBInit
print("Probando ZKFPM_DBInit...")

# Intento 1 — sin argumentos, retorna void_p
dll.ZKFPM_DBInit.restype = ctypes.c_void_p
h1 = dll.ZKFPM_DBInit()
print(f"  void_p: {h1}")

# Intento 2 — retorna c_int
dll.ZKFPM_DBInit.restype = ctypes.c_int  
h2 = dll.ZKFPM_DBInit()
print(f"  c_int: {h2}")

# Intento 3 — con argumentos (algunos SDKs piden capacidad)
try:
    dll.ZKFPM_DBInit.restype  = ctypes.c_void_p
    dll.ZKFPM_DBInit.argtypes = [ctypes.c_int]
    h3 = dll.ZKFPM_DBInit(50)
    print(f"  con capacidad 50: {h3}")
except Exception as e:
    print(f"  con capacidad: ERROR {e}")