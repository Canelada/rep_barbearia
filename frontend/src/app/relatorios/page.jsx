'use client'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import Layout from '@/components/Layout';
import CalendarHeader from '@/components/CalendarHeader';
import { API_BASE_URL } from '@/services/api';

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('financeiro');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [email, setEmail] = useState('');
  const [formato, setFormato] = useState('xlsx');
  const [tipoRelatorio, setTipoRelatorio] = useState('completo');
  const [gerando, setGerando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  const tiposRelatorio = {
    financeiro: [
      { id: 'completo', nome: 'Relatório Completo', desc: 'Todas as movimentações financeiras do período' },
      { id: 'caixa', nome: 'Movimentação de Caixa', desc: 'Entradas e saídas diárias do caixa' },
      { id: 'receita', nome: 'Relatório de Receita', desc: 'Faturamento por serviços e produtos' },
      { id: 'comissoes', nome: 'Comissões dos Funcionários', desc: 'Comissões calculadas por funcionário' }
    ],
    operacional: [
      { id: 'agendamentos', nome: 'Relatório de Agendamentos', desc: 'Histórico completo de agendamentos' },
      { id: 'servicos', nome: 'Serviços Realizados', desc: 'Detalhes dos serviços executados' },
      { id: 'funcionarios', nome: 'Performance dos Funcionários', desc: 'Produtividade e atendimentos' },
      { id: 'clientes', nome: 'Base de Clientes', desc: 'Dados e histórico dos clientes' }
    ],
    estoque: [
      { id: 'produtos', nome: 'Relatório de Estoque', desc: 'Situação atual do estoque' },
      { id: 'movimentacao', nome: 'Movimentação de Produtos', desc: 'Entradas e saídas de produtos' },
      { id: 'baixo_estoque', nome: 'Produtos em Falta', desc: 'Itens que precisam de reposição' }
    ]
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const gerarXLSX = (dados) => {
    const wb = XLSX.utils.book_new();

    // Criar planilha com resumo executivo
    const resumoData = [
      [dados.titulo],
      ['Período:', `${format(new Date(dados.periodo.inicio), 'dd/MM/yyyy')} até ${format(new Date(dados.periodo.fim), 'dd/MM/yyyy')}`],
      [],
      ['RESUMO EXECUTIVO'],
      []
    ];

    // Adicionar dados de resumo baseado no tipo
    if (dados.resumo) {
      // Dados financeiros
      if (dados.resumo.totalEntradas !== undefined) {
        resumoData.push(['FINANCEIRO']);
        resumoData.push(['Total de Entradas:', formatarMoeda(dados.resumo.totalEntradas)]);
        resumoData.push(['Total de Saídas:', formatarMoeda(dados.resumo.totalSaidas)]);
        resumoData.push(['Total de Despesas:', formatarMoeda(dados.resumo.totalDespesas)]);
        resumoData.push(['Saldo Final:', formatarMoeda(dados.resumo.saldoFinal)]);
        resumoData.push([]);
      }

      // Dados de agendamentos
      if (dados.resumo.totalAgendamentos !== undefined) {
        resumoData.push(['AGENDAMENTOS']);
        resumoData.push(['Total de Agendamentos:', dados.resumo.totalAgendamentos]);
        resumoData.push(['Faturamento Total:', formatarMoeda(dados.resumo.faturamentoTotal)]);
        resumoData.push(['Ticket Médio:', formatarMoeda(dados.resumo.ticketMedio)]);
        resumoData.push([]);
      }

      // Dados de comissões
      if (dados.resumo.totalComissoes !== undefined) {
        resumoData.push(['COMISSÕES']);
        resumoData.push(['Total de Comissões:', formatarMoeda(dados.resumo.totalComissoes)]);
        resumoData.push([]);
      }

      // Outros dados
      if (dados.resumo.totalFuncionarios !== undefined) {
        resumoData.push(['OUTROS']);
        resumoData.push(['Total de Funcionários:', dados.resumo.totalFuncionarios]);
        resumoData.push(['Total de Clientes:', dados.resumo.totalClientes]);
      }
    }

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Para relatório completo, criar planilhas detalhadas
    if (tipoRelatorio === 'completo' && dados.agendamentos && dados.agendamentos.length > 0) {
      // 1. Agendamentos Detalhados com todos os serviços
      const agendamentosDetalhados = [];
      dados.agendamentos.forEach(a => {
        if (a.servicos && a.servicos.length > 0) {
          // Para cada serviço no agendamento
          a.servicos.forEach((servico, idx) => {
            agendamentosDetalhados.push({
              'Data': a.data ? format(new Date(a.data), 'dd/MM/yyyy HH:mm') : 'N/A',
              'Cliente': a.cliente || 'N/A',
              'Telefone': a.telefone || 'N/A',
              'Funcionário': a.funcionario || 'N/A',
              'Serviço': servico.nome || 'N/A',
              'Valor Serviço': formatarMoeda(servico.preco),
              'Comissão %': `${servico.comissao}%`,
              'Valor Comissão': formatarMoeda(servico.comissaoValor),
              'Valor Total Agend.': idx === 0 ? formatarMoeda(a.valorTotal) : '',
              'Comissão Total Agend.': idx === 0 ? formatarMoeda(a.comissaoTotal) : '',
              'Método Pagamento': idx === 0 ? a.metodoPagamento : '',
              'Status': idx === 0 ? a.status : ''
            });
          });
        } else {
          // Agendamento sem serviços detalhados
          agendamentosDetalhados.push({
            'Data': a.dataHora ? format(new Date(a.dataHora), 'dd/MM/yyyy HH:mm') : (a.data ? format(new Date(a.data), 'dd/MM/yyyy HH:mm') : 'N/A'),
            'Cliente': a.clienteId?.nome || a.cliente || 'N/A',
            'Telefone': a.clienteId?.telefone || a.telefone || 'N/A',
            'Funcionário': a.funcionarioId?.nome || a.funcionario || 'N/A',
            'Serviço': a.servico || 'N/A',
            'Valor Serviço': formatarMoeda(a.preco),
            'Comissão %': 'N/A',
            'Valor Comissão': 'N/A',
            'Valor Total Agend.': formatarMoeda(a.preco),
            'Comissão Total Agend.': 'N/A',
            'Método Pagamento': a.metodoPagamento || 'N/A',
            'Status': a.status
          });
        }
      });
      const wsAgendamentos = XLSX.utils.json_to_sheet(agendamentosDetalhados);
      XLSX.utils.book_append_sheet(wb, wsAgendamentos, 'Agendamentos');

      // 2. Comissões por Funcionário
      if (dados.comissoes && dados.comissoes.length > 0) {
        const comissoesData = [];
        dados.comissoes.forEach(func => {
          // Adicionar resumo do funcionário
          comissoesData.push({
            'Funcionário': func.funcionario,
            'Total Atendimentos': func.atendimentos,
            'Faturamento Total': formatarMoeda(func.faturamento),
            'Comissão Total': formatarMoeda(func.comissaoTotal),
            'Serviço': '',
            'Valor Serviço': '',
            'Comissão Serviço': ''
          });

          // Adicionar cada serviço realizado
          if (func.servicos && func.servicos.length > 0) {
            func.servicos.forEach(servico => {
              comissoesData.push({
                'Funcionário': '',
                'Total Atendimentos': '',
                'Faturamento Total': '',
                'Comissão Total': '',
                'Serviço': servico.nome,
                'Valor Serviço': formatarMoeda(servico.valor),
                'Comissão Serviço': formatarMoeda(servico.comissao)
              });
            });
          }

          // Linha em branco entre funcionários
          comissoesData.push({
            'Funcionário': '',
            'Total Atendimentos': '',
            'Faturamento Total': '',
            'Comissão Total': '',
            'Serviço': '',
            'Valor Serviço': '',
            'Comissão Serviço': ''
          });
        });
        const wsComissoes = XLSX.utils.json_to_sheet(comissoesData);
        XLSX.utils.book_append_sheet(wb, wsComissoes, 'Comissões');
      }

      // 3. Despesas Detalhadas
      if (dados.despesas && dados.despesas.length > 0) {
        const despesasData = dados.despesas.map(d => ({
          'Data': d.data || 'N/A',
          'Descrição': d.descricao || 'N/A',
          'Categoria': d.categoria || 'N/A',
          'Valor': formatarMoeda(d.valor),
          'Responsável': d.responsavel || 'N/A'
        }));
        const wsDespesas = XLSX.utils.json_to_sheet(despesasData);
        XLSX.utils.book_append_sheet(wb, wsDespesas, 'Despesas');
      }

      // 4. Fluxo de Caixa Detalhado
      if (dados.movimentacoesCaixa && dados.movimentacoesCaixa.length > 0) {
        const caixaData = [];
        dados.movimentacoesCaixa.forEach(caixa => {
          // Resumo do dia
          caixaData.push({
            'Data': caixa.data || 'N/A',
            'Tipo': 'RESUMO DO DIA',
            'Descrição': 'Saldo Inicial',
            'Valor': formatarMoeda(caixa.saldoInicial)
          });

          // Entradas
          if (caixa.entradas && caixa.entradas.length > 0) {
            caixa.entradas.forEach(entrada => {
              caixaData.push({
                'Data': '',
                'Tipo': 'ENTRADA',
                'Descrição': entrada.descricao || 'Entrada',
                'Valor': formatarMoeda(entrada.valor)
              });
            });
          }

          // Saídas
          if (caixa.saidas && caixa.saidas.length > 0) {
            caixa.saidas.forEach(saida => {
              caixaData.push({
                'Data': '',
                'Tipo': 'SAÍDA',
                'Descrição': saida.descricao || 'Saída',
                'Valor': formatarMoeda(saida.valor)
              });
            });
          }

          // Totais do dia
          caixaData.push({
            'Data': '',
            'Tipo': 'TOTAL',
            'Descrição': 'Total Entradas',
            'Valor': formatarMoeda(caixa.totalEntradas)
          });
          caixaData.push({
            'Data': '',
            'Tipo': 'TOTAL',
            'Descrição': 'Total Saídas',
            'Valor': formatarMoeda(caixa.totalSaidas)
          });
          caixaData.push({
            'Data': '',
            'Tipo': 'TOTAL',
            'Descrição': 'Saldo Final',
            'Valor': formatarMoeda(caixa.saldoFinal)
          });

          // Linha em branco entre dias
          caixaData.push({
            'Data': '',
            'Tipo': '',
            'Descrição': '',
            'Valor': ''
          });
        });
        const wsCaixa = XLSX.utils.json_to_sheet(caixaData);
        XLSX.utils.book_append_sheet(wb, wsCaixa, 'Fluxo de Caixa');
      }

      // 5. Métodos de Pagamento
      if (dados.metodosPagamento && dados.metodosPagamento.length > 0) {
        const metodosData = dados.metodosPagamento.map(m => ({
          'Método de Pagamento': m.metodo,
          'Quantidade': m.quantidade,
          'Valor Total': formatarMoeda(m.total)
        }));
        const wsMetodos = XLSX.utils.json_to_sheet(metodosData);
        XLSX.utils.book_append_sheet(wb, wsMetodos, 'Métodos Pagamento');
      }
    }
    // Para outros tipos de relatório, processar conforme tipo específico
    else {
      // Relatório de Comissões
      if (tipoRelatorio === 'comissoes' && dados.funcionarios && dados.funcionarios.length > 0) {
        const comissoesData = [];
        dados.funcionarios.forEach(func => {
          // Linha do funcionário
          comissoesData.push({
            'Funcionário': func.funcionario,
            'Atendimentos': func.atendimentos,
            'Faturamento Total': formatarMoeda(func.faturamentoTotal),
            'Comissão Total': formatarMoeda(func.comissaoTotal),
            'Serviço': '',
            'Qtd.': '',
            'Faturamento Serv.': '',
            'Comissão Serv.': '',
            '% Comissão': ''
          });

          // Serviços realizados
          if (func.servicosRealizados && func.servicosRealizados.length > 0) {
            func.servicosRealizados.forEach(serv => {
              comissoesData.push({
                'Funcionário': '',
                'Atendimentos': '',
                'Faturamento Total': '',
                'Comissão Total': '',
                'Serviço': serv.servico,
                'Qtd.': serv.quantidade,
                'Faturamento Serv.': formatarMoeda(serv.faturamento),
                'Comissão Serv.': formatarMoeda(serv.comissao),
                '% Comissão': `${serv.percentualComissao}%`
              });
            });
          }

          // Linha em branco
          comissoesData.push({});
        });
        const wsComissoes = XLSX.utils.json_to_sheet(comissoesData);
        XLSX.utils.book_append_sheet(wb, wsComissoes, 'Comissões');
      }

      // Relatório de Serviços
      if (tipoRelatorio === 'servicos' && dados.servicos && dados.servicos.length > 0) {
        const servicosData = dados.servicos.map(s => ({
          'Serviço': s.servico,
          'Quantidade': s.quantidade,
          'Faturamento': formatarMoeda(s.faturamento),
          'Preço Médio': formatarMoeda(s.precoMedio)
        }));
        const wsServicos = XLSX.utils.json_to_sheet(servicosData);
        XLSX.utils.book_append_sheet(wb, wsServicos, 'Serviços');

        // Adicionar planilha de funcionários por serviço
        if (dados.servicos.some(s => s.funcionarios && s.funcionarios.length > 0)) {
          const funcPorServicoData = [];
          dados.servicos.forEach(serv => {
            if (serv.funcionarios && serv.funcionarios.length > 0) {
              funcPorServicoData.push({
                'Serviço': serv.servico,
                'Funcionário': '',
                'Quantidade': ''
              });
              serv.funcionarios.forEach(func => {
                funcPorServicoData.push({
                  'Serviço': '',
                  'Funcionário': func.nome,
                  'Quantidade': func.quantidade
                });
              });
              funcPorServicoData.push({});
            }
          });
          const wsFuncServicos = XLSX.utils.json_to_sheet(funcPorServicoData);
          XLSX.utils.book_append_sheet(wb, wsFuncServicos, 'Func. por Serviço');
        }
      }

      // Relatório de Caixa (melhorado)
      if (tipoRelatorio === 'caixa' && dados.movimentacoes && dados.movimentacoes.length > 0) {
        const movimentacoesData = dados.movimentacoes.map(m => ({
          'Data': m.data,
          'Saldo Inicial': formatarMoeda(m.saldoInicial),
          'Entradas': formatarMoeda(m.totalEntradas),
          'Saídas': formatarMoeda(m.totalSaidas),
          'Saldo Final': formatarMoeda(m.saldoFinal),
          'Qtd. Entradas': m.quantidadeEntradas || 0,
          'Qtd. Saídas': m.quantidadeSaidas || 0
        }));
        const wsMovimentacoes = XLSX.utils.json_to_sheet(movimentacoesData);
        XLSX.utils.book_append_sheet(wb, wsMovimentacoes, 'Movimentações');

        // Categorias de despesas
        if (dados.categoriasDespesas && dados.categoriasDespesas.length > 0) {
          const categoriasData = dados.categoriasDespesas.map(c => ({
            'Categoria': c.categoria,
            'Quantidade': c.quantidade,
            'Total': formatarMoeda(c.total)
          }));
          const wsCategorias = XLSX.utils.json_to_sheet(categoriasData);
          XLSX.utils.book_append_sheet(wb, wsCategorias, 'Despesas por Categoria');
        }
      }

      // Relatório de Receita (melhorado)
      if (tipoRelatorio === 'receita') {
        if (dados.agendamentos && dados.agendamentos.length > 0) {
          const agendamentosData = dados.agendamentos.map(a => ({
            'Data': a.dataHora ? format(new Date(a.dataHora), 'dd/MM/yyyy HH:mm') : 'N/A',
            'Cliente': a.clienteNome || a.clienteId?.nome || 'N/A',
            'Funcionário': a.funcionarioId?.nome || 'N/A',
            'Valor': formatarMoeda(a.preco),
            'Método Pagamento': a.metodoPagamento || 'N/A',
            'Status': a.status
          }));
          const wsAgendamentos = XLSX.utils.json_to_sheet(agendamentosData);
          XLSX.utils.book_append_sheet(wb, wsAgendamentos, 'Agendamentos');
        }

        // Receita por método de pagamento
        if (dados.receitaPorMetodo && dados.receitaPorMetodo.length > 0) {
          const metodosData = dados.receitaPorMetodo.map(m => ({
            'Método': m.metodo,
            'Quantidade': m.quantidade,
            'Total': formatarMoeda(m.total)
          }));
          const wsMetodos = XLSX.utils.json_to_sheet(metodosData);
          XLSX.utils.book_append_sheet(wb, wsMetodos, 'Por Método Pagamento');
        }

        // Receita por serviço
        if (dados.receitaPorServico && dados.receitaPorServico.length > 0) {
          const servicosData = dados.receitaPorServico.map(s => ({
            'Serviço': s.servico,
            'Quantidade': s.quantidade,
            'Total': formatarMoeda(s.total)
          }));
          const wsServicos = XLSX.utils.json_to_sheet(servicosData);
          XLSX.utils.book_append_sheet(wb, wsServicos, 'Por Serviço');
        }

        // Receita por funcionário
        if (dados.receitaPorFuncionario && dados.receitaPorFuncionario.length > 0) {
          const funcionariosData = dados.receitaPorFuncionario.map(f => ({
            'Funcionário': f.funcionario,
            'Quantidade': f.quantidade,
            'Total': formatarMoeda(f.total)
          }));
          const wsFuncionarios = XLSX.utils.json_to_sheet(funcionariosData);
          XLSX.utils.book_append_sheet(wb, wsFuncionarios, 'Por Funcionário');
        }
      }

      // Relatório de Agendamentos
      if (tipoRelatorio === 'agendamentos' && dados.agendamentos && dados.agendamentos.length > 0) {
        const agendamentosData = dados.agendamentos.map(a => ({
          'Data': a.dataHora ? format(new Date(a.dataHora), 'dd/MM/yyyy HH:mm') : 'N/A',
          'Cliente': a.clienteNome || a.clienteId?.nome || 'N/A',
          'Funcionário': a.funcionarioId?.nome || 'N/A',
          'Valor': formatarMoeda(a.preco),
          'Status': a.status
        }));
        const wsAgendamentos = XLSX.utils.json_to_sheet(agendamentosData);
        XLSX.utils.book_append_sheet(wb, wsAgendamentos, 'Agendamentos');
      }

      // Relatório de Funcionários
      if (tipoRelatorio === 'funcionarios' && dados.funcionarios && dados.funcionarios.length > 0) {
        const funcionariosData = dados.funcionarios.map(f => ({
          'Funcionário': f.nome,
          'Atendimentos': f.atendimentos,
          'Faturamento': formatarMoeda(f.faturamento),
          'Comissão': formatarMoeda(f.comissao)
        }));
        const wsFuncionarios = XLSX.utils.json_to_sheet(funcionariosData);
        XLSX.utils.book_append_sheet(wb, wsFuncionarios, 'Funcionários');
      }

      // Relatório de Clientes
      if (tipoRelatorio === 'clientes' && dados.clientes && dados.clientes.length > 0) {
        const clientesData = dados.clientes.map(c => ({
          'Nome': c.nome,
          'Telefone': c.telefone || 'N/A',
          'Email': c.email || 'N/A',
          'Total Agendamentos': c.totalAgendamentos,
          'Último Agendamento': c.ultimoAgendamento ? format(new Date(c.ultimoAgendamento), 'dd/MM/yyyy') : 'Nunca'
        }));
        const wsClientes = XLSX.utils.json_to_sheet(clientesData);
        XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes');
      }

      // Relatório de Produtos (Estoque)
      if (tipoRelatorio === 'produtos' && dados.produtos && dados.produtos.length > 0) {
        const produtosData = dados.produtos.map(p => ({
          'Produto': p.nome,
          'Categoria': p.categoria || 'N/A',
          'Quantidade': p.quantidade,
          'Unidade': p.unidade || 'un',
          'Qtd. Mínima': p.quantidadeMinima,
          'Fornecedor': p.fornecedor || 'N/A',
          'Valor Compra': formatarMoeda(p.valorCompra),
          'Valor Venda': formatarMoeda(p.valorVenda),
          'Status': p.status
        }));
        const wsProdutos = XLSX.utils.json_to_sheet(produtosData);
        XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos');
      }

      // Relatório de Movimentação de Produtos
      if (tipoRelatorio === 'movimentacao' && dados.movimentacoes && dados.movimentacoes.length > 0) {
        const movimentacoesData = dados.movimentacoes.map(m => ({
          'Data': m.data ? format(new Date(m.data), 'dd/MM/yyyy HH:mm') : 'N/A',
          'Produto': m.produto,
          'Categoria': m.categoria,
          'Tipo': m.tipo.toUpperCase(),
          'Quantidade': m.quantidade,
          'Motivo': m.motivo,
          'Usuário': m.usuario,
          'Saldo Atual': m.saldoAtual
        }));
        const wsMovimentacoes = XLSX.utils.json_to_sheet(movimentacoesData);
        XLSX.utils.book_append_sheet(wb, wsMovimentacoes, 'Movimentações');
      }

      // Relatório de Baixo Estoque
      if (tipoRelatorio === 'baixo_estoque' && dados.produtos && dados.produtos.length > 0) {
        const produtosData = dados.produtos.map(p => ({
          'Status': p.status,
          'Produto': p.nome,
          'Categoria': p.categoria,
          'Qtd. Atual': p.quantidade,
          'Qtd. Mínima': p.quantidadeMinima,
          'Unidade': p.unidade,
          'Fornecedor': p.fornecedor,
          'Valor Compra': formatarMoeda(p.valorCompra),
          'Qtd. Reposição': p.quantidadeReposicao,
          'Valor Reposição': formatarMoeda(p.valorReposicao)
        }));
        const wsProdutos = XLSX.utils.json_to_sheet(produtosData);
        XLSX.utils.book_append_sheet(wb, wsProdutos, 'Baixo Estoque');
      }
    }

    // Gerar arquivo
    const nomeArquivo = `relatorio_${tipoRelatorio}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const gerarPDF = (dados) => {
    const doc = new jsPDF();
    let y = 20;

    // Título
    doc.setFontSize(16);
    doc.text(dados.titulo, 20, y);
    y += 10;

    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(dados.periodo.inicio), 'dd/MM/yyyy')} até ${format(new Date(dados.periodo.fim), 'dd/MM/yyyy')}`, 20, y);
    y += 15;

    // Resumo
    doc.setFontSize(12);
    doc.text('RESUMO', 20, y);
    y += 8;

    doc.setFontSize(10);
    if (dados.resumo) {
      Object.entries(dados.resumo).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const valorFormatado = typeof value === 'number' ? formatarMoeda(value) : value;
        doc.text(`${label}: ${valorFormatado}`, 20, y);
        y += 6;
      });
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Salvar arquivo
    const nomeArquivo = `relatorio_${tipoRelatorio}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    doc.save(nomeArquivo);
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setErro('Selecione o período do relatório.');
      return;
    }

    setGerando(true);
    setErro('');
    setSucesso('');

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/relatorios/gerar?` + new URLSearchParams({
          tipo: tipoRelatorio,
          categoria: activeTab,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          formato
        }),
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error('Erro ao buscar dados do relatório');
      }

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro ao gerar relatório');
      }

      // Gerar arquivo baseado no formato
      if (formato === 'xlsx') {
        gerarXLSX(result.data);
      } else {
        gerarPDF(result.data);
      }

      setSucesso(`Relatório ${formato.toUpperCase()} gerado e baixado com sucesso!`);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setErro(error.message || 'Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const handleEnviar = async () => {
    if (!startDate || !endDate || !email) {
      setErro('Preencha todos os campos obrigatórios (período e email).');
      return;
    }

    setErro('');
    setSucesso('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/relatorios/enviar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          para: email,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          formato,
          tipo: tipoRelatorio,
          categoria: activeTab
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSucesso('Relatório enviado com sucesso! Verifique sua caixa de entrada.');
        setEmail('');
      } else {
        setErro(result.message || 'Erro ao enviar relatório.');
      }
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
    }
  };

  const tabConfig = {
    financeiro: { nome: 'Financeiro', icone: '💰', cor: 'green' },
    operacional: { nome: 'Operacional', icone: '⚙️', cor: 'blue' },
    estoque: { nome: 'Estoque', icone: '📦', cor: 'purple' }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <CalendarHeader
          title="Relatórios"
          subtitle="Gere relatórios personalizados e faça download ou envie por e-mail"
          mode="range"
          startDate={startDate}
          endDate={endDate}
        />

        {/* Alertas de Sucesso e Erro */}
        {sucesso && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <span className="text-2xl mr-3">✅</span>
            {sucesso}
          </div>
        )}

        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <span className="text-2xl mr-3">❌</span>
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Sidebar - Tipos de Relatórios */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                📊 Tipos de Relatórios
              </h2>

              {/* Tabs de Categorias */}
              <div className="space-y-2">
                {Object.entries(tabConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key);
                      setTipoRelatorio(tiposRelatorio[key][0].id);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                      activeTab === key
                        ? `bg-${config.cor}-100 text-${config.cor}-800 border-${config.cor}-300 border-2`
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-2xl mr-3">{config.icone}</span>
                    <span className="font-medium">{config.nome}</span>
                  </button>
                ))}
              </div>

              {/* Lista de Relatórios da Categoria Ativa */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-600 mb-3">
                  Relatórios Disponíveis:
                </h3>
                <div className="space-y-2">
                  {tiposRelatorio[activeTab].map((relatorio) => (
                    <label
                      key={relatorio.id}
                      className={`block p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        tipoRelatorio === relatorio.id
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoRelatorio"
                        value={relatorio.id}
                        checked={tipoRelatorio === relatorio.id}
                        onChange={(e) => setTipoRelatorio(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-medium text-sm text-gray-900">
                        {relatorio.nome}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {relatorio.desc}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Formulário de Configuração */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                <span className="text-2xl mr-3">⚙️</span>
                Configurar Relatório
              </h2>

              <div className="space-y-4 md:space-y-6">
                {/* Período */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Período do relatório *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Data inicial:
                      </label>
                      <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Selecione..."
                        locale={ptBR}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Data final:
                      </label>
                      <DatePicker
                        selected={endDate}
                        onChange={setEndDate}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Selecione..."
                        locale={ptBR}
                        minDate={startDate}
                      />
                    </div>
                  </div>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato do arquivo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <label className={`p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formato === 'xlsx'
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="formato"
                        value="xlsx"
                        checked={formato === 'xlsx'}
                        onChange={(e) => setFormato(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="font-medium">Excel</div>
                        <div className="text-xs text-gray-600">Arquivo .xlsx</div>
                      </div>
                    </label>
                    <label className={`p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formato === 'pdf'
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="formato"
                        value="pdf"
                        checked={formato === 'pdf'}
                        onChange={(e) => setFormato(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-3xl mb-2">📄</div>
                        <div className="font-medium">PDF</div>
                        <div className="text-xs text-gray-600">Arquivo .pdf</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Resumo da Seleção */}
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-medium text-gray-900 mb-2">📋 Resumo do Relatório:</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Categoria:</strong> {tabConfig[activeTab].nome}</div>
                    <div><strong>Tipo:</strong> {tiposRelatorio[activeTab].find(t => t.id === tipoRelatorio)?.nome}</div>
                    <div><strong>Período:</strong> {startDate && endDate
                      ? `${format(startDate, 'dd/MM/yyyy')} até ${format(endDate, 'dd/MM/yyyy')}`
                      : 'Não selecionado'
                    }</div>
                    <div><strong>Formato:</strong> {formato.toUpperCase()}</div>
                  </div>
                </div>

                {/* Botão de Download */}
                <div className="pt-2">
                  <button
                    onClick={handleDownload}
                    disabled={gerando || !startDate || !endDate}
                    className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg flex items-center justify-center"
                  >
                    {gerando ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Gerando relatório...
                      </>
                    ) : (
                      <>
                        <span className="text-2xl mr-2">⬇️</span>
                        Fazer Download do Relatório
                      </>
                    )}
                  </button>
                </div>

                {/* Seção de Envio por Email */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    📧 Enviar por Email (Em breve)
                  </h3>

                  {/* Email de Destino */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de destino
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="gestor@barbeariamonarca.com"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Funcionalidade de envio por email em desenvolvimento
                    </p>
                  </div>

                  <button
                    onClick={handleEnviar}
                    disabled={true}
                    className="w-full bg-gray-400 text-white px-6 py-4 rounded-lg cursor-not-allowed font-medium text-lg flex items-center justify-center opacity-50"
                    title="Funcionalidade em desenvolvimento"
                  >
                    <span className="text-2xl mr-2">📧</span>
                    Enviar por Email (Em breve)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
