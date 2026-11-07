import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal Wali | SD Al Madinah',
  description: 'Pengumuman, tertib poin, prestasi, dan kegiatan ananda untuk wali murid.',
}

export default function LayoutPortalWali({ children }: { children: React.ReactNode }) {
  return children
}
