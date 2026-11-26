/** NIY ustadz/ustadzah pembimbing. Nama yang tidak ada di daftar mengembalikan string kosong. */
const DAFTAR_NIY_PEMBIMBING: ReadonlyArray<readonly [string, string]> = [
  ['Aisyah Fithri', '2002040720230438'],
  ['Ali Wahyudin, S.Pd.I', '198606092015 07260'],
  ['Ambar Novitasari, S.Pd.', '199311262021 07395'],
  ['Andreas Haryanto, S.Pd', '198602232012 10182'],
  ['Asiyah', '200103192020 07394'],
  ['Daffa Arifian Zaky, S.Pd', '199908052024 07458'],
  ['Dewi Nurmalasari', '198405122009 0788'],
  ['Dian Aprilia Kartikaningrum', '199904212019 07344'],
  ['Dwi Mei Supianti, S.Pd.', '198905142014 04226'],
  ['Eko Muhammad Anshori', '197709262012 10181'],
  ['Erni Fasichah, S.Pd.', '198107032013 07212'],
  ['Ery Kristyono, S.Pd.', '198606282010 07123'],
  ['Faiz Mubarok, S.Pd.I', '199210112021 07396'],
  ['Haura Nurul Firdaus', '200209272023 07439'],
  ['Haryono, S.Pd.', '198701212008 0571'],
  ['Heru Purnomo, S.Pd.', '198308242012 07168'],
  ['Ima Karmila Karim, S.Pd.I', '198204182024 07464'],
  ['Imilda, S.Si.', '198002182015 08268'],
  ['Irvan Dwi Rahardjo, S.Ds.', '199004122019 08324'],
  ['Isrofi Muchammad, A.Md.', '198703272013 04194'],
  ['Kalis Wardoyo, S.Pd', '199811212025 07475'],
  ['Muhamad Musthofa Imtikhan', '1995051820250488'],
  ['Muhammad Arifin, S.Pd.', '198204022006 0741'],
  ['Muqorrobin, S.Pd.I', '197504092018 0313'],
  ['Musa Abdullah Muhammad', '200112312023 07440'],
  ["Mustami'ah", '20020222202308441'],
  ['Nia Zahrotun Niam, S.Pd.', '197705302009 0182'],
  ['Novitasari, S.Sos.', '199711172021 07397'],
  ['Prasetyo, S.Pd', '198402192005 1236'],
  ['Riskha Fatmaningrum, S.Pd.', '199603152020 02355'],
  ['Rita Fatmawati', '197202232014 11249'],
  ['Shabrina Silmi', '200102042023 07442'],
  ['Sholahudin Muhammad Akbar, S.Pd', '20020815202407457'],
  ['Siswati, S.Pd.', '197612062009 0796'],
  ['Sri Sunarko Utomo , S.Pd.', '197805202013 0208'],
  ['Suginem, S.Pd.', '197106172011 07150'],
  ['Suharman,S.Pd.I', '197504252007 0862'],
  ['Titik Retno Palupi, A.Md.Kes.', '197608122009 0181'],
  ['Waji Darmanto, A.Md.', '198110012018 10318'],
  ['Warsi, S.Pd', '197411012016 09280'],
  ['Wisono, S.Pd.', '197810102004 0719'],
  ['Wiwin Sri Rejeki, A.Ma', '199402032017 07286'],
  ['Yulianto, S.Pd', '198006272012 07177'],
]

export function normNamaPembimbing(nama: string) {
  return nama
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\b(?:s\s*pd\s*i|s\s*pd|s\s*si|s\s*sos|s\s*ds|a\s*md\s*kes|a\s*md|a\s*ma|ustadzah|ustadz|ust)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const PETA_NIY = new Map(DAFTAR_NIY_PEMBIMBING.map(([nama, niy]) => [normNamaPembimbing(nama), niy]))

/** Cocokkan nama pembimbing. Kosong jika tidak ada di daftar (misalnya guru bantu). */
export function niyDariNamaPembimbing(nama: string) {
  const penuh = normNamaPembimbing(nama)
  if (!penuh) return ''
  const langsung = PETA_NIY.get(penuh)
  if (langsung) return langsung

  const kandidat: { kunci: string; niy: string }[] = []
  for (const [kunci, niy] of PETA_NIY) {
    if (!kunci) continue
    const namaMemuatKunci = penuh.includes(kunci)
    const kunciMemuatNama = kunci.includes(penuh) && penuh.split(' ').length >= 2
    if (namaMemuatKunci || kunciMemuatNama) kandidat.push({ kunci, niy })
  }
  kandidat.sort((a, b) => b.kunci.length - a.kunci.length)
  const dipakai: { kunci: string; niy: string }[] = []
  for (const item of kandidat) {
    if (dipakai.some((ada) => ada.kunci.includes(item.kunci))) continue
    dipakai.push(item)
  }
  return [...new Set(dipakai.map((item) => item.niy))].join(', ')
}
