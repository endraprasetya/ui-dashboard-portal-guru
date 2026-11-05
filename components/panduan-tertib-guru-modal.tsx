"use client";

import { useEffect, useState } from "react";
import { ModalInformasiTeks } from "@/components/modal-informasi-teks";
import { PANDUAN_TERTIB_GURU } from "@/lib/teks-informasi-tertib";

export function PanduanTertibGuruModal() {
  const [terbuka, setTerbuka] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PANDUAN_TERTIB_GURU.storageKey) === "1") return;
    } catch {
      /* abaikan */
    }
    setTerbuka(true);
  }, []);

  const tutup = () => {
    try {
      sessionStorage.setItem(PANDUAN_TERTIB_GURU.storageKey, "1");
    } catch {
      /* abaikan */
    }
    setTerbuka(false);
  };

  return (
    <ModalInformasiTeks terbuka={terbuka} onTutup={tutup} judul={PANDUAN_TERTIB_GURU.judul} subjudul={PANDUAN_TERTIB_GURU.subjudul}>
      <p className="font-semibold">Bismillahirrahmanirrahim.</p>
      <p className="mt-3">
        Tertib Poin merupakan sarana pembinaan karakter siswa kelas II–VI untuk menanamkan kedisiplinan, tanggung jawab, dan
        akhlak mulia.
      </p>
      <p className="mt-3">
        Setiap siswa memiliki 200 poin awal. Guru dapat memberikan pengurangan poin atas pelanggaran dan penambahan poin atas
        perilaku positif siswa sesuai ketentuan yang berlaku.
      </p>
      <p className="mt-3 font-semibold">Perhatian bagi seluruh guru:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>Berikan poin secara objektif, adil, dan konsisten.</li>
        <li>Pastikan pelanggaran benar-benar terjadi, bukan berdasarkan asumsi.</li>
        <li>Sertai pengurangan poin dengan teguran dan nasihat yang mendidik.</li>
        <li>Apresiasi kebaikan dan inisiatif positif siswa.</li>
        <li>Jadikan Tertib Poin sebagai sarana mendidik, bukan sekadar menghukum.</li>
      </ul>
      <p className="mt-3">
        Mari bersama membimbing siswa menjadi pribadi yang disiplin, beradab, bertanggung jawab, dan terbiasa melakukan
        kebaikan.
      </p>
      <p className="mt-3 font-semibold">Jazaakumullahu khairan.</p>
    </ModalInformasiTeks>
  );
}
