'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/services/api'

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const [servicos, setServicos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [horarios, setHorarios] = useState([])

  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [data, setData] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const resServicos = await fetch(`${API_BASE_URL}/api/servicos`, {
          credentials: 'include'
        });
        const resUsuarios = await fetch(`${API_BASE_URL}/api/users`, {
          credentials: 'include'
        });

        const s = await resServicos.json();
        const u = await resUsuarios.json();

        if (s.success) {
          setServicos(s.data || []);
        }

        if (u.success) {
          setFuncionarios(
            u.data?.filter((user) => user.role === 'funcionario') || []
          );
        }
      } catch {
        // Erro silencioso
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function fetchHorarios() {
      if (data && funcionarioId && servicoId) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/agendamentos/horarios-disponiveis?data=${data}&funcionarioId=${funcionarioId}&servicoId=${servicoId}`,
            { credentials: 'include' }
          );
          const h = await res.json();
          if (h.success) {
            setHorarios(h.data || []);
          }
        } catch (error) {
          console.error('❌ Erro ao buscar horários:', error);
        }
      }
    }
    fetchHorarios()
  }, [data, funcionarioId, servicoId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!horarioSelecionado) return alert('Selecione um horário')

    try {
      const res = await fetch(`${API_BASE_URL}/api/agendamentos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome,
          clienteTelefone,
          servicoId,
          funcionarioId,
          dataHora: horarioSelecionado,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Agendamento criado com sucesso');
        router.push('/agenda');
      } else {
        alert(data.message || 'Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('❌ Erro ao criar agendamento:', error);
      alert('Erro ao criar agendamento');
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Novo Agendamento</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" className="w-full p-2 border rounded" required />
        <input type="tel" value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="Telefone do cliente" className="w-full p-2 border rounded" />

        <select value={servicoId} onChange={e => setServicoId(e.target.value)} className="w-full p-2 border rounded" required>
          <option value="">Selecione um serviço</option>
          {servicos.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
        </select>

        <select value={funcionarioId} onChange={e => setFuncionarioId(e.target.value)} className="w-full p-2 border rounded" required>
          <option value="">Selecione um funcionário</option>
          {funcionarios.map(f => <option key={f._id} value={f._id}>{f.nome}</option>)}
        </select>

        <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full p-2 border rounded" required />

        <select value={horarioSelecionado} onChange={e => setHorarioSelecionado(e.target.value)} className="w-full p-2 border rounded" required>
          <option value="">Selecione um horário</option>
          {horarios.map((h, i) => (
            <option key={i} value={h}>{new Date(h).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>
          ))}
        </select>

        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Agendar</button>
      </form>
    </div>
  )
}
