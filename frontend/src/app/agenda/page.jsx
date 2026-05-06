'use client'
import { useEffect, useState, useRef } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  addMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { format, startOfWeek, getDay } from 'date-fns';
import { Dialog } from '@headlessui/react';
import Layout from '@/components/Layout';
import CalendarHeader from '@/components/CalendarHeader';
import {
  formatarMoeda,
  formatarDataHoraBrasileira,
  formatarTelefone,
  converterParaDateTimeLocal,
  converterDateTimeLocalParaISO,
} from '@/utils/formatters';
import { messages, formats, locale } from '@/utils/calendar-localization';
import { API_BASE_URL, getAuthHeaders } from '@/services/api';
import PhoneInput from '@/components/PhoneInput';

const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek,
  getDay,
  locales: { 'pt-BR': ptBR },
});

export default function Agenda() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [view, setView] = useState('day');
  const [date, setDate] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [user, setUser] = useState(null);
  const servicoIdCounter = useRef(0);
  const [newEvent, setNewEvent] = useState({
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    funcionarioId: '',
    funcionarioNome: '',
    servicosSelecionados: [],
    servicoNome: '',
    dataHora: '',
    observacoes: '',
    precoTotal: 0,
    metodoPagamento: '',
  });
  const [error, setError] = useState('');
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [showServicoSuggestions, setShowServicoSuggestions] = useState(false);
  const [showFuncionarioSuggestions, setShowFuncionarioSuggestions] =
    useState(false);

  // Inicializar data no cliente
  useEffect(() => {
    setDate(new Date());
  }, []);

  // Carregar dados do usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.autocomplete-container')) {
        setShowClienteSuggestions(false);
        setShowServicoSuggestions(false);
        setShowFuncionarioSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [agendamentosRes, clientesRes, servicosRes, funcionariosRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/agendamentos`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/clientes`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/servicos`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/users`, {
            headers: getAuthHeaders(),
          }),
        ]);

        const agendamentosData = await agendamentosRes.json();
        const clientesData = await clientesRes.json();
        const servicosData = await servicosRes.json();
        const funcionariosData = await funcionariosRes.json();

        let agendamentos = [];
        if (agendamentosData.success && Array.isArray(agendamentosData.data)) {
          agendamentos = agendamentosData.data;
        } else if (Array.isArray(agendamentosData)) {
          agendamentos = agendamentosData;
        } else if (
          agendamentosData.success &&
          agendamentosData.data &&
          typeof agendamentosData.data === 'object'
        ) {
          const possibleArrayKeys = Object.keys(agendamentosData.data).filter(
            (key) => Array.isArray(agendamentosData.data[key])
          );
          if (possibleArrayKeys.length > 0) {
            agendamentos = agendamentosData.data[possibleArrayKeys[0]];
          }
        }

        if (Array.isArray(agendamentos)) {
          const eventosData = agendamentos.map((agendamento) => {
            let servicoNome = 'Serviço';
            if (agendamento.servicos && Array.isArray(agendamento.servicos) && agendamento.servicos.length > 0) {
              if (agendamento.servicos.length === 1) {
                servicoNome = agendamento.servicos[0].servicoId?.nome || 'Serviço';
              } else {
                const nomes = agendamento.servicos
                  .map(s => s.servicoId?.nome)
                  .filter(Boolean);
                servicoNome = nomes.length > 0
                  ? nomes.join(', ')
                  : `${agendamento.servicos.length} serviços`;
              }
            } else {
              servicoNome = agendamento.servicoNome || agendamento.servicoId?.nome || 'Serviço';
            }

            const dataHoraInicio = new Date(agendamento.dataHora);

            // Calcular duração total somando todos os serviços
            let duracaoMin = 0;
            if (agendamento.servicos && Array.isArray(agendamento.servicos) && agendamento.servicos.length > 0) {
              // Somar a duração de todos os serviços
              duracaoMin = agendamento.servicos.reduce((total, servico) => {
                const duracaoServico = servico.servicoId?.duracaoMin || 30;
                return total + duracaoServico;
              }, 0);
            } else {
              // Fallback para agendamentos antigos ou com estrutura diferente
              duracaoMin = agendamento.duracaoMin || agendamento.servicoId?.duracaoMin || 60;
            }

            const dataHoraFim = new Date(dataHoraInicio.getTime() + duracaoMin * 60000);

            return {
              id: agendamento._id,
              title: `${agendamento.clienteNome || 'Cliente'} - ${servicoNome}`,
              start: dataHoraInicio,
              end: dataHoraFim,
              resource: {
                ...agendamento,
                servicoNome:
                  agendamento.servicoNome || agendamento.servicoId?.nome,
                funcionarioNome:
                  agendamento.funcionarioNome || agendamento.funcionarioId?.nome,
                valor:
                  agendamento.preco ||
                  agendamento.valor ||
                  agendamento.servicoPreco ||
                  agendamento.servicoId?.preco ||
                  0,
              },
              allDay: false,
            };
          });

          setEventos(eventosData);
        } else {
          console.error(
            '❌ Dados de agendamentos não são um array:',
            agendamentos
          );
          setError('Estrutura de dados inválida recebida do servidor');
        }

        setClientes(
          clientesData.success && Array.isArray(clientesData.data)
            ? clientesData.data
            : Array.isArray(clientesData)
            ? clientesData
            : []
        );
        setServicos(
          servicosData.success && Array.isArray(servicosData.data)
            ? servicosData.data
            : Array.isArray(servicosData)
            ? servicosData
            : []
        );
        setFuncionarios(
          funcionariosData.success && Array.isArray(funcionariosData.data)
            ? funcionariosData.data.filter(
                (user) => user.role === 'funcionario'
              )
            : Array.isArray(funcionariosData)
            ? funcionariosData.filter((user) => user.role === 'funcionario')
            : []
        );
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        setError(`Erro de conexão: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Funções de manipulação do calendário
  const onNavigate = (newDate) => {
    // Garantir que sempre temos uma data válida
    const validDate =
      newDate && !isNaN(new Date(newDate).getTime())
        ? new Date(newDate)
        : new Date();
    setDate(validDate);
  };

  const onView = (newView) => {
    setView(newView);
  };

  const onSelectEvent = (evento) => {
    setSelectedEvent(evento);
    setIsDetailModalOpen(true);
  };

  const onSelectSlot = (slotInfo) => {
    // Formatar data e hora no timezone local (sem conversão UTC)
    const date = slotInfo.start;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dataHoraLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

    setNewEvent({
      clienteId: '',
      clienteNome: '',
      clienteTelefone: '',
      funcionarioId: '',
      funcionarioNome: '',
      servicosSelecionados: [],
      servicoNome: '',
      dataHora: dataHoraLocal,
      observacoes: '',
      precoTotal: 0,
      metodoPagamento: '',
    });
    setIsCreateModalOpen(true);
  };

  // Função para atualizar o preço quando o serviço é selecionado
  const handleServicoChange = (servicoId) => {
    const servico = servicos.find((s) => s._id === servicoId);
    const preco = servico ? servico.valor : 0;

    setNewEvent({
      ...newEvent,
      servicoId,
      preco,
    });
  };

  // Função para atualizar o preço no edit quando o serviço é alterado
  const handleServicoEditChange = (servicoId) => {
    const servico = servicos.find((s) => s._id === servicoId);
    const preco = servico ? servico.preco : 0;

    setEditingEvent({
      ...editingEvent,
      servicoId,
      preco,
    });
  };

  // Funções para autocomplete
  const handleClienteSelect = (cliente) => {
    setNewEvent({
      ...newEvent,
      clienteId: cliente._id,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone || '',
    });
    setShowClienteSuggestions(false);
  };

  const handleServicoSelect = (servico) => {
    // Adicionar serviço (permitindo duplicatas para casos como "2x Corte")
    servicoIdCounter.current += 1;
    const servicoComId = { ...servico, id: servicoIdCounter.current }; // ID único para permitir duplicatas
    const novosServicos = [...(newEvent.servicosSelecionados || []), servicoComId];
    const novoPrecoTotal = novosServicos.reduce((total, s) => total + (s.preco || 0), 0);

    setNewEvent({
      ...newEvent,
      servicosSelecionados: novosServicos,
      precoTotal: novoPrecoTotal,
      servicoNome: '',
    });
    setShowServicoSuggestions(false);
  };

  const removeServico = (servicoUniqueId) => {
    const novosServicos = (newEvent.servicosSelecionados || []).filter(s => s.id !== servicoUniqueId);
    const novoPrecoTotal = novosServicos.reduce((total, s) => total + (s.preco || 0), 0);
    
    setNewEvent({
      ...newEvent,
      servicosSelecionados: novosServicos,
      precoTotal: novoPrecoTotal,
    });
  };

  const handleFuncionarioSelect = (funcionario) => {
    setNewEvent({
      ...newEvent,
      funcionarioId: funcionario._id,
      funcionarioNome: funcionario.nome,
    });
    setShowFuncionarioSuggestions(false);
  };

  // Filtros para autocomplete
  const filteredClientes = (clientes || []).filter((c) =>
    c && c.nome && c.nome.toLowerCase().includes((newEvent.clienteNome || '').toLowerCase())
  );

  const filteredServicos = (servicos || []).filter((s) =>
    s && s.nome && s.nome.toLowerCase().includes((newEvent.servicoNome || '').toLowerCase())
  );

  const filteredFuncionarios = (funcionarios || []).filter((f) =>
    f && f.nome && f.nome.toLowerCase().includes((newEvent.funcionarioNome || '').toLowerCase())
  );

  // Funções de CRUD
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError(''); // Limpar erros anteriores
    
    // Validações básicas
    if (!newEvent.clienteNome || newEvent.clienteNome.length < 2) {
      setError('Nome do cliente deve ter pelo menos 2 caracteres');
      return;
    }
    
    if (!(newEvent.servicosSelecionados || []).length) {
      setError('Selecione pelo menos um serviço');
      return;
    }
    
    if (!newEvent.funcionarioNome) {
      setError('Digite o nome do funcionário');
      return;
    }
    
    if (!newEvent.dataHora) {
      setError('Selecione uma data e hora');
      return;
    }

    // Verificar se a data é futura (apenas para não-administradores)
    if (user?.role !== 'admin') {
      const selectedDateTime = new Date(newEvent.dataHora);
      const now = new Date();
      if (selectedDateTime <= now) {
        setError('A data deve ser futura');
        return;
      }
    }
    
    try {
      let clienteId = newEvent.clienteId;

      // Se não há clienteId, significa que é um cliente novo
      if (!clienteId && newEvent.clienteNome) {
        // Criar novo cliente
        const clienteResponse = await fetch(`${API_BASE_URL}/api/clientes`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: newEvent.clienteNome,
            telefone: newEvent.clienteTelefone || '',
            ativo: true,
          }),
        });

        if (clienteResponse.ok) {
          const clienteData = await clienteResponse.json();
          clienteId = clienteData.data._id;

          // Atualizar a lista de clientes localmente
          setClientes((prev) => [...prev, clienteData.data]);
        } else {
          const error = await clienteResponse.json();
          alert(`Erro ao criar cliente: ${error.message}`);
          return;
        }
      }

      // Criar serviço se não existe
      let servicoId = newEvent.servicoId;
      if (!servicoId && newEvent.servicoNome) {
        const servicoResponse = await fetch(`${API_BASE_URL}/api/servicos`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: newEvent.servicoNome,
            preco: parseFloat(newEvent.preco) || 0,
            duracaoMin: 30, // padrão
            categoria: 'Outros', // categoria padrão
            comissao: 0, // comissão padrão
            ativo: true,
          }),
        });

        if (servicoResponse.ok) {
          const servicoData = await servicoResponse.json();
          servicoId = servicoData.data._id;

          // Atualizar a lista de serviços localmente
          setServicos((prev) => [...prev, servicoData.data]);
        } else {
          const error = await servicoResponse.json();
          alert(`Erro ao criar serviço: ${error.message}`);
          return;
        }
      }

      // Criar funcionário se não existe
      let funcionarioId = newEvent.funcionarioId;
      if (!funcionarioId && newEvent.funcionarioNome) {
        const funcionarioResponse = await fetch(`${API_BASE_URL}/api/users/funcionario-basico`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: newEvent.funcionarioNome.trim()
          }),
        });

        if (funcionarioResponse.ok) {
          const funcionarioData = await funcionarioResponse.json();
          funcionarioId = funcionarioData.data._id;

          // Atualizar a lista de funcionários localmente
          setFuncionarios((prev) => [...prev, funcionarioData.data]);
        } else {
          const error = await funcionarioResponse.json();
          alert(`Erro ao criar funcionário: ${error.message}`);
          return;
        }
      }

      // Criar agendamento com os IDs (existentes ou recém-criados)
      const agendamentoData = {
        clienteNome: newEvent.clienteNome,
        clienteTelefone: newEvent.clienteTelefone,
        servicos: (newEvent.servicosSelecionados || []).map(s => ({
          servicoId: s._id,
          preco: s.preco,
          comissao: s.comissao || 0
        })),
        funcionarioId: funcionarioId,
        dataHora: converterDateTimeLocalParaISO(newEvent.dataHora),
        observacoes: newEvent.observacoes,
        metodoPagamento: newEvent.metodoPagamento || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/agendamentos`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agendamentoData),
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        // Limpar o formulário
        setNewEvent({
          clienteId: '',
          clienteNome: '',
          clienteTelefone: '',
          funcionarioId: '',
          funcionarioNome: '',
          servicosSelecionados: [],
          servicoNome: '',
          dataHora: '',
          observacoes: '',
          precoTotal: 0,
          metodoPagamento: '',
        });
        setShowClienteSuggestions(false);
        setShowServicoSuggestions(false);
        setShowFuncionarioSuggestions(false);
        // Recarregar dados
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('❌ Erro ao criar agendamento:', error);
      alert('Erro de conexão');
    }
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    try {
      // Converter dataHora para formato ISO antes de enviar
      const dadosParaEnvio = {
        ...editingEvent,
        dataHora: converterDateTimeLocalParaISO(editingEvent.dataHora),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/agendamentos/${editingEvent.id}`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dadosParaEnvio),
        }
      );

      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingEvent(null);
        // Recarregar dados
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao editar agendamento');
      }
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      alert('Erro de conexão');
    }
  };

  const cancelarAgendamento = async (id) => {
    const confirmar = confirm('Deseja cancelar este agendamento?');
    if (!confirmar) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/agendamentos/${id}/cancelar`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        alert('Agendamento cancelado com sucesso');
        setIsDetailModalOpen(false);
        // Recarregar dados
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao cancelar');
      }
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      alert('Erro de conexão');
    }
  };

  const concluirAgendamento = async (id) => {
    const confirmar = confirm('Marcar este agendamento como concluído?');
    if (!confirmar) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/agendamentos/${id}/concluir`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok) {
        alert('Agendamento marcado como concluído');
        setIsDetailModalOpen(false);
        // Recarregar dados
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao concluir');
      }
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error);
      alert('Erro de conexão');
    }
  };

  const editarAgendamento = (evento) => {
    const resource = evento.resource;

    let clienteId = '';
    let funcionarioId = '';
    let servicoId = '';
    let preco = 0;

    if (resource.clienteNome) {
      const clienteEncontrado = clientes.find(
        c => c.nome.toLowerCase() === resource.clienteNome.toLowerCase()
      );
      if (clienteEncontrado) {
        clienteId = clienteEncontrado._id;
      }
    }

    if (resource.funcionarioId) {
      funcionarioId = typeof resource.funcionarioId === 'object'
        ? resource.funcionarioId._id
        : resource.funcionarioId;
    }

    if (resource.servicos && Array.isArray(resource.servicos) && resource.servicos.length > 0) {
      const primeiroServico = resource.servicos[0];
      if (primeiroServico.servicoId) {
        servicoId = typeof primeiroServico.servicoId === 'object'
          ? primeiroServico.servicoId._id
          : primeiroServico.servicoId;
      }
      preco = primeiroServico.preco || 0;
    } else if (resource.servicoId) {
      servicoId = typeof resource.servicoId === 'object'
        ? resource.servicoId._id
        : resource.servicoId;
      preco = resource.valor || resource.preco || 0;
    }

    setEditingEvent({
      id: evento.id,
      clienteId: clienteId,
      funcionarioId: funcionarioId,
      servicoId: servicoId,
      dataHora: converterParaDateTimeLocal(evento.start),
      observacoes: resource.observacoes || '',
      preco: preco,
      metodoPagamento: resource.metodoPagamento || '',
    });
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Função para aplicar estilos aos eventos baseado no status
  const eventPropGetter = (event) => {
    let backgroundColor = '#3b82f6'; // Azul padrão (normal)
    let borderColor = '#2563eb';
    let statusLabel = 'normal';

    if (event.resource.status === 'concluido') {
      backgroundColor = '#10b981'; // Verde
      borderColor = '#059669';
      statusLabel = 'concluido';
    } else if (event.resource.status === 'cancelado') {
      backgroundColor = '#6b7280'; // Cinza
      borderColor = '#4b5563';
      statusLabel = 'cancelado';
    } else {
      // Verificar se está atrasado
      const dataHoraFim = event.end;
      const agora = new Date();
      const limiteAtraso = new Date(dataHoraFim.getTime() + 10 * 60000); // + 10 minutos

      if (agora > limiteAtraso) {
        backgroundColor = '#ef4444'; // Vermelho (atrasado)
        borderColor = '#dc2626';
        statusLabel = 'atrasado';
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: event.resource.status === 'cancelado' ? 0.7 : 0.9,
        textDecoration: event.resource.status === 'cancelado' ? 'line-through' : 'none',
      }
    };
  };

  if (loading || !date) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <CalendarHeader
          title="Agenda"
          subtitle="Gerencie os agendamentos da barbearia"
          date={date}
          view={view}
          mode="calendar"
          onNavigate={onNavigate}
          onViewChange={onView}
          onToday={() => onNavigate(new Date())}
        >
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            + Novo Agendamento
          </button>
        </CalendarHeader>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-2 sm:p-4 md:p-6">
            <Calendar
              localizer={localizer}
              events={eventos}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '70vh', minHeight: 400 }}
              onSelectEvent={onSelectEvent}
              onSelectSlot={onSelectSlot}
              culture="pt-BR"
              messages={messages}
              views={['month', 'week', 'day']}
              view={view}
              date={date}
              onNavigate={onNavigate}
              onView={onView}
              popup
              selectable
              formats={formats}
              components={{
                toolbar: () => null, // Remove default toolbar
              }}
              eventPropGetter={eventPropGetter}
              // Configurações de horário comercial
              min={new Date(2025, 0, 1, 8, 0, 0)} // 08:00
              max={new Date(2025, 0, 1, 20, 0, 0)} // 20:00
              step={30} // Intervalos de 30 minutos
              timeslots={1} // Quantidade de slots por step (1 = 30min)
            />
          </div>
        </div>

        {/* Modal de Detalhes */}
        <Dialog
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white max-w-md w-full p-6 rounded-lg shadow-xl">
              <Dialog.Title className="text-xl font-bold mb-4 text-gray-900">
                Detalhes do Agendamento
              </Dialog.Title>
              {selectedEvent && (
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Cliente:</span>
                    <p className="text-gray-900">
                      {selectedEvent.resource.clienteNome}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Serviço
                      {selectedEvent.resource.servicos?.length > 1 ? 's' : ''}:
                    </span>
                    {selectedEvent.resource.servicos &&
                    Array.isArray(selectedEvent.resource.servicos) ? (
                      <div className="space-y-1 mt-1">
                        {selectedEvent.resource.servicos.map(
                          (servico, index) => {
                            const nomeServico =
                              servico.servicoId?.nome ||
                              servico.nome ||
                              servico.servicoNome ||
                              'Serviço';
                            const categoria =
                              servico.servicoId?.categoria ||
                              servico.categoria ||
                              '';
                            const precoServico =
                              servico.preco || servico.servicoId?.preco || 0;
                            return (
                              <div
                                key={index}
                                className="text-gray-900 bg-gray-50 p-2 rounded"
                              >
                                <div className="font-medium">
                                  {nomeServico}
                                  {categoria && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({categoria})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatarMoeda(precoServico)}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900">
                        {selectedEvent.resource.servicoNome ||
                          'Serviço não informado'}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Funcionário:
                    </span>
                    <p className="text-gray-900">
                      {selectedEvent.resource.funcionarioNome}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Telefone:</span>
                    <p className="text-gray-900">
                      {formatarTelefone(selectedEvent.resource.clienteTelefone)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Data e Hora:
                    </span>
                    <p className="text-gray-900">
                      {formatarDataHoraBrasileira(selectedEvent.start)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Valor Total:
                    </span>
                    <p className="text-gray-900 font-semibold">
                      {formatarMoeda(
                        selectedEvent.resource.servicos &&
                          Array.isArray(selectedEvent.resource.servicos)
                          ? selectedEvent.resource.servicos.reduce(
                              (total, s) =>
                                total + (s.preco || s.servicoId?.preco || 0),
                              0
                            )
                          : selectedEvent.resource.valor ||
                              selectedEvent.resource.precoTotal ||
                              0
                      )}
                    </p>
                  </div>
                  {selectedEvent.resource.metodoPagamento && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Forma de Pagamento:
                      </span>
                      <p className="text-gray-900">
                        {selectedEvent.resource.metodoPagamento ===
                          'dinheiro' && '💵 Dinheiro'}
                        {selectedEvent.resource.metodoPagamento === 'pix' &&
                          '📱 Pix'}
                        {selectedEvent.resource.metodoPagamento ===
                          'cartao_credito' && '💳 Cartão de Crédito'}
                        {selectedEvent.resource.metodoPagamento ===
                          'cartao_debito' && '💳 Cartão de Débito'}
                        {selectedEvent.resource.metodoPagamento === 'outros' &&
                          'Outros'}
                      </p>
                    </div>
                  )}
                  {selectedEvent.resource.observacoes && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Observações:
                      </span>
                      <p className="text-gray-900">
                        {selectedEvent.resource.observacoes}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                        selectedEvent.resource.status === 'concluido'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedEvent.resource.status === 'confirmado'
                          ? 'bg-green-100 text-green-800'
                          : selectedEvent.resource.status === 'cancelado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedEvent.resource.status === 'concluido'
                        ? 'Concluído'
                        : selectedEvent.resource.status}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-6">
                {/* Botão Editar - admin sempre pode editar, outros usuários só se não estiver concluído ou cancelado */}
                {(user?.role === 'admin' ||
                  (user?.role !== 'admin' &&
                    selectedEvent?.resource?.status !== 'concluido' &&
                    selectedEvent?.resource?.status !== 'cancelado')) && (
                  <button
                    onClick={() => editarAgendamento(selectedEvent)}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Editar
                  </button>
                )}
                {/* Botão Marcar como Concluído - todos podem usar se não estiver concluído/cancelado */}
                {selectedEvent?.resource?.status !== 'concluido' &&
                  selectedEvent?.resource?.status !== 'cancelado' && (
                    <button
                      onClick={() => concluirAgendamento(selectedEvent.id)}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Marcar como Concluído
                    </button>
                  )}
                {/* Botão Cancelar - admin sempre pode, outros usuários só se não estiver concluído ou cancelado */}
                {(user?.role === 'admin' ||
                  (user?.role !== 'admin' &&
                    selectedEvent?.resource?.status !== 'concluido' &&
                    selectedEvent?.resource?.status !== 'cancelado')) && (
                  <button
                    onClick={() => cancelarAgendamento(selectedEvent.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Fechar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Criação */}
        <Dialog
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
            <Dialog.Panel className="bg-white max-w-md w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <Dialog.Title className="text-lg font-bold text-gray-900">
                  🎯 Novo Agendamento
                </Dialog.Title>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                    {error}
                  </div>
                )}

                <form id="agendamento-form" onSubmit={handleCreateEvent} className="space-y-3">
                {/* Cliente */}
                <div className="relative autocomplete-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={newEvent.clienteNome}
                    onChange={(e) => {
                      setNewEvent({
                        ...newEvent,
                        clienteNome: e.target.value,
                        clienteId: '',
                      });
                      setShowClienteSuggestions(true);
                    }}
                    onFocus={() => setShowClienteSuggestions(true)}
                    placeholder="Digite o nome do cliente"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    required
                  />
                  {newEvent.clienteNome && !newEvent.clienteId && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Cliente novo será criado automaticamente
                    </p>
                  )}
                  {showClienteSuggestions && filteredClientes.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                      {filteredClientes.map((cliente) => (
                        <div
                          key={cliente._id}
                          onClick={() => handleClienteSelect(cliente)}
                          className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{cliente.nome}</div>
                          <div className="text-sm text-gray-500">
                            {cliente.telefone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📱 Telefone
                  </label>
                  <PhoneInput
                    value={newEvent.clienteTelefone}
                    onChange={(value) =>
                      setNewEvent({
                        ...newEvent,
                        clienteTelefone: value,
                      })
                    }
                    placeholder="(00) 00000-0000"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Serviços */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Serviços *
                  </label>

                  {/* Serviços selecionados */}
                  {(newEvent.servicosSelecionados || []).length > 0 && (
                    <div className="space-y-2 max-h-20 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                      {(newEvent.servicosSelecionados || []).map((servico) => (
                        <div
                          key={servico.id}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded border border-green-200"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {servico.nome}
                            </span>
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              R$ {servico.preco?.toFixed(2) || '0,00'} • {servico.duracaoMin || 30} min
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeServico(servico.id)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input para adicionar serviços */}
                  <div className="relative autocomplete-container">
                    <input
                      type="text"
                      value={newEvent.servicoNome}
                      onChange={(e) => {
                        setNewEvent({
                          ...newEvent,
                          servicoNome: e.target.value,
                        });
                        setShowServicoSuggestions(true);
                      }}
                      onFocus={() => setShowServicoSuggestions(true)}
                      placeholder="Digite para adicionar um serviço"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    />
                    {showServicoSuggestions && filteredServicos.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {filteredServicos.map((servico) => (
                          <div
                            key={servico._id}
                            onClick={() => handleServicoSelect(servico)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium">{servico.nome}</div>
                            <div className="text-sm text-gray-500">
                              R$ {servico.preco?.toFixed(2) || '0,00'} •{' '}
                              {servico.duracaoMin || 30} min
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Funcionário */}
                <div className="relative autocomplete-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Funcionário *
                  </label>
                  <input
                    type="text"
                    value={newEvent.funcionarioNome}
                    onChange={(e) => {
                      setNewEvent({
                        ...newEvent,
                        funcionarioNome: e.target.value,
                        funcionarioId: '',
                      });
                      setShowFuncionarioSuggestions(true);
                    }}
                    onFocus={() => setShowFuncionarioSuggestions(true)}
                    placeholder="Digite o nome do funcionário ou selecione existente"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                    required
                  />
                  {newEvent.funcionarioNome && !newEvent.funcionarioId && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Novo funcionário será criado automaticamente
                    </p>
                  )}
                  {showFuncionarioSuggestions &&
                    filteredFuncionarios.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {filteredFuncionarios.map((funcionario) => (
                          <div
                            key={funcionario._id}
                            onClick={() => handleFuncionarioSelect(funcionario)}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium">
                              {funcionario.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              {funcionario.role}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Data e Hora Separados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📅 Data
                    </label>
                    <input
                      type="date"
                      value={
                        newEvent.dataHora ? newEvent.dataHora.split('T')[0] : ''
                      }
                      onChange={(e) => {
                        const dataAtual = newEvent.dataHora || '';
                        const horaAtual = dataAtual.includes('T')
                          ? dataAtual.split('T')[1]
                          : '09:00';
                        setNewEvent({
                          ...newEvent,
                          dataHora: `${e.target.value}T${horaAtual}`,
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🕐 Hora
                    </label>
                    <input
                      type="time"
                      value={
                        newEvent.dataHora && newEvent.dataHora.includes('T')
                          ? newEvent.dataHora.split('T')[1]
                          : '09:00'
                      }
                      onChange={(e) => {
                        const dataAtual = newEvent.dataHora || '';
                        const dataBase = dataAtual.includes('T')
                          ? dataAtual.split('T')[0]
                          : new Date().toISOString().split('T')[0];
                        setNewEvent({
                          ...newEvent,
                          dataHora: `${dataBase}T${e.target.value}`,
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💳 Forma de Pagamento
                  </label>
                  <select
                    value={newEvent.metodoPagamento}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        metodoPagamento: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Selecione a forma de pagamento</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="pix">📱 Pix</option>
                    <option value="cartao_credito">💳 Cartão de Crédito</option>
                    <option value="cartao_debito">💳 Cartão de Débito</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={newEvent.observacoes}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, observacoes: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                    rows={2}
                  />
                </div>

                {/* Total dos Serviços */}
                {(newEvent.servicosSelecionados || []).length > 0 && (
                  <div className="flex justify-between items-center p-2 bg-amber-50 border border-amber-200 rounded">
                    <span className="text-xs font-medium text-gray-700">
                      Total ({(newEvent.servicosSelecionados || []).length} serviço{(newEvent.servicosSelecionados || []).length !== 1 ? 's' : ''})
                    </span>
                    <span className="text-lg font-bold text-amber-600">
                      R$ {newEvent.precoTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                </form>
              </div>

              {/* Footer com botões */}
              <div className="border-t border-gray-200 p-3 bg-gray-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setNewEvent({
                        clienteId: '',
                        clienteNome: '',
                        clienteTelefone: '',
                        funcionarioId: '',
                        funcionarioNome: '',
                        servicosSelecionados: [],
                        servicoNome: '',
                        dataHora: '',
                        observacoes: '',
                        precoTotal: 0,
                        metodoPagamento: '',
                      });
                      setShowClienteSuggestions(false);
                      setShowServicoSuggestions(false);
                      setShowFuncionarioSuggestions(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="agendamento-form"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    Criar Agendamento
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white max-w-md w-full p-6 rounded-lg shadow-xl">
              <Dialog.Title className="text-xl font-bold mb-4 text-gray-900">
                Editar Agendamento
              </Dialog.Title>
              {editingEvent && (
                <>
                  {/* Aviso se não for admin e agendamento estiver concluído/cancelado */}
                  {user?.role !== 'admin' &&
                    (selectedEvent?.resource?.status === 'concluido' ||
                      selectedEvent?.resource?.status === 'cancelado') && (
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <p className="text-sm font-medium">
                          ⚠️ Apenas administradores podem editar agendamentos{' '}
                          {selectedEvent?.resource?.status === 'concluido'
                            ? 'concluídos'
                            : 'cancelados'}
                        </p>
                      </div>
                    )}
                  <form onSubmit={handleEditEvent} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente
                      </label>
                      <select
                        value={editingEvent.clienteId}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            clienteId: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                          <option key={cliente._id} value={cliente._id}>
                            {cliente.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Serviço
                      </label>
                      <select
                        value={editingEvent.servicoId}
                        onChange={(e) =>
                          handleServicoEditChange(e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                        required
                      >
                        <option value="">Selecione um serviço</option>
                        {servicos.map((servico) => (
                          <option key={servico._id} value={servico._id}>
                            {servico.nome} - {formatarMoeda(servico.preco)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Funcionário
                      </label>
                      <select
                        value={editingEvent.funcionarioId}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            funcionarioId: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                        required
                      >
                        <option value="">Selecione um funcionário</option>
                        {funcionarios.map((funcionario) => (
                          <option key={funcionario._id} value={funcionario._id}>
                            {funcionario.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Data e Hora Separados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📅 Data
                        </label>
                        <input
                          type="date"
                          value={
                            editingEvent.dataHora
                              ? editingEvent.dataHora.split('T')[0]
                              : ''
                          }
                          onChange={(e) => {
                            const dataAtual = editingEvent.dataHora || '';
                            const horaAtual = dataAtual.includes('T')
                              ? dataAtual.split('T')[1]
                              : '09:00';
                            setEditingEvent({
                              ...editingEvent,
                              dataHora: `${e.target.value}T${horaAtual}`,
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          🕐 Hora
                        </label>
                        <input
                          type="time"
                          value={
                            editingEvent.dataHora &&
                            editingEvent.dataHora.includes('T')
                              ? editingEvent.dataHora.split('T')[1]
                              : '09:00'
                          }
                          onChange={(e) => {
                            const dataAtual = editingEvent.dataHora || '';
                            const dataBase = dataAtual.includes('T')
                              ? dataAtual.split('T')[0]
                              : new Date().toISOString().split('T')[0];
                            setEditingEvent({
                              ...editingEvent,
                              dataHora: `${dataBase}T${e.target.value}`,
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        💳 Forma de Pagamento
                      </label>
                      <select
                        value={editingEvent.metodoPagamento || ''}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            metodoPagamento: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Selecione a forma de pagamento</option>
                        <option value="dinheiro">💵 Dinheiro</option>
                        <option value="pix">📱 Pix</option>
                        <option value="cartao_credito">
                          💳 Cartão de Crédito
                        </option>
                        <option value="cartao_debito">
                          💳 Cartão de Débito
                        </option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={editingEvent.observacoes}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            observacoes: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                        rows={3}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={
                          user?.role !== 'admin' &&
                          (selectedEvent?.resource?.status === 'concluido' ||
                            selectedEvent?.resource?.status === 'cancelado')
                        }
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </>
              )}
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
}
