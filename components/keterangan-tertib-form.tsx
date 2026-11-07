"use client";

import { BidangSuaraMandiri } from "@/components/input-suara";
import { KETERANGAN_TERTIB_LAINNYA, KETERANGAN_TERTIB_OPSI } from "@/lib/keterangan-tertib-point";

type Props = {
  pilihan: string[];
  lainnya: string;
  onPilihanChange: (next: string[]) => void;
  onLainnyaChange: (next: string) => void;
  error?: string | null;
  idPrefix?: string;
  sorotError?: boolean;
  wajib?: boolean;
};

export function KeteranganTertibForm({
  pilihan,
  lainnya,
  onPilihanChange,
  onLainnyaChange,
  error,
  idPrefix = "ktr",
  sorotError = false,
  wajib = true,
}: Props) {
  const toggle = (opsi: string) => {
    if (pilihan.includes(opsi)) onPilihanChange(pilihan.filter((o) => o !== opsi));
    else onPilihanChange([...pilihan, opsi]);
  };

  return (
    <fieldset className="mb-4">
      <legend className="mb-2 block text-xs font-bold text-slate-700">
        Keterangan / tindakan guru {wajib ? <span className="text-red-600">*</span> : <span className="font-medium text-slate-400">(opsional)</span>}
      </legend>
      <p className="mb-2 text-[11px] text-slate-500">
        {wajib ? 'Pilih satu atau lebih (wajib untuk pelanggaran).' : 'Boleh dikosongkan untuk catatan kebaikan / prestasi.'}
      </p>
      <div
        className={`space-y-2 rounded-xl border bg-slate-50/80 p-3 ${
          sorotError || error ? "border-red-400 ring-1 ring-red-200" : "border-slate-200"
        }`}
      >
        {KETERANGAN_TERTIB_OPSI.map((opsi) => {
          const id = `${idPrefix}-${opsi.replace(/\s+/g, "-")}`;
          const checked = pilihan.includes(opsi);
          return (
            <div key={opsi}>
              <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opsi)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>{opsi === KETERANGAN_TERTIB_LAINNYA ? "Lainnya (keterangan kustom)" : opsi}</span>
              </label>
              {opsi === KETERANGAN_TERTIB_LAINNYA && checked && (
                <BidangSuaraMandiri
                  value={lainnya}
                  onChange={onLainnyaChange}
                  rows={2}
                  placeholder="Tulis keterangan tambahan (wajib)"
                  className={`mt-2 w-full rounded-lg border bg-white p-2.5 text-sm ${
                    sorotError && !lainnya.trim() ? "border-red-400" : "border-slate-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
    </fieldset>
  );
}
