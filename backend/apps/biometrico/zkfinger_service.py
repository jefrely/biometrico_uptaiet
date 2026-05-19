import ctypes
import time
import os
from cryptography.fernet import Fernet


class ZK9500Service:

    TEMPLATE_SIZE = 2048
    IMAGE_SIZE    = 640 * 480

    def __init__(self, dll_path="libzkfp.dll"):
        self.zkfp = ctypes.WinDLL(dll_path)

        # ── Captura ────────────────────────────────────────────────
        self.zkfp.ZKFPM_Init.restype           = ctypes.c_int
        self.zkfp.ZKFPM_Terminate.restype      = ctypes.c_int
        self.zkfp.ZKFPM_GetDeviceCount.restype = ctypes.c_int
        self.zkfp.ZKFPM_OpenDevice.argtypes    = [ctypes.c_int]
        self.zkfp.ZKFPM_OpenDevice.restype     = ctypes.c_void_p
        self.zkfp.ZKFPM_CloseDevice.argtypes   = [ctypes.c_void_p]
        self.zkfp.ZKFPM_AcquireFingerprint.argtypes = [
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.POINTER(ctypes.c_uint)
        ]
        self.zkfp.ZKFPM_AcquireFingerprint.restype = ctypes.c_int

        # ── BD interna ─────────────────────────────────────────────
        self.zkfp.ZKFPM_DBInit.argtypes     = []
        self.zkfp.ZKFPM_DBInit.restype      = ctypes.c_void_p
        self.zkfp.ZKFPM_DBFree.argtypes     = [ctypes.c_void_p]
        self.zkfp.ZKFPM_DBFree.restype      = ctypes.c_int
        self.zkfp.ZKFPM_DBClear.argtypes    = [ctypes.c_void_p]
        self.zkfp.ZKFPM_DBClear.restype     = ctypes.c_int
        self.zkfp.ZKFPM_DBAdd.argtypes      = [
            ctypes.c_void_p, ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint
        ]
        self.zkfp.ZKFPM_DBAdd.restype       = ctypes.c_int
        self.zkfp.ZKFPM_DBIdentify.argtypes = [
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_uint),  ctypes.POINTER(ctypes.c_int)
        ]
        self.zkfp.ZKFPM_DBIdentify.restype  = ctypes.c_int

        # ── DBMerge ────────────────────────────────────────────────
        self.zkfp.ZKFPM_DBMerge.argtypes = [
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.POINTER(ctypes.c_uint)
        ]
        self.zkfp.ZKFPM_DBMerge.restype = ctypes.c_int

        # Crear BD interna — guardar como c_void_p explícito
        raw = self.zkfp.ZKFPM_DBInit()
        self.db_handle = ctypes.c_void_p(raw)

        self.dev_handle = None
        self._fernet    = Fernet(self._obtener_clave())

    def _obtener_clave(self):
        clave = os.environ.get('FINGERPRINT_ENCRYPTION_KEY')
        if not clave:
            raise ValueError("FINGERPRINT_ENCRYPTION_KEY no configurada en .env")
        return clave.encode()

    def inicializar(self):
        ret = self.zkfp.ZKFPM_Init()
        if ret != 0:
            return {'ok': False, 'msg': f'Error al inicializar SDK: {ret}'}

        cantidad = self.zkfp.ZKFPM_GetDeviceCount()
        if cantidad == 0:
            return {'ok': False, 'msg': 'No se detecto ningun escaner ZK9500'}

        self.dev_handle = self.zkfp.ZKFPM_OpenDevice(0)
        if not self.dev_handle:
            return {'ok': False, 'msg': 'No se pudo abrir el dispositivo'}

        return {'ok': True, 'msg': f'ZK9500 conectado ({cantidad} dispositivo)'}

    def _capturar_una(self, timeout=15):
        img_buf  = (ctypes.c_ubyte * self.IMAGE_SIZE)()
        tmpl_buf = (ctypes.c_ubyte * self.TEMPLATE_SIZE)()
        tmpl_len = ctypes.c_uint(self.TEMPLATE_SIZE)

        inicio = time.time()
        while time.time() - inicio < timeout:
            ret = self.zkfp.ZKFPM_AcquireFingerprint(
                self.dev_handle,
                img_buf,  ctypes.c_uint(self.IMAGE_SIZE),
                tmpl_buf, ctypes.byref(tmpl_len)
            )
            if ret == 0 and tmpl_len.value > 0:
                return bytes(tmpl_buf[:tmpl_len.value])
            time.sleep(0.2)
        return None

    def capturar_huella(self, timeout=20):
        if not self.dev_handle:
            return {'ok': False, 'msg': 'Dispositivo no inicializado'}
        tmpl = self._capturar_una(timeout)
        if tmpl is None:
            return {'ok': False, 'msg': 'Tiempo agotado esperando huella'}
        return {'ok': True, 'template': tmpl, 'calidad': 80}

    def registrar_huella(self, empleado_id, numero_dedo):
        templates = []
        for intento in range(1, 4):
            print(f"  Captura {intento} de 3 — coloque el dedo...")
            tmpl = self._capturar_una(timeout=20)
            if tmpl is None:
                return {'ok': False, 'msg': f'Tiempo agotado en captura {intento}'}
            templates.append(tmpl)
            print(f"  OK ({len(tmpl)} bytes)")
            if intento < 3:
                print("  Retire el dedo...")
                time.sleep(1.5)

        # Intentar fusion con DBMerge
        t0 = (ctypes.c_ubyte * len(templates[0]))(*templates[0])
        t1 = (ctypes.c_ubyte * len(templates[1]))(*templates[1])
        t2 = (ctypes.c_ubyte * len(templates[2]))(*templates[2])
        merged_buf = (ctypes.c_ubyte * self.TEMPLATE_SIZE)()
        merged_len = ctypes.c_uint(self.TEMPLATE_SIZE)

        ret = self.zkfp.ZKFPM_DBMerge(
            t0, ctypes.c_uint(len(templates[0])),
            t1, ctypes.c_uint(len(templates[1])),
            t2, ctypes.c_uint(len(templates[2])),
            merged_buf, ctypes.byref(merged_len)
        )

        if ret == 0 and merged_len.value > 0:
            template_final = bytes(merged_buf[:merged_len.value])
            print(f"  Fusion OK — {len(template_final)} bytes")
        else:
            template_final = max(templates, key=len)
            print(f"  Usando mejor captura — {len(template_final)} bytes")

        return {
            'ok':                  True,
            'template_encriptado': self._fernet.encrypt(template_final),
            'calidad':             80,
            'msg':                 'Huella registrada correctamente'
        }

    def verificar_huella(self, templates_bd, timeout=30):
        # Limpiar BD interna
        self.zkfp.ZKFPM_DBClear(self.db_handle)

        # Cargar templates y crear mapa idx -> empleado_id
        mapa = {}
        idx  = 1
        for template_encriptado, empleado_id in templates_bd:
            try:
                tmpl = self._fernet.decrypt(bytes(template_encriptado))
            except Exception:
                continue

            arr = (ctypes.c_ubyte * len(tmpl))(*tmpl)
            ret = self.zkfp.ZKFPM_DBAdd(
                self.db_handle,
                ctypes.c_uint(idx),
                ctypes.cast(arr, ctypes.POINTER(ctypes.c_ubyte)),
                ctypes.c_uint(len(tmpl))
            )
            if ret == 0:
                mapa[idx] = empleado_id
                idx += 1

        if not mapa:
            return {'ok': False, 'msg': 'No se pudieron cargar templates en la BD interna'}

        print(f"  Templates cargados: {len(mapa)}")

        # Capturar huella del sensor
        captura = self.capturar_huella(timeout)
        if not captura['ok']:
            return captura

        tmpl_c = captura['template']
        arr_c  = (ctypes.c_ubyte * len(tmpl_c))(*tmpl_c)

        matched_id = ctypes.c_uint(0)
        score      = ctypes.c_int(0)

        ret = self.zkfp.ZKFPM_DBIdentify(
            self.db_handle,
            ctypes.cast(arr_c, ctypes.POINTER(ctypes.c_ubyte)),
            ctypes.c_uint(len(tmpl_c)),
            ctypes.byref(matched_id),
            ctypes.byref(score)
        )

        print(f"  DBIdentify ret={ret}, matched_id={matched_id.value}, score={score.value}")

        if ret == 0 and matched_id.value in mapa:
            return {
                'ok':          True,
                'empleado_id': mapa[matched_id.value],
                'score':       score.value,
                'msg':         'Huella verificada exitosamente'
            }

        return {'ok': False, 'msg': 'Huella no reconocida', 'score': 0}

    def cerrar(self):
        try:
            if self.db_handle:
                self.zkfp.ZKFPM_DBFree(self.db_handle)
                self.db_handle = None
            if self.dev_handle:
                self.zkfp.ZKFPM_CloseDevice(self.dev_handle)
                self.dev_handle = None
            self.zkfp.ZKFPM_Terminate()
        except Exception as e:
            print(f"Aviso al cerrar: {e}")