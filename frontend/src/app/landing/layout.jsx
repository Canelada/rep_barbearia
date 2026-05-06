export const metadata = {
  title: 'eBarber - Sistema de Gestão para Barbearias',
  description: 'Sistema completo de gestão para barbearias modernas. Agendamento online, controle financeiro, gestão de equipe e muito mais. Transforme sua barbearia com tecnologia.',
  keywords: 'sistema barbearia, gestão barbearia, agendamento online barbearia, software barbearia, controle financeiro barbearia',
  authors: [{ name: 'eBarber' }],
  openGraph: {
    title: 'eBarber - Sistema de Gestão para Barbearias',
    description: 'Transforme sua barbearia com o sistema completo de gestão. Agendamento online, controle financeiro e muito mais.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'eBarber',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eBarber - Sistema de Gestão para Barbearias',
    description: 'Sistema completo de gestão para barbearias modernas',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'your-google-verification-code', // Substituir com código real
  }
}

export default function LandingLayout({ children }) {
  return (
    <>
      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'eBarber',
            applicationCategory: 'BusinessApplication',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'BRL',
              lowPrice: '79',
              highPrice: '299',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '500',
            },
            operatingSystem: 'Web',
            description: 'Sistema completo de gestão para barbearias modernas',
          }),
        }}
      />
      {children}
    </>
  )
}
