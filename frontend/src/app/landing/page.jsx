'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, Users, DollarSign, BarChart3,
  Package, Clock, Smartphone, Shield, Zap,
  CheckCircle2, Star, ArrowRight, Menu, X
} from 'lucide-react'
import ScrollAnimation from '@/components/ScrollAnimation'
import StatsSection from './stats'
import ComparacaoSection from './comparacao'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    nomeBarbearia: '',
    mensagem: ''
  })
  const [enviando, setEnviando] = useState(false)
  const [mensagemEnvio, setMensagemEnvio] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)

    // Simular envio (você pode integrar com uma API real depois)
    setTimeout(() => {
      setMensagemEnvio('Solicitação enviada com sucesso! Entraremos em contato em breve.')
      setEnviando(false)
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        nomeBarbearia: '',
        mensagem: ''
      })
    }, 1500)
  }

  const funcionalidades = [
    {
      icon: CalendarDays,
      titulo: 'Agendamento Inteligente',
      descricao: 'Sistema completo de agendamento online com confirmação automática e lembretes por WhatsApp.',
      cor: 'blue'
    },
    {
      icon: Users,
      titulo: 'Gestão de Clientes',
      descricao: 'Cadastro completo de clientes com histórico de atendimentos, preferências e programa de fidelidade.',
      cor: 'green'
    },
    {
      icon: DollarSign,
      titulo: 'Controle Financeiro',
      descricao: 'Fluxo de caixa detalhado, controle de comissões e relatórios financeiros completos.',
      cor: 'purple'
    },
    {
      icon: BarChart3,
      titulo: 'Relatórios Gerenciais',
      descricao: 'Mais de 11 tipos de relatórios para análise completa do seu negócio.',
      cor: 'orange'
    },
    {
      icon: Package,
      titulo: 'Controle de Estoque',
      descricao: 'Gestão completa de produtos com alertas de baixo estoque e histórico de movimentações.',
      cor: 'red'
    },
    {
      icon: Clock,
      titulo: 'Gestão de Horários',
      descricao: 'Controle de jornada de funcionários, horários disponíveis e otimização de agenda.',
      cor: 'indigo'
    }
  ]

  const beneficios = [
    'Redução de 80% em faltas com lembretes automáticos',
    'Aumento de 45% na produtividade com agendamento online',
    'Controle total do financeiro em tempo real',
    'Relatórios detalhados para tomada de decisão',
    'Aplicação responsiva - funciona em qualquer dispositivo',
    'Suporte técnico dedicado',
    'Atualizações constantes sem custo adicional',
    'Segurança de dados com backup automático'
  ]

  const planos = [
    {
      nome: 'Starter',
      preco: 'R$ 79',
      periodo: '/mês',
      descricao: 'Ideal para barbearias que estão começando',
      recursos: [
        'Até 2 profissionais',
        'Até 100 clientes',
        'Agendamento online',
        'Controle de caixa básico',
        'Suporte por email'
      ],
      destaque: false
    },
    {
      nome: 'Professional',
      preco: 'R$ 149',
      periodo: '/mês',
      descricao: 'Para barbearias em crescimento',
      recursos: [
        'Até 5 profissionais',
        'Clientes ilimitados',
        'Todos os recursos do Starter',
        'Relatórios avançados',
        'Controle de estoque',
        'Programa de fidelidade',
        'Suporte prioritário'
      ],
      destaque: true
    },
    {
      nome: 'Enterprise',
      preco: 'R$ 299',
      periodo: '/mês',
      descricao: 'Para redes e grandes operações',
      recursos: [
        'Profissionais ilimitados',
        'Múltiplas unidades',
        'Todos os recursos do Professional',
        'API personalizada',
        'Relatórios customizados',
        'Suporte 24/7',
        'Consultoria mensal'
      ],
      destaque: false
    }
  ]

  const depoimentos = [
    {
      nome: 'Carlos Silva',
      barbearia: 'Barbearia Monarca',
      foto: '👨',
      texto: 'Depois de implementar o eBarber, conseguimos reduzir drasticamente as faltas e aumentar nosso faturamento em 35%. O sistema é intuitivo e completo!',
      estrelas: 5
    },
    {
      nome: 'Roberto Santos',
      barbearia: 'Santos Barber Shop',
      foto: '👨‍🦱',
      texto: 'O controle financeiro ficou muito mais simples. Agora sei exatamente quanto cada funcionário fatura e consigo planejar melhor o futuro da barbearia.',
      estrelas: 5
    },
    {
      nome: 'Marcelo Costa',
      barbearia: 'Costa Hair Studio',
      foto: '👨‍🦰',
      texto: 'Meus clientes adoraram o agendamento online! Agora eles mesmos marcam pelo celular e recebem lembretes automáticos. Profissional demais!',
      estrelas: 5
    }
  ]

  const faqs = [
    {
      pergunta: 'Como funciona o período de teste?',
      resposta: 'Oferecemos 14 dias de teste gratuito com acesso completo a todos os recursos. Não é necessário cartão de crédito para começar.'
    },
    {
      pergunta: 'Preciso instalar algum software?',
      resposta: 'Não! O eBarber é 100% online. Basta acessar pelo navegador de qualquer dispositivo - computador, tablet ou smartphone.'
    },
    {
      pergunta: 'Os dados ficam seguros?',
      resposta: 'Sim! Utilizamos criptografia de ponta a ponta e backup automático diário. Seus dados estão protegidos em servidores seguros.'
    },
    {
      pergunta: 'Posso cancelar a qualquer momento?',
      resposta: 'Sim, você pode cancelar quando quiser sem multas ou taxas. Trabalhamos com mensalidade sem fidelidade.'
    },
    {
      pergunta: 'Vocês oferecem treinamento?',
      resposta: 'Sim! Oferecemos treinamento online completo e suporte dedicado para garantir que você aproveite todos os recursos.'
    },
    {
      pergunta: 'Funciona offline?',
      resposta: 'O sistema funciona online, mas você pode visualizar dados já carregados mesmo sem internet. Recomendamos uma conexão estável para melhor experiência.'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                eBarber
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#funcionalidades" className="text-gray-700 hover:text-purple-600 transition">Funcionalidades</a>
              <a href="#precos" className="text-gray-700 hover:text-purple-600 transition">Preços</a>
              <a href="#depoimentos" className="text-gray-700 hover:text-purple-600 transition">Depoimentos</a>
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition">
                Entrar
              </Link>
              <a
                href="#demo"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition transform hover:scale-105"
              >
                Solicitar Demo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 pt-2 pb-4 space-y-3">
              <a href="#funcionalidades" className="block text-gray-700 hover:text-purple-600 py-2">Funcionalidades</a>
              <a href="#precos" className="block text-gray-700 hover:text-purple-600 py-2">Preços</a>
              <a href="#depoimentos" className="block text-gray-700 hover:text-purple-600 py-2">Depoimentos</a>
              <Link href="/login" className="block text-purple-600 font-medium py-2">
                Entrar
              </Link>
              <a
                href="#demo"
                className="block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg text-center"
              >
                Solicitar Demo
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-purple-100 text-purple-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                🚀 O futuro da gestão de barbearias
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Transforme sua barbearia com
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> tecnologia</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Sistema completo de gestão para barbearias modernas. Agendamento online, controle financeiro, gestão de equipe e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#demo"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:shadow-xl transition transform hover:scale-105 text-center"
                >
                  Solicitar Demo Gratuita
                </a>
                <Link
                  href="/login"
                  className="border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg font-medium hover:bg-purple-50 transition text-center"
                >
                  Ver Sistema
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-8">
                <div>
                  <div className="text-2xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">Barbearias ativas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">50mil+</div>
                  <div className="text-sm text-gray-600">Agendamentos/mês</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">4.9⭐</div>
                  <div className="text-sm text-gray-600">Avaliação</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition">
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-600">Dashboard</div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Receita Hoje</div>
                      <div className="text-2xl font-bold text-gray-900">R$ 1.847,00</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-xs text-gray-600">Agendamentos</div>
                        <div className="text-xl font-bold text-gray-900">23</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-xs text-gray-600">Confirmados</div>
                        <div className="text-xl font-bold text-gray-900">19</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <StatsSection />

      {/* História/Sobre */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollAnimation animation="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Como nasceu a eBarber
            </h2>
            <div className="text-lg text-gray-600 space-y-4">
              <p>
                A eBarber nasceu da experiência real de gerenciar uma barbearia. Cansados de planilhas confusas,
                agendamentos em papel e a dificuldade de acompanhar o crescimento do negócio, decidimos criar uma solução.
              </p>
              <p>
                Desenvolvida por barbeiros e desenvolvedores que entendem as necessidades do dia a dia,
                a eBarber é mais do que um software - é uma ferramenta construída por quem vive a realidade das barbearias.
              </p>
              <p className="font-medium text-purple-600">
                Nossa missão é simplificar a gestão para que você possa focar no que realmente importa: seus clientes e seu talento.
              </p>
            </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimation animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="text-xl text-gray-600">
                Recursos completos para otimizar cada aspecto da sua barbearia
              </p>
            </div>
          </ScrollAnimation>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {funcionalidades.map((func, index) => (
              <ScrollAnimation
                key={index}
                animation="zoom-in"
                delay={index * 100}
              >
                <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition group cursor-pointer h-full">
                  <div className={`w-12 h-12 bg-${func.cor}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                    <func.icon className={`text-${func.cor}-600`} size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{func.titulo}</h3>
                  <p className="text-gray-600">{func.descricao}</p>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollAnimation animation="fade-right">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Por que escolher a eBarber?
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Resultados comprovados que fazem a diferença no seu negócio
                </p>
                <div className="grid gap-4">
                  {beneficios.map((beneficio, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-500 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">{beneficio}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollAnimation>
            <ScrollAnimation animation="fade-left" delay={200}>
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl text-center">
                    <Zap className="text-yellow-500 mx-auto mb-2" size={32} />
                    <div className="text-3xl font-bold text-gray-900">80%</div>
                    <div className="text-sm text-gray-600">Menos faltas</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl text-center">
                    <Shield className="text-blue-500 mx-auto mb-2" size={32} />
                    <div className="text-3xl font-bold text-gray-900">100%</div>
                    <div className="text-sm text-gray-600">Seguro</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl text-center">
                    <Smartphone className="text-purple-500 mx-auto mb-2" size={32} />
                    <div className="text-3xl font-bold text-gray-900">24/7</div>
                    <div className="text-sm text-gray-600">Acesso</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl text-center">
                    <Users className="text-green-500 mx-auto mb-2" size={32} />
                    <div className="text-3xl font-bold text-gray-900">45%</div>
                    <div className="text-sm text-gray-600">Mais produtivo</div>
                  </div>
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <ComparacaoSection />

      {/* Preços */}
      <section id="precos" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimation animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Planos para cada momento
              </h2>
              <p className="text-xl text-gray-600">
                Escolha o plano ideal para o seu negócio. Sem taxas ocultas.
              </p>
            </div>
          </ScrollAnimation>

          <div className="grid md:grid-cols-3 gap-8">
            {planos.map((plano, index) => (
              <ScrollAnimation
                key={index}
                animation="zoom-in"
                delay={index * 150}
              >
                <div
                  className={`bg-white rounded-2xl p-8 h-full ${
                    plano.destaque
                      ? 'ring-2 ring-purple-600 shadow-xl scale-105'
                      : 'shadow-sm'
                  }`}
                >
                {plano.destaque && (
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full inline-block mb-4">
                    Mais Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plano.nome}</h3>
                <p className="text-gray-600 mb-6">{plano.descricao}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plano.preco}</span>
                  <span className="text-gray-600">{plano.periodo}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plano.recursos.map((recurso, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
                      <span className="text-gray-700 text-sm">{recurso}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#demo"
                  className={`block text-center py-3 px-6 rounded-lg font-medium transition ${
                    plano.destaque
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Começar Agora
                </a>
              </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ScrollAnimation animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                O que dizem nossos clientes
              </h2>
              <p className="text-xl text-gray-600">
                Histórias reais de quem transformou sua barbearia
              </p>
            </div>
          </ScrollAnimation>

          <div className="grid md:grid-cols-3 gap-8">
            {depoimentos.map((depoimento, index) => (
              <ScrollAnimation
                key={index}
                animation="fade-up"
                delay={index * 100}
              >
                <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition h-full">
                <div className="flex gap-1 mb-4">
                  {[...Array(depoimento.estrelas)].map((_, i) => (
                    <Star key={i} className="text-yellow-400 fill-current" size={20} />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&ldquo;{depoimento.texto}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{depoimento.foto}</div>
                  <div>
                    <div className="font-bold text-gray-900">{depoimento.nome}</div>
                    <div className="text-sm text-gray-600">{depoimento.barbearia}</div>
                  </div>
                </div>
              </div>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <ScrollAnimation animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-gray-600">
                Tire suas dúvidas sobre o eBarber
              </p>
            </div>
          </ScrollAnimation>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollAnimation
                key={index}
                animation="fade-up"
                delay={index * 50}
              >
                <details className="bg-white rounded-lg p-6 shadow-sm group">
                  <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                    {faq.pergunta}
                    <ArrowRight className="text-purple-600 group-open:rotate-90 transition" size={20} />
                  </summary>
                  <p className="mt-4 text-gray-600">{faq.resposta}</p>
                </details>
              </ScrollAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário Demo */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <ScrollAnimation animation="zoom-in">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 md:p-12 text-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Solicite uma Demo Gratuita
              </h2>
              <p className="text-lg text-purple-100">
                Veja o eBarber em ação e descubra como podemos transformar sua barbearia
              </p>
            </div>

            {mensagemEnvio && (
              <div className="bg-green-500 text-white p-4 rounded-lg mb-6 text-center">
                {mensagemEnvio}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="WhatsApp"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Nome da sua barbearia"
                  value={formData.nomeBarbearia}
                  onChange={(e) => setFormData({...formData, nomeBarbearia: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <textarea
                  placeholder="Conte-nos um pouco sobre sua barbearia e suas necessidades"
                  value={formData.mensagem}
                  onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-white text-purple-600 py-4 px-6 rounded-lg font-bold hover:bg-gray-100 transition disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Solicitar Demo Gratuita'}
              </button>
              <p className="text-sm text-purple-100 text-center">
                14 dias de teste grátis • Sem cartão de crédito • Suporte dedicado
              </p>
            </form>
          </div>
          </ScrollAnimation>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                eBarber
              </div>
              <p className="text-gray-400 text-sm">
                O sistema completo de gestão para barbearias modernas.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-white transition">Preços</a></li>
                <li><a href="#demo" className="hover:text-white transition">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
                <li><a href="#" className="hover:text-white transition">Documentação</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 eBarber. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
