import '@/styles/globals.css'

export const metadata = {
  title: 'Barbearia Monarca',
  description:
    'Sistema de gestão da Barbearia Monarca - Excelência em cuidados masculinos',
  icons: {
    icon: '/logo-monarca.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
