import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import MainLayout from '@/components/MainLayout'
import PendingIntentFlusher from '@/components/PendingIntentFlusher'
import { IntentToastListener } from '@/components/IntentToastListener'

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
          <PendingIntentFlusher />
          <IntentToastListener />
          <MainLayout>{children}</MainLayout>
        </SessionProvider>
      </body>
    </html>
  )
}
