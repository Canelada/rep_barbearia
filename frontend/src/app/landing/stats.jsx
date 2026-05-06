'use client'
import { useState, useEffect, useRef } from 'react'
import ScrollAnimation from '@/components/ScrollAnimation'

function CountUp({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let start = 0
          const increment = end / (duration / 16)

          const timer = setInterval(() => {
            start += increment
            if (start >= end) {
              setCount(end)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start))
            }
          }, 16)

          return () => clearInterval(timer)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [end, duration, hasAnimated])

  return (
    <span ref={ref}>
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  )
}

export default function StatsSection() {
  const stats = [
    {
      icon: '🏪',
      value: 500,
      suffix: '+',
      label: 'Barbearias Ativas',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '📅',
      value: 50000,
      suffix: '+',
      label: 'Agendamentos/Mês',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: '👥',
      value: 2000,
      suffix: '+',
      label: 'Profissionais Cadastrados',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '⭐',
      value: 4.9,
      suffix: '/5',
      label: 'Avaliação dos Usuários',
      color: 'from-yellow-500 to-yellow-600'
    }
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollAnimation animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Números que impressionam
            </h2>
            <p className="text-xl text-purple-100">
              Resultados reais de quem confia no eBarber
            </p>
          </div>
        </ScrollAnimation>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <ScrollAnimation
              key={index}
              animation="zoom-in"
              delay={index * 150}
            >
              <div className="relative group">
                {/* Card */}
                <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                  {/* Icon */}
                  <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>

                  {/* Value */}
                  <div className={`text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </div>

                  {/* Label */}
                  <div className="text-purple-100 font-medium">
                    {stat.label}
                  </div>
                </div>

                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-20 blur-xl rounded-2xl transition-opacity duration-300 -z-10`} />
              </div>
            </ScrollAnimation>
          ))}
        </div>

        <ScrollAnimation animation="fade-up" delay={600}>
          <div className="mt-16 text-center">
            <p className="text-xl text-purple-100 mb-6">
              Junte-se a centenas de barbearias que já transformaram seu negócio
            </p>
            <a
              href="#demo"
              className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-bold hover:shadow-2xl transition-all transform hover:scale-105"
            >
              Comece Gratuitamente Agora
            </a>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  )
}
