from bisect import bisect_left
from itertools import accumulate

AYAT_PER_SURAH: tuple[int, ...] = (
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
    123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
    28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
    29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
    15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
    11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
    5, 4, 5, 6,
)

JUMLAH_SURAH = len(AYAT_PER_SURAH)  # 114
_KUMULATIF: tuple[int, ...] = tuple(accumulate(AYAT_PER_SURAH, initial=0))  # panjang 115


def ke_indeks(surah: int, ayat: int) -> int:
    """Posisi absolut ayat (1..6236) dalam urutan mushaf."""
    return _KUMULATIF[surah - 1] + ayat


def dari_indeks(indeks: int) -> tuple[int, int]:
    """Kebalikan dari ke_indeks: mengembalikan (surah, ayat)."""
    surah = bisect_left(_KUMULATIF, indeks)
    return surah, indeks - _KUMULATIF[surah - 1]


def validasi_rentang(surah_awal: int, ayat_awal: int, surah_akhir: int, ayat_akhir: int) -> None:
    for surah in (surah_awal, surah_akhir):
        if not 1 <= surah <= JUMLAH_SURAH:
            raise ValueError(f"Nomor surah {surah} tidak valid (1-{JUMLAH_SURAH}).")
    maks_awal = AYAT_PER_SURAH[surah_awal - 1]
    maks_akhir = AYAT_PER_SURAH[surah_akhir - 1]
    if not 1 <= ayat_awal <= maks_awal:
        raise ValueError(f"Ayat awal {ayat_awal} tidak valid; surah {surah_awal} memiliki {maks_awal} ayat.")
    if not 1 <= ayat_akhir <= maks_akhir:
        raise ValueError(f"Ayat akhir {ayat_akhir} tidak valid; surah {surah_akhir} memiliki {maks_akhir} ayat.")
    if ke_indeks(surah_awal, ayat_awal) > ke_indeks(surah_akhir, ayat_akhir):
        raise ValueError("Posisi awal setoran tidak boleh melewati posisi akhir.")


TOTAL_AYAT = _KUMULATIF[-1]  # 6236
JUMLAH_JUZ = 30


def ayat_untuk_juz(juz: int) -> int:
    """Jumlah ayat setara `juz` juz (proporsional, dibulatkan ke atas). 30 juz = seluruh Al-Qur'an."""
    if not 0 <= juz <= JUMLAH_JUZ:
        raise ValueError(f"Jumlah juz harus 0-{JUMLAH_JUZ}.")
    return -(-TOTAL_AYAT * juz // JUMLAH_JUZ)
