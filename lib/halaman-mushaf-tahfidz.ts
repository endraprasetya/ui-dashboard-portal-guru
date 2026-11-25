/**
 * Awal ayat tiap halaman mushaf Madinah 15 baris (halaman 482–604, Juz 25 s.d. Juz 30).
 * Sumber tata letak: mushaf Madinah, ayat pertama pada halaman tersebut.
 */
const AWAL_HALAMAN =
  '482:41:47,483:42:1,484:42:11,485:42:16,486:42:23,487:42:32,488:42:45,489:42:52,490:43:11,491:43:23,492:43:34,493:43:48,494:43:61,495:43:74,496:44:1,497:44:19,498:44:40,499:45:1,500:45:14,501:45:23,502:45:33,503:46:6,504:46:15,505:46:21,506:46:29,507:47:1,508:47:12,509:47:20,510:47:30,511:48:1,512:48:10,513:48:16,514:48:24,515:48:29,516:49:5,517:49:12,518:50:1,519:50:16,520:50:36,521:51:7,522:51:31,523:51:52,524:52:15,525:52:32,526:53:1,527:53:27,528:53:45,529:54:7,530:54:28,531:54:50,532:55:17,533:55:41,534:55:68,535:56:17,536:56:51,537:56:77,538:57:4,539:57:12,540:57:19,541:57:25,542:58:1,543:58:7,544:58:12,545:58:22,546:59:4,547:59:10,548:59:17,549:60:1,550:60:6,551:60:12,552:61:6,553:62:1,554:62:9,555:63:5,556:64:1,557:64:10,558:65:1,559:65:6,560:66:1,561:66:8,562:67:1,563:67:13,564:67:27,565:68:16,566:68:43,567:69:9,568:69:35,569:70:11,570:70:40,571:71:11,572:72:1,573:72:14,574:73:1,575:73:20,576:74:18,577:74:48,578:75:20,579:76:6,580:76:26,581:77:20,582:78:1,583:78:31,584:79:16,585:80:1,586:81:1,587:82:1,588:83:7,589:83:35,590:85:1,591:86:1,592:87:16,593:89:1,594:89:24,595:91:1,596:92:15,597:95:1,598:97:1,599:98:8,600:100:10,601:103:1,602:106:1,603:109:1,604:112:1'

const POSISI_HALAMAN = AWAL_HALAMAN.split(',').map((item) => {
  const [halaman, surah, ayat] = item.split(':').map(Number)
  return { halaman, surah, ayat }
})

function sebelumAtauSama(surah: number, ayat: number, batasSurah: number, batasAyat: number) {
  return surah < batasSurah || (surah === batasSurah && ayat <= batasAyat)
}

/** Nomor halaman mushaf untuk surat dan ayat. Kosong jika di luar Juz 25–30. */
export function halamanMushaf(nomorSurah: number, ayat: number) {
  if (!Number.isFinite(nomorSurah) || nomorSurah < 41 || !Number.isFinite(ayat) || ayat < 1) return null
  let ketemu: number | null = null
  for (const posisi of POSISI_HALAMAN) {
    if (sebelumAtauSama(posisi.surah, posisi.ayat, nomorSurah, ayat)) ketemu = posisi.halaman
    else break
  }
  return ketemu
}

/**
 * Ubah halaman capaian akhir menjadi "X Juz" atau "X Juz, Y Halaman".
 * Dihitung dari akhir mushaf: Juz 30 (hal. 604–582) sampai Juz 25 (hal. 501–482).
 */
export function jumlahHafalanDariHalaman(halaman: number | null) {
  if (halaman == null || halaman < 482 || halaman > 604) return '-'
  if (halaman >= 582) {
    const halDiJuz = 605 - halaman
    return halDiJuz >= 23 ? '1 Juz' : `${halDiJuz} Halaman`
  }
  if (halaman >= 562) {
    const halDiJuz = halaman - 561
    return halDiJuz >= 20 ? '2 Juz' : `1 Juz, ${halDiJuz} Halaman`
  }
  if (halaman >= 542) {
    const halDiJuz = halaman - 541
    return halDiJuz >= 20 ? '3 Juz' : `2 Juz, ${halDiJuz} Halaman`
  }
  if (halaman >= 522) {
    const halDiJuz = 542 - halaman
    return halDiJuz >= 20 ? '4 Juz' : `3 Juz, ${halDiJuz} Halaman`
  }
  if (halaman >= 502) {
    const halDiJuz = 522 - halaman
    return halDiJuz >= 20 ? '5 Juz' : `4 Juz, ${halDiJuz} Halaman`
  }
  const halDiJuz = 502 - halaman
  return halDiJuz >= 20 ? '6 Juz' : `5 Juz, ${halDiJuz} Halaman`
}

export function jumlahHafalanDariPosisi(nomorSurah: number, ayat: number) {
  return jumlahHafalanDariHalaman(halamanMushaf(nomorSurah, ayat))
}
