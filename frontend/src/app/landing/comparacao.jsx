'use client'
import React from 'react'
import { Check, X } from 'lucide-react'
import ScrollAnimation from '@/components/ScrollAnimation'

export default function ComparacaoSection() {
  const recursos = [
    {
      categoria: 'Agendamento',
      items: [
        { nome: 'Agendamento Online 24/7', ebarber: true, planilhas: false, outros: true },
        { nome: 'Lembretes Automáticos WhatsApp', ebarber: true, planilhas: false, outros: false },
        { nome: 'Confirmação Automática', ebarber: true, planilhas: false, outros: true },
        { nome: 'Reagendamento Fácil', ebarber: true, planilhas: false, outros: true },
      ]
    },
    {
      categoria: 'Financeiro',
      items: [
        { nome: 'Controle de Caixa Automático', ebarber: true, planilhas: false, outros: true },
        { nome: 'Cálculo de Comissões', ebarber: true, planilhas: false, outros: true },
        { nome: '11+ Tipos de Relatórios', ebarber: true, planilhas: false, outros: false },
        { nome: 'Análise de Lucro em Tempo Real', ebarber: true, planilhas: false, outros: false },
      ]
    },
    {
      categoria: 'Gestão',
      items: [
        { nome: 'Controle de Estoque', ebarber: true, planilhas: false, outros: true },
        { nome: 'Gestão de Funcionários', ebarber: true, planilhas: true, outros: true },
        { nome: 'Histórico de Clientes', ebarber: true, planilhas: true, outros: true },
        { nome: 'Programa de Fidelidade', ebarber: true, planilhas: false, outros: false },
      ]
    },
    {
      categoria: 'Tecnologia',
      items: [
        { nome: 'Acesso Mobile Responsivo', ebarber: true, planilhas: false, outros: true },
        { nome: 'Backup Automático', ebarber: true, planilhas: false, outros: true },
        { nome: 'Atualizações Gratuitas', ebarber: true, planilhas: true, outros: false },
        { nome: 'Suporte Dedicado', ebarber: true, planilhas: false, outros: true },
      ]
    }
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <ScrollAnimation animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o eBarber?
            </h2>
            <p className="text-xl text-gray-600">
              Veja como nos comparamos com outras soluções do mercado
            </p>
          </div>
        </ScrollAnimation>

        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <th className="px-6 py-4 text-left font-semibold">Recursos</th>
                <th className="px-6 py-4 text-center font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">⭐</span>
                    <span>eBarber</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">📊</span>
                    <span>Planilhas</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">💼</span>
                    <span>Outros Sistemas</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {recursos.map((categoria, catIndex) => (
                <React.Fragment key={`cat-${catIndex}`}>
                  <tr className="bg-gray-50">
                    <td colSpan="4" className="px-6 py-3 font-bold text-gray-900">
                      {categoria.categoria}
                    </td>
                  </tr>
                  {categoria.items.map((item, itemIndex) => (
                    <tr
                      key={`item-${catIndex}-${itemIndex}`}
                      className="border-b border-gray-100 hover:bg-purple-50 transition"
                    >
                      <td className="px-6 py-4 text-gray-700">{item.nome}</td>
                      <td className="px-6 py-4 text-center">
                        {item.ebarber ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <Check className="text-green-600" size={20} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                            <X className="text-red-600" size={20} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.planilhas ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <Check className="text-green-600" size={20} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                            <X className="text-red-600" size={20} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.outros ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <Check className="text-green-600" size={20} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                            <X className="text-red-600" size={20} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <ScrollAnimation animation="zoom-in" delay={500}>
          <div className="mt-12 text-center">
            <div className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🏆</div>
                <div className="text-left">
                  <div className="text-sm opacity-90">Melhor custo-benefício</div>
                  <div className="text-2xl font-bold">eBarber é a escolha certa</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={700}>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl mb-3">💰</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">Até 70%</div>
              <div className="text-gray-600">mais barato que contratar um contador</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl mb-3">⏱️</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">5 horas/semana</div>
              <div className="text-gray-600">economizadas em trabalho manual</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl mb-3">📈</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">35%</div>
              <div className="text-gray-600">aumento médio no faturamento</div>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  )
}
