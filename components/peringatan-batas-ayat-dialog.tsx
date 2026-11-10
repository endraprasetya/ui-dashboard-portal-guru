"use client";

import { AlertTriangle } from "lucide-react";
import { pesanPeringatanBatasAyat, type InfoBatasAyat } from "@/lib/surah";

/** Pop-up interaktif saat nomor ayat melebihi jumlah ayat surah. */
export function PeringatanBatasAyatDialog({
  info,
  pesan,
  onTutup,
}: {
  info?: InfoBatasAyat | null;
  pesan?: string | null;
  onTutup: () => void;
}) {
  const teks = info ? pesanPeringatanBatasAyat(info.namaSurah, info.jumlahAyat) : pesan;
  if (!teks) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="judul-batas-ayat"
      aria-describedby="teks-batas-ayat"
      onClick={onTutup}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
          <span className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-800">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div>
            <h4 id="judul-batas-ayat" className="text-base font-extrabold text-amber-950">
              Peringatan Batas Ayat
            </h4>
            {info?.konteks ? (
              <p className="mt-0.5 text-xs font-semibold text-amber-800">{info.konteks}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p id="teks-batas-ayat" className="text-sm leading-relaxed text-slate-700">
            {teks}
          </p>
          {info ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Surah <strong>{info.namaSurah}</strong> · batas maksimal{" "}
              <strong className="tabular-nums text-amber-900">{info.jumlahAyat} ayat</strong>
              {info.ayatInput ? (
                <>
                  {" "}
                  · input Anda: <strong className="tabular-nums text-red-700">{info.ayatInput}</strong>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              autoFocus
              onClick={onTutup}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
