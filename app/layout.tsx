import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'NouveLLM — Université Sorbonne Nouvelle',
  description: 'Service IA institutionnel — INTEGRIA · ANR France 2030',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="preload" href="/fonts/Gilroy-ExtraBold.otf" as="font" type="font/otf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Gilroy-Light.otf" as="font" type="font/otf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/SourceSerifPro-Regular.otf" as="font" type="font/otf" crossOrigin="anonymous" />
      </head>
      <body className="h-full bg-[#F2F2F2]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
