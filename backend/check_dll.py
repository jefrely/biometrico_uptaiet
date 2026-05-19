# guarda como check_dll.py en backend\
import ctypes

dll = ctypes.WinDLL("libzkfp.dll")

funciones = [
    'ZKFPM_DBMatch',
    'ZKFPM_DBMerge', 
    'ZKFPM_DBAdd',
    'ZKFPM_DBFree',
    'ZKFPM_DBDel',
    'ZKFPM_DBClear',
    'ZKFPM_DBCount',
    'ZKFPM_DBIdentify',
    'ZKFPM_Identify',
    'ZKFPM_Match',
    'ZKFPM_GenChar',
]

print("Funciones disponibles en libzkfp.dll:")
for f in funciones:
    try:
        getattr(dll, f)
        print(f"  OK  — {f}")
    except AttributeError:
        print(f"  NO  — {f}")