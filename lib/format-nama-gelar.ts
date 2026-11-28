/** Normalisasi gelar pada nama penandatangan cetak (tanpa titik ganda). */
export function normalisasiGelarNama(nama?: string | null) {
  let s = String(nama ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return ''

  s = s.replace(/\bS\.?\s*Pd\.?\s*I\.?\b/gi, 'S.Pd.I.')
  s = s.replace(/\bS\.?\s*Pd\.?\b(?!\s*I)/gi, 'S.Pd.')
  s = s.replace(/\bS\.?\s*Si\.?\b/gi, 'S.Si.')
  s = s.replace(/\bS\.?\s*Sos\.?\b/gi, 'S.Sos.')
  s = s.replace(/\bS\.?\s*Kom\.?\b/gi, 'S.Kom.')
  s = s.replace(/\bS\.?\s*Ds\.?\b/gi, 'S.Ds.')
  s = s.replace(/\bA\.?\s*Md\.?\s*Kes\.?\b/gi, 'A.Md.Kes.')
  s = s.replace(/\.{2,}/g, '.')
  s = s.replace(/,\s*,/g, ', ')
  return s.trim()
}