import ctypes
import time

print("Cargando DLL...")
zkfp = ctypes.cdll.LoadLibrary("libzkfp.dll")

zkfp.ZKFPM_Init.argtypes = []
zkfp.ZKFPM_Terminate.argtypes = []
zkfp.ZKFPM_OpenDevice.argtypes = [ctypes.c_int]
zkfp.ZKFPM_OpenDevice.restype = ctypes.c_void_p
zkfp.ZKFPM_CloseDevice.argtypes = [ctypes.c_void_p]

zkfp.ZKFPM_Init()
handle = zkfp.ZKFPM_OpenDevice(0)
print(f"Handle: {handle}\n")

# ---- PRUEBA 1: AcquireFingerprintImage con img + template ----
print("PRUEBA 1 — AcquireFingerprintImage(handle, img_buf, img_size, tmpl_buf, tmpl_len)...")
try:
    zkfp.ZKFPM_AcquireFingerprintImage.argtypes = [
        ctypes.c_void_p,
        ctypes.c_char_p, ctypes.c_int,
        ctypes.c_char_p, ctypes.POINTER(ctypes.c_int),
    ]
    zkfp.ZKFPM_AcquireFingerprintImage.restype = ctypes.c_int

    img_buf  = ctypes.create_string_buffer(300 * 375)
    tmpl_buf = ctypes.create_string_buffer(2048)
    tmpl_len = ctypes.c_int(2048)

    print("  Coloque el dedo (15 segundos)...")
    inicio = time.time()
    ultimo = None
    while time.time() - inicio < 15:
        ret = zkfp.ZKFPM_AcquireFingerprintImage(
            handle,
            img_buf, ctypes.sizeof(img_buf),
            tmpl_buf, ctypes.byref(tmpl_len)
        )
        if ret != ultimo:
            print(f"  ret={ret} | tmpl_len={tmpl_len.value}")
            ultimo = ret
        if ret == 0:
            print(f"  EXITO — template {tmpl_len.value} bytes")
            break
        time.sleep(0.15)
    else:
        print(f"  Timeout — ultimo ret={ret}")
except Exception as e:
    print(f"  Excepcion: {e}")

print()

# ---- PRUEBA 2: AcquireFingerprintImage solo imagen (sin template) ----
print("PRUEBA 2 — AcquireFingerprintImage(handle, img_buf, img_size)...")
try:
    zkfp.ZKFPM_AcquireFingerprintImage.argtypes = [
        ctypes.c_void_p,
        ctypes.c_char_p,
        ctypes.c_int,
    ]
    zkfp.ZKFPM_AcquireFingerprintImage.restype = ctypes.c_int

    img_buf = ctypes.create_string_buffer(300 * 375)

    print("  Coloque el dedo (15 segundos)...")
    inicio = time.time()
    ultimo = None
    while time.time() - inicio < 15:
        ret = zkfp.ZKFPM_AcquireFingerprintImage(
            handle,
            img_buf, ctypes.sizeof(img_buf)
        )
        if ret != ultimo:
            print(f"  ret={ret}")
            ultimo = ret
        if ret == 0:
            print(f"  EXITO")
            break
        time.sleep(0.15)
    else:
        print(f"  Timeout — ultimo ret={ret}")
except Exception as e:
    print(f"  Excepcion: {e}")

print()

# ---- PRUEBA 3: AcquireFingerprintImage con w y h como salida ----
print("PRUEBA 3 — AcquireFingerprintImage(handle, img_buf, img_size, w, h)...")
try:
    zkfp.ZKFPM_AcquireFingerprintImage.argtypes = [
        ctypes.c_void_p,
        ctypes.c_char_p, ctypes.c_int,
        ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int),
    ]
    zkfp.ZKFPM_AcquireFingerprintImage.restype = ctypes.c_int

    img_buf = ctypes.create_string_buffer(300 * 375)
    w = ctypes.c_int(0)
    h = ctypes.c_int(0)

    print("  Coloque el dedo (15 segundos)...")
    inicio = time.time()
    ultimo = None
    while time.time() - inicio < 15:
        ret = zkfp.ZKFPM_AcquireFingerprintImage(
            handle,
            img_buf, ctypes.sizeof(img_buf),
            ctypes.byref(w), ctypes.byref(h)
        )
        if ret != ultimo:
            print(f"  ret={ret} | w={w.value} h={h.value}")
            ultimo = ret
        if ret == 0:
            print(f"  EXITO — imagen {w.value}x{h.value}")
            break
        time.sleep(0.15)
    else:
        print(f"  Timeout — ultimo ret={ret}")
except Exception as e:
    print(f"  Excepcion: {e}")

zkfp.ZKFPM_CloseDevice(handle)
zkfp.ZKFPM_Terminate()
print("\nDiagnostico completado.")