import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import MainLayout from '@/components/MainLayout'

export const metadata: Metadata = {
  title: 'OffMarket — Sell or buy before listings go public',
  description:
    'Connect with qualified buyers or access off-market properties. Estimates from real DVF data — discreet, serious, no public listing required.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <MainLayout>{children}</MainLayout>
        </SessionProvider>
      </body>
    </html>
  )
}
