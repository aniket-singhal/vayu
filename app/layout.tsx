import './globals.css'

export const metadata = {
  title: 'Vayu - Breathing Meditation',
  description: 'Journey into stillness through breath',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
