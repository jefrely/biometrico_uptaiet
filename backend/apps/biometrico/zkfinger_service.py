import ctypes
import time
import os
from cryptography.fernet import Fernet


class ZK9500Service:

    TEMPLATE_SIZE = 2048
    IMAGE_SIZE    = 640 * 480

    def __init__(self, dll_path="libzkfp.dll"):
        self.zkfp       = ctypes.WinDLL(dll_path)
        self.dev_handle = None
        self.db_handle  = None
        self._fernet    = Fernet(self._obtener_clave())
        self._definir_tipos()

    def _obtener_clave(self):
        clave = os.environ.get('FINGERPRINT_ENCRYPTION_KEY')
        if not clave:
            raise ValueError("FINGERPRINT_ENCRYPTION_KEY no configurada en .env")
        return clave.encode()

    def _definir_tipos(self):
        """Define los tipos de argumentos y retorno de todas las funciones del SDK."""

        # ── Ciclo de vida del SDK ──────────────────────────────────
        self.zkfp.ZKFPM_Init.restype           = ctypes.c_int
        self.zkfp.ZKFPM_Init.argtypes          = []
        self.zkfp.ZKFPM_Terminate.restype      = ctypes.c_int
        self.zkfp.ZKFPM_Terminate.argtypes     = []
        self.zkfp.ZKFPM_GetDeviceCount.restype = ctypes.c_int
        self.zkfp.ZKFPM_GetDeviceCount.argtypes= []

        # ── Dispositivo ────────────────────────────────────────────
        self.zkfp.ZKFPM_OpenDevice.argtypes  = [ctypes.c_int]
        self.zkfp.ZKFPM_OpenDevice.restype   = ctypes.c_void_p
        self.zkfp.ZKFPM_CloseDevice.argtypes = [ctypes.c_void_p]
        self.zkfp.ZKFPM_CloseDevice.restype  = ctypes.c_int

        # ── Captura ────────────────────────────────────────────────
        self.zkfp.ZKFPM_AcquireFingerprint.argtypes = [
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.POINTER(ctypes.c_uint)
        ]
        self.zkfp.ZKFPM_AcquireFingerprint.restype = ctypes.c_int

        # ── BD interna (identificación 1:N) ───────────────────────
        self.zkfp.ZKFPM_DBInit.argtypes      = []
        self.zkfp.ZKFPM_DBInit.restype       = ctypes.c_void_p
        self.zkfp.ZKFPM_DBFree.argtypes      = [ctypes.c_void_p]
        self.zkfp.ZKFPM_DBFree.restype       = ctypes.c_int
        self.zkfp.ZKFPM_DBClear.argtypes     = [ctypes.c_void_p]
        self.zkfp.ZKFPM_DBClear.restype      = ctypes.c_int
        self.zkfp.ZKFPM_DBAdd.argtypes       = [
            ctypes.c_void_p, ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint
        ]
        self.zkfp.ZKFPM_DBAdd.restype        = ctypes.c_int
        self.zkfp.ZKFPM_DBIdentify.argtypes  = [
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_uint),  ctypes.POINTER(ctypes.c_int)
        ]
        self.zkfp.ZKFPM_DBIdentify.restype   = ctypes.c_int

        # ── Fusión ─────────────────────────────────────────────────
        self.zkfp.ZKFPM_DBMerge.argtypes = [
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.c_uint,
            ctypes.POINTER(ctypes.c_ubyte), ctypes.POINTER(ctypes.c_uint)
        ]
        self.zkfp.ZKFPM_DBMerge.restype = ctypes.c_int

    # ── Inicialización ─────────────────────────────────────────────────────────

    def inicializar(self):
        """
        Inicializa el SDK y abre el dispositivo.
        Llama a Terminate primero para limpiar cualquier sesión anterior
        que haya quedado activa por un cierre abrupto del servidor.
        """
        # Limpiar sesión previa si existe
        self._limpiar_sesion()

        # Inicializar SDK
        ret = self.zkfp.ZKFPM_Init()
        if ret != 0:
            return {'ok': False, 'msg': f'Error al inicializar SDK: {ret}'}

        # Verificar dispositivo
        cantidad = self.zkfp.ZKFPM_GetDeviceCount()
        if cantidad == 0:
            self.zkfp.ZKFPM_Terminate()
            return {'ok': False, 'msg': 'No se detecto ningun escaner ZK9500. Verifique el cable USB.'}

        # Abrir dispositivo
        self.dev_handle = self.zkfp.ZKFPM_OpenDevice(0)
        if not self.dev_handle:
            self.zkfp.ZKFPM_Terminate()
            return {'ok': False, 'msg': 'No se pudo abrir el dispositivo ZK9500.'}

        # Crear BD interna para identificación 1:N
        raw = self.zkfp.ZKFPM_DBInit()
        if not raw:
            self.zkfp.ZKFPM_CloseDevice(self.dev_handle)
            self.zkfp.ZKFPM_Terminate()
            return {'ok': False, 'msg': 'No se pudo crear la BD interna del SDK.'}
        self.db_handle = ctypes.c_void_p(raw)

        return {'ok': True, 'msg': f'ZK9500 conectado correctamente ({cantidad} dispositivo)'}

    def _limpiar_sesion(self):
        """Libera todos los recursos del SDK de forma segura."""
        try:
            if self.db_handle:
                self.zkfp.ZKFPM_DBFree(self.db_handle)
                self.db_handle = None
        except Exception:
            pass
        try:
            if self.dev_handle:
                self.zkfp.ZKFPM_CloseDevice(self.dev_handle)
                self.dev_handle = None
        except Exception:
            pass
        try:
            self.zkfp.ZKFPM_Terminate()
        except Exception:
            pass

    # ── Captura ────────────────────────────────────────────────────────────────

    def _capturar_una(self, timeout=15):
        """Captura un template crudo del sensor. Retorna bytes o None si hay timeout."""
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
            return {'ok': False, 'msg': 'Dispositivo no inicializado. Llame a inicializar() primero.'}
        tmpl = self._capturar_una(timeout)
        if tmpl is None:
            return {'ok': False, 'msg': 'Tiempo agotado. Coloque el dedo sobre el sensor.'}
        return {'ok': True, 'template': tmpl, 'calidad': 80}

    # ── Registro ───────────────────────────────────────────────────────────────

    def registrar_huella(self, empleado_id, numero_dedo):
        """
        Captura 3 veces el mismo dedo.
        Intenta fusionar con ZKFPM_DBMerge.
        Si la fusión falla, guarda el template de mayor tamaño.
        Retorna el template encriptado listo para guardar en BD.
        """
        templates = []

        for intento in range(1, 4):
            print(f"  Captura {intento} de 3 — coloque el dedo...")
            tmpl = self._capturar_una(timeout=20)
            if tmpl is None:
                return {'ok': False, 'msg': f'Tiempo agotado en captura {intento}. Intente de nuevo.'}
            templates.append(tmpl)
            print(f"  OK ({len(tmpl)} bytes)")
            if intento < 3:
                print("  Retire el dedo...")
                time.sleep(1.5)

        # Intentar fusión con DBMerge
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
            print(f"  Fusion exitosa — {len(template_final)} bytes")
        else:
            # Fallback: usar el template más grande de las 3 capturas
            template_final = max(templates, key=len)
            print(f"  Usando mejor captura — {len(template_final)} bytes")

        return {
            'ok':                  True,
            'template_encriptado': self._fernet.encrypt(template_final),
            'calidad':             80,
            'msg':                 'Huella registrada correctamente'
        }

    # ── Verificación 1:N ───────────────────────────────────────────────────────

    def verificar_huella(self, templates_bd, timeout=30):
        """
        Carga todos los templates activos de la BD en la BD interna del SDK
        y usa ZKFPM_DBIdentify para identificar al empleado.

        templates_bd: lista de tuplas (template_encriptado_bytes, empleado_id)
        """
        if not self.db_handle:
            return {'ok': False, 'msg': 'BD interna no inicializada.'}

        # Limpiar BD interna y recargar todos los templates
        self.zkfp.ZKFPM_DBClear(self.db_handle)

        mapa = {}   # idx_sdk -> empleado_id
        idx  = 1

        for template_encriptado, empleado_id in templates_bd:
            try:
                tmpl = self._fernet.decrypt(bytes(template_encriptado))
            except Exception:
                continue  # Template corrupto o clave diferente, ignorar

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
            return {'ok': False, 'msg': 'No se pudieron cargar huellas en el SDK. Registre huellas primero.'}

        print(f"  Templates cargados en SDK: {len(mapa)}")

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

        return {'ok': False, 'msg': 'Huella no reconocida. Intente de nuevo.', 'score': 0}

    # ── Cierre ─────────────────────────────────────────────────────────────────

    def cerrar(self):
        """Libera todos los recursos del SDK de forma segura."""
        self._limpiar_sesion()