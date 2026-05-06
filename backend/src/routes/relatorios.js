import express from 'express';
import Agendamento from '../models/Agendamento.js';
import Caixa from '../models/Caixa.js';
import Cliente from '../models/clienteModel.js';
import Produto from '../models/Produto.js';
import pagination from '../middleware/pagination.js';

const router = express.Router();

// GET - Gerar relatório para download
router.get('/gerar', async (req, res) => {
  try {
    const { tipo, categoria, startDate, endDate, formato } = req.query;

    // Validações
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data inicial e final são obrigatórias'
      });
    }

    // Converter datas - garantir formato correto
    const dataInicio = new Date(startDate + 'T00:00:00.000Z');
    const dataFim = new Date(endDate + 'T23:59:59.999Z');

    let dados = {};

    // Buscar dados baseado no tipo de relatório
    switch (tipo) {
      case 'completo':
        // Relatório completo - TODAS as informações do sistema
        try {
          const caixas = await Caixa.find({
            data: {
              $gte: startDate,
              $lte: endDate,
            },
          }).sort({ data: 1 });

          const agendamentos = await Agendamento.find({
            dataHora: { $gte: dataInicio, $lte: dataFim },
            status: 'concluido',
          })
            .populate('funcionarioId', 'nome')
            .populate('servicoId', 'nome preco comissao')
            .sort({ dataHora: 1 });

          // Preparar agendamentos com TODOS os detalhes
          const agendamentosDetalhados = agendamentos.map((ag) => {
            let servicosLista = [];
            let comissaoTotal = 0;

            // Se tem múltiplos serviços (formato novo)
            if (ag.servicos && ag.servicos.length > 0) {
              servicosLista = ag.servicos.map((s) => ({
                nome: s.nome || 'N/A',
                preco: s.preco || 0,
                comissao: s.comissao || 0,
                comissaoValor: (s.preco || 0) * ((s.comissao || 0) / 100),
              }));
              comissaoTotal = servicosLista.reduce(
                (sum, s) => sum + s.comissaoValor,
                0,
              );
            }
            // Formato antigo (serviço único)
            else if (ag.servicoId) {
              const preco = ag.preco || ag.servicoId?.preco || 0;
              const comissao = ag.comissao || ag.servicoId?.comissao || 0;
              servicosLista = [
                {
                  nome: ag.servicoId?.nome || 'Serviço',
                  preco: preco,
                  comissao: comissao,
                  comissaoValor: preco * (comissao / 100),
                },
              ];
              comissaoTotal = preco * (comissao / 100);
            }

            return {
              data: ag.dataHora,
              cliente: ag.clienteNome || 'N/A',
              telefone: ag.clienteTelefone || 'N/A',
              funcionario: ag.funcionarioId?.nome || 'N/A',
              servicos: servicosLista,
              metodoPagamento: ag.metodoPagamento || 'N/A',
              valorTotal: ag.preco || 0,
              comissaoTotal: comissaoTotal,
              status: ag.status,
            };
          });

          // Calcular comissões por funcionário
          const comissoesPorFuncionario = {};
          agendamentos.forEach((ag) => {
            const funcNome = ag.funcionarioId?.nome || 'N/A';
            if (!comissoesPorFuncionario[funcNome]) {
              comissoesPorFuncionario[funcNome] = {
                funcionario: funcNome,
                atendimentos: 0,
                faturamento: 0,
                comissaoTotal: 0,
                servicos: [],
              };
            }

            comissoesPorFuncionario[funcNome].atendimentos += 1;
            comissoesPorFuncionario[funcNome].faturamento += ag.preco || 0;

            // Calcular comissão
            if (ag.servicos && ag.servicos.length > 0) {
              ag.servicos.forEach((s) => {
                const valorComissao =
                  (s.preco || 0) * ((s.comissao || 0) / 100);
                comissoesPorFuncionario[funcNome].comissaoTotal +=
                  valorComissao;
                comissoesPorFuncionario[funcNome].servicos.push({
                  nome: s.nome,
                  valor: s.preco,
                  comissao: valorComissao,
                });
              });
            } else {
              const valor = ag.preco || 0;
              const comissao = ag.comissao || ag.servicoId?.comissao || 0;
              const valorComissao = valor * (comissao / 100);
              comissoesPorFuncionario[funcNome].comissaoTotal += valorComissao;
              comissoesPorFuncionario[funcNome].servicos.push({
                nome: ag.servicoId?.nome || 'Serviço',
                valor: valor,
                comissao: valorComissao,
              });
            }
          });

          // Preparar movimentações de caixa detalhadas
          const movimentacoesCaixa = caixas.map((c) => ({
            data: c.data,
            saldoInicial: c.saldoInicial || 0,
            totalEntradas: c.totalEntradas || 0,
            totalSaidas: c.totalSaidas || 0,
            saldoFinal: c.saldoFinal || 0,
            entradas: c.entradas || [],
            saidas: c.saidas || [],
          }));

          // Calcular despesas detalhadas
          const despesasDetalhadas = [];
          caixas.forEach((caixa) => {
            if (caixa.saidas && caixa.saidas.length > 0) {
              caixa.saidas.forEach((saida) => {
                despesasDetalhadas.push({
                  data: caixa.data,
                  descricao: saida.descricao || 'Despesa',
                  categoria: saida.categoria || 'Outras',
                  valor: saida.valor || 0,
                  responsavel: saida.responsavel || 'N/A',
                });
              });
            }
          });

          // Métodos de pagamento
          const metodosPagamento = {};
          agendamentos.forEach((ag) => {
            const metodo = ag.metodoPagamento || 'Não informado';
            if (!metodosPagamento[metodo]) {
              metodosPagamento[metodo] = { quantidade: 0, total: 0 };
            }
            metodosPagamento[metodo].quantidade += 1;
            metodosPagamento[metodo].total += ag.preco || 0;
          });

          dados = {
            titulo: 'Relatório Gerencial Completo',
            periodo: { inicio: startDate, fim: endDate },

            // Agendamentos detalhados
            agendamentos: agendamentosDetalhados,

            // Comissões por funcionário
            comissoes: Object.values(comissoesPorFuncionario),

            // Movimentações de caixa
            movimentacoesCaixa: movimentacoesCaixa,

            // Despesas detalhadas
            despesas: despesasDetalhadas,

            // Métodos de pagamento
            metodosPagamento: Object.entries(metodosPagamento).map(
              ([metodo, dados]) => ({
                metodo,
                quantidade: dados.quantidade,
                total: dados.total,
              }),
            ),

            // Resumo executivo
            resumo: {
              // Financeiro
              totalEntradas: caixas.reduce(
                (sum, c) => sum + (c.totalEntradas || 0),
                0,
              ),
              totalSaidas: caixas.reduce(
                (sum, c) => sum + (c.totalSaidas || 0),
                0,
              ),
              saldoFinal: caixas.reduce(
                (sum, c) => sum + (c.saldoFinal || 0),
                0,
              ),
              totalDespesas: despesasDetalhadas.reduce(
                (sum, d) => sum + d.valor,
                0,
              ),

              // Agendamentos
              totalAgendamentos: agendamentos.length,
              faturamentoTotal: agendamentos.reduce(
                (sum, a) => sum + (a.preco || 0),
                0,
              ),
              ticketMedio:
                agendamentos.length > 0
                  ? agendamentos.reduce((sum, a) => sum + (a.preco || 0), 0) /
                    agendamentos.length
                  : 0,

              // Comissões
              totalComissoes: Object.values(comissoesPorFuncionario).reduce(
                (sum, f) => sum + f.comissaoTotal,
                0,
              ),

              // Outros
              totalFuncionarios: Object.keys(comissoesPorFuncionario).length,
              totalClientes: new Set(
                agendamentos
                  .map((a) => a.clienteTelefone || a.clienteNome)
                  .filter(Boolean),
              ).size,
            },
          };
        } catch (error) {
          console.error('❌ Erro ao gerar relatório completo:', error);
          throw new Error(
            `Erro ao processar relatório completo: ${error.message}`,
          );
        }
        break;

      case 'caixa':
        // Relatório de movimentação de caixa - MELHORADO
        const caixasMov = await Caixa.find({
          data: {
            $gte: startDate,
            $lte: endDate
          }
        }).sort({ data: 1 });

        // Preparar movimentações detalhadas por dia
        const movimentacoesDetalhadas = caixasMov.map(caixa => ({
          data: caixa.data,
          saldoInicial: caixa.saldoInicial || 0,
          totalEntradas: caixa.totalEntradas || 0,
          totalSaidas: caixa.totalSaidas || 0,
          saldoFinal: caixa.saldoFinal || 0,
          entradas: caixa.entradas || [],
          saidas: caixa.saidas || [],
          quantidadeEntradas: (caixa.entradas || []).length,
          quantidadeSaidas: (caixa.saidas || []).length
        }));

        // Análise de categorias de saídas (despesas)
        const categoriasDespesas = {};
        caixasMov.forEach(caixa => {
          if (caixa.saidas && caixa.saidas.length > 0) {
            caixa.saidas.forEach(saida => {
              const categoria = saida.categoria || 'Outras';
              if (!categoriasDespesas[categoria]) {
                categoriasDespesas[categoria] = {
                  categoria,
                  total: 0,
                  quantidade: 0
                };
              }
              categoriasDespesas[categoria].total += (saida.valor || 0);
              categoriasDespesas[categoria].quantidade += 1;
            });
          }
        });

        const totalEntradasCaixa = caixasMov.reduce((sum, c) => sum + (c.totalEntradas || 0), 0);
        const totalSaidasCaixa = caixasMov.reduce((sum, c) => sum + (c.totalSaidas || 0), 0);
        const saldoInicialCaixa = caixasMov.length > 0 ? (caixasMov[0].saldoInicial || 0) : 0;
        const saldoFinalCaixa = saldoInicialCaixa + totalEntradasCaixa - totalSaidasCaixa;

        dados = {
          titulo: 'Relatório de Movimentação de Caixa',
          periodo: { inicio: startDate, fim: endDate },
          movimentacoes: movimentacoesDetalhadas,
          categoriasDespesas: Object.values(categoriasDespesas),
          resumo: {
            diasAnalisados: caixasMov.length,
            saldoInicial: saldoInicialCaixa,
            totalEntradas: totalEntradasCaixa,
            totalSaidas: totalSaidasCaixa,
            saldoFinal: saldoFinalCaixa,
            mediaDiariaEntradas: caixasMov.length > 0 ? totalEntradasCaixa / caixasMov.length : 0,
            mediaDiariaSaidas: caixasMov.length > 0 ? totalSaidasCaixa / caixasMov.length : 0,
            totalCategoriasDespesas: Object.keys(categoriasDespesas).length
          }
        };
        break;

      case 'receita':
        // Relatório de receita - MELHORADO
        const agendamentosReceita = await Agendamento.find({
          dataHora: { $gte: dataInicio, $lte: dataFim },
          status: 'concluido'
        })
          .populate('funcionarioId', 'nome')
          .populate('servicoId', 'nome')
          .sort({ dataHora: 1 });

        // Análise por método de pagamento
        const receitaPorMetodo = {};
        agendamentosReceita.forEach(ag => {
          const metodo = ag.metodoPagamento || 'Não informado';
          if (!receitaPorMetodo[metodo]) {
            receitaPorMetodo[metodo] = {
              metodo,
              quantidade: 0,
              total: 0
            };
          }
          receitaPorMetodo[metodo].quantidade += 1;
          receitaPorMetodo[metodo].total += (ag.preco || 0);
        });

        // Análise por serviço
        const receitaPorServico = {};
        agendamentosReceita.forEach(ag => {
          if (ag.servicos && ag.servicos.length > 0) {
            ag.servicos.forEach(s => {
              const nomeServico = s.nome || 'Serviço';
              if (!receitaPorServico[nomeServico]) {
                receitaPorServico[nomeServico] = {
                  servico: nomeServico,
                  quantidade: 0,
                  total: 0
                };
              }
              receitaPorServico[nomeServico].quantidade += 1;
              receitaPorServico[nomeServico].total += (s.preco || 0);
            });
          } else if (ag.servicoId) {
            const nomeServico = ag.servicoId?.nome || 'Serviço';
            if (!receitaPorServico[nomeServico]) {
              receitaPorServico[nomeServico] = {
                servico: nomeServico,
                quantidade: 0,
                total: 0
              };
            }
            receitaPorServico[nomeServico].quantidade += 1;
            receitaPorServico[nomeServico].total += (ag.preco || 0);
          }
        });

        // Ordenar serviços por faturamento
        const servicosOrdenados = Object.values(receitaPorServico).sort((a, b) => b.total - a.total);

        // Análise por funcionário
        const receitaPorFuncionario = {};
        agendamentosReceita.forEach(ag => {
          const funcNome = ag.funcionarioId?.nome || 'N/A';
          if (!receitaPorFuncionario[funcNome]) {
            receitaPorFuncionario[funcNome] = {
              funcionario: funcNome,
              quantidade: 0,
              total: 0
            };
          }
          receitaPorFuncionario[funcNome].quantidade += 1;
          receitaPorFuncionario[funcNome].total += (ag.preco || 0);
        });

        const totalReceita = agendamentosReceita.reduce((sum, a) => sum + (a.preco || 0), 0);

        dados = {
          titulo: 'Relatório de Receita',
          periodo: { inicio: startDate, fim: endDate },
          agendamentos: agendamentosReceita,
          receitaPorMetodo: Object.values(receitaPorMetodo),
          receitaPorServico: servicosOrdenados,
          receitaPorFuncionario: Object.values(receitaPorFuncionario),
          resumo: {
            totalAgendamentos: agendamentosReceita.length,
            totalReceita: totalReceita,
            ticketMedio: agendamentosReceita.length > 0 ? totalReceita / agendamentosReceita.length : 0,
            servicoMaisVendido: servicosOrdenados.length > 0 ? servicosOrdenados[0].servico : 'N/A',
            metodoPagamentoMaisUsado: Object.values(receitaPorMetodo).sort((a, b) => b.quantidade - a.quantidade)[0]?.metodo || 'N/A'
          }
        };
        break;

      case 'agendamentos':
        // Relatório de agendamentos
        const todosAgendamentos = await Agendamento.find({
          dataHora: { $gte: dataInicio, $lte: dataFim }
        })
          .populate('funcionarioId', 'nome')
          .sort({ dataHora: 1 });

        dados = {
          titulo: 'Relatório de Agendamentos',
          periodo: { inicio: startDate, fim: endDate },
          agendamentos: todosAgendamentos,
          resumo: {
            total: todosAgendamentos.length,
            concluidos: todosAgendamentos.filter(a => a.status === 'concluido').length,
            cancelados: todosAgendamentos.filter(a => a.status === 'cancelado').length,
            pendentes: todosAgendamentos.filter(a => a.status === 'pendente').length
          }
        };
        break;

      case 'funcionarios':
        // Relatório de performance dos funcionários
        const agendamentosFuncionarios = await Agendamento.find({
          dataHora: { $gte: dataInicio, $lte: dataFim },
          status: 'concluido'
        })
          .populate('funcionarioId', 'nome')
          .sort({ dataHora: 1 });

        const funcionariosMap = {};
        agendamentosFuncionarios.forEach(agendamento => {
          const funcId = agendamento.funcionarioId?._id?.toString();
          if (!funcId) return;

          if (!funcionariosMap[funcId]) {
            funcionariosMap[funcId] = {
              nome: agendamento.funcionarioId.nome,
              atendimentos: 0,
              faturamento: 0,
              comissao: 0
            };
          }

          funcionariosMap[funcId].atendimentos += 1;
          funcionariosMap[funcId].faturamento += (agendamento.preco || 0);

          // Calcular comissão
          if (agendamento.servicos && agendamento.servicos.length > 0) {
            const comissaoTotal = agendamento.servicos.reduce((total, servico) => {
              const valorServico = servico.preco || 0;
              const comissaoServico = servico.comissao || 0;
              return total + (valorServico * (comissaoServico / 100));
            }, 0);
            funcionariosMap[funcId].comissao += comissaoTotal;
          } else {
            const valorServico = agendamento.preco || agendamento.valor || 0;
            const comissaoServico = agendamento.comissao || 0;
            funcionariosMap[funcId].comissao += valorServico * (comissaoServico / 100);
          }
        });

        dados = {
          titulo: 'Relatório de Performance dos Funcionários',
          periodo: { inicio: startDate, fim: endDate },
          funcionarios: Object.values(funcionariosMap),
          resumo: {
            totalAtendimentos: agendamentosFuncionarios.length,
            totalFaturamento: agendamentosFuncionarios.reduce((sum, a) => sum + (a.preco || 0), 0)
          }
        };
        break;

      case 'clientes':
        // 🔥 REFATORADO: Sem N+1 queries - Uma única agregação!
        const clientesComHistorico = await Cliente.aggregate([
          {
            $match: {
              ativo: true,
            },
          },
          {
            $lookup: {
              from: 'agendamentos',
              let: { clienteId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$clienteId', '$$clienteId'] },
                    dataHora: { $gte: dataInicio, $lte: dataFim },
                  },
                },
              ],
              as: 'agendamentos',
            },
          },
          {
            $project: {
              _id: 1,
              nome: 1,
              telefone: 1,
              email: 1,
              totalAgendamentos: { $size: '$agendamentos' },
              ultimoAgendamento: { $max: '$agendamentos.dataHora' },
            },
          },
          {
            $sort: { nome: 1 },
          },
        ]);

        dados = {
          titulo: 'Relatório de Base de Clientes',
          periodo: { inicio: startDate, fim: endDate },
          clientes: clientesComHistorico,
          resumo: {
            totalClientes: clientesComHistorico.length,
            clientesAtivos: clientesComHistorico.filter(
              (c) => c.totalAgendamentos > 0,
            ).length,
          },
        };
        break;

      case 'comissoes':
        // Relatório de Comissões dos Funcionários
        const agendamentosComissoes = await Agendamento.find({
          dataHora: { $gte: dataInicio, $lte: dataFim },
          status: 'concluido'
        })
          .populate('funcionarioId', 'nome')
          .populate('servicoId', 'nome preco comissao')
          .sort({ dataHora: 1 });

        const comissoesPorFuncionarioMap = {};
        agendamentosComissoes.forEach(ag => {
          const funcId = ag.funcionarioId?._id?.toString();
          const funcNome = ag.funcionarioId?.nome || 'N/A';

          if (!funcId) return;

          if (!comissoesPorFuncionarioMap[funcId]) {
            comissoesPorFuncionarioMap[funcId] = {
              funcionario: funcNome,
              atendimentos: 0,
              faturamentoTotal: 0,
              comissaoTotal: 0,
              servicosRealizados: {}
            };
          }

          comissoesPorFuncionarioMap[funcId].atendimentos += 1;
          const valorAgendamento = ag.preco || 0;
          comissoesPorFuncionarioMap[funcId].faturamentoTotal += valorAgendamento;

          // Calcular comissão por serviço
          if (ag.servicos && ag.servicos.length > 0) {
            ag.servicos.forEach(s => {
              const nomeServico = s.nome || 'Serviço';
              const valorServico = s.preco || 0;
              const percComissao = s.comissao || 0;
              const valorComissao = valorServico * (percComissao / 100);

              comissoesPorFuncionarioMap[funcId].comissaoTotal += valorComissao;

              if (!comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico]) {
                comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico] = {
                  quantidade: 0,
                  faturamento: 0,
                  comissao: 0,
                  percentualComissao: percComissao
                };
              }

              comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].quantidade += 1;
              comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].faturamento += valorServico;
              comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].comissao += valorComissao;
            });
          } else if (ag.servicoId) {
            const nomeServico = ag.servicoId?.nome || 'Serviço';
            const percComissao = ag.comissao || ag.servicoId?.comissao || 0;
            const valorComissao = valorAgendamento * (percComissao / 100);

            comissoesPorFuncionarioMap[funcId].comissaoTotal += valorComissao;

            if (!comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico]) {
              comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico] = {
                quantidade: 0,
                faturamento: 0,
                comissao: 0,
                percentualComissao: percComissao
              };
            }

            comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].quantidade += 1;
            comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].faturamento += valorAgendamento;
            comissoesPorFuncionarioMap[funcId].servicosRealizados[nomeServico].comissao += valorComissao;
          }
        });

        // Converter servicosRealizados de objeto para array
        const comissoesDetalhadas = Object.values(comissoesPorFuncionarioMap).map(func => ({
          ...func,
          servicosRealizados: Object.entries(func.servicosRealizados).map(([nome, dados]) => ({
            servico: nome,
            ...dados
          }))
        }));

        dados = {
          titulo: 'Relatório de Comissões dos Funcionários',
          periodo: { inicio: startDate, fim: endDate },
          funcionarios: comissoesDetalhadas,
          resumo: {
            totalAtendimentos: agendamentosComissoes.length,
            totalFaturamento: agendamentosComissoes.reduce((sum, a) => sum + (a.preco || 0), 0),
            totalComissoes: comissoesDetalhadas.reduce((sum, f) => sum + f.comissaoTotal, 0),
            totalFuncionarios: comissoesDetalhadas.length
          }
        };
        break;

      case 'servicos':
        // Relatório de Serviços Realizados
        const agendamentosServicos = await Agendamento.find({
          dataHora: { $gte: dataInicio, $lte: dataFim },
          status: 'concluido'
        })
          .populate('funcionarioId', 'nome')
          .populate('servicoId', 'nome preco duracao')
          .sort({ dataHora: 1 });

        const servicosMap = {};
        agendamentosServicos.forEach(ag => {
          if (ag.servicos && ag.servicos.length > 0) {
            ag.servicos.forEach(s => {
              const nomeServico = s.nome || 'Serviço';
              if (!servicosMap[nomeServico]) {
                servicosMap[nomeServico] = {
                  servico: nomeServico,
                  quantidade: 0,
                  faturamento: 0,
                  precoMedio: 0,
                  funcionarios: {}
                };
              }
              servicosMap[nomeServico].quantidade += 1;
              servicosMap[nomeServico].faturamento += (s.preco || 0);

              const funcNome = ag.funcionarioId?.nome || 'N/A';
              if (!servicosMap[nomeServico].funcionarios[funcNome]) {
                servicosMap[nomeServico].funcionarios[funcNome] = 0;
              }
              servicosMap[nomeServico].funcionarios[funcNome] += 1;
            });
          } else if (ag.servicoId) {
            const nomeServico = ag.servicoId?.nome || 'Serviço';
            if (!servicosMap[nomeServico]) {
              servicosMap[nomeServico] = {
                servico: nomeServico,
                quantidade: 0,
                faturamento: 0,
                precoMedio: 0,
                funcionarios: {}
              };
            }
            servicosMap[nomeServico].quantidade += 1;
            servicosMap[nomeServico].faturamento += (ag.preco || 0);

            const funcNome = ag.funcionarioId?.nome || 'N/A';
            if (!servicosMap[nomeServico].funcionarios[funcNome]) {
              servicosMap[nomeServico].funcionarios[funcNome] = 0;
            }
            servicosMap[nomeServico].funcionarios[funcNome] += 1;
          }
        });

        // Calcular preço médio e converter funcionários para array
        const servicosDetalhados = Object.values(servicosMap).map(s => ({
          ...s,
          precoMedio: s.quantidade > 0 ? s.faturamento / s.quantidade : 0,
          funcionarios: Object.entries(s.funcionarios).map(([nome, qtd]) => ({
            nome,
            quantidade: qtd
          }))
        }));

        // Ordenar por faturamento
        servicosDetalhados.sort((a, b) => b.faturamento - a.faturamento);

        dados = {
          titulo: 'Relatório de Serviços Realizados',
          periodo: { inicio: startDate, fim: endDate },
          servicos: servicosDetalhados,
          resumo: {
            totalServicos: servicosDetalhados.length,
            totalAtendimentos: agendamentosServicos.length,
            faturamentoTotal: servicosDetalhados.reduce((sum, s) => sum + s.faturamento, 0),
            ticketMedio: agendamentosServicos.length > 0
              ? servicosDetalhados.reduce((sum, s) => sum + s.faturamento, 0) / agendamentosServicos.length
              : 0
          }
        };
        break;

      case 'produtos':
        // Relatório de estoque
        const produtos = await Produto.find().sort({ nome: 1 });

        dados = {
          titulo: 'Relatório de Estoque',
          periodo: { inicio: startDate, fim: endDate },
          produtos: produtos.map(p => ({
            nome: p.nome,
            categoria: p.categoria,
            quantidade: p.quantidade,
            quantidadeMinima: p.quantidadeMinima,
            unidade: p.unidade,
            valorCompra: p.valorCompra || 0,
            valorVenda: p.valorVenda || p.preco || 0,
            fornecedor: p.fornecedor || 'N/A',
            status: p.quantidade === 0 ? 'Zerado' : (p.quantidade <= p.quantidadeMinima ? 'Baixo Estoque' : 'Normal')
          })),
          resumo: {
            totalProdutos: produtos.length,
            produtosZerados: produtos.filter(p => p.quantidade === 0).length,
            produtosBaixoEstoque: produtos.filter(p => p.quantidade > 0 && p.quantidade <= p.quantidadeMinima).length,
            valorTotalEstoque: produtos.reduce((sum, p) => sum + ((p.valorCompra || 0) * p.quantidade), 0)
          }
        };
        break;

      case 'movimentacao':
        // Relatório de Movimentação de Produtos
        const produtosComMovimentacao = await Produto.find({
          'movimentacoes.data': {
            $gte: dataInicio,
            $lte: dataFim
          }
        })
          .populate('movimentacoes.usuarioId', 'nome')
          .sort({ nome: 1 });

        const todasMovimentacoes = [];
        produtosComMovimentacao.forEach(produto => {
          const movimentacoesPeriodo = produto.movimentacoes.filter(m => {
            const dataMovimentacao = new Date(m.data);
            return dataMovimentacao >= dataInicio && dataMovimentacao <= dataFim;
          });

          movimentacoesPeriodo.forEach(mov => {
            todasMovimentacoes.push({
              data: mov.data,
              produto: produto.nome,
              categoria: produto.categoria,
              tipo: mov.tipo,
              quantidade: mov.quantidade,
              motivo: mov.motivo,
              usuario: mov.usuarioId?.nome || 'N/A',
              saldoAtual: produto.quantidade
            });
          });
        });

        // Ordenar por data
        todasMovimentacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

        const totalEntradasProdutos = todasMovimentacoes
          .filter(m => m.tipo === 'entrada')
          .reduce((sum, m) => sum + m.quantidade, 0);
        const totalSaidasProdutos = todasMovimentacoes
          .filter(m => m.tipo === 'saida')
          .reduce((sum, m) => sum + m.quantidade, 0);

        dados = {
          titulo: 'Relatório de Movimentação de Produtos',
          periodo: { inicio: startDate, fim: endDate },
          movimentacoes: todasMovimentacoes,
          resumo: {
            totalMovimentacoes: todasMovimentacoes.length,
            totalEntradas: totalEntradasProdutos,
            totalSaidas: totalSaidasProdutos,
            produtosMovimentados: produtosComMovimentacao.length
          }
        };
        break;

      case 'baixo_estoque':
        // Relatório de Produtos em Baixo Estoque
        const produtosBaixoEstoque = await Produto.find({
          $or: [
            { quantidade: 0 },
            { $expr: { $lte: ['$quantidade', '$quantidadeMinima'] } }
          ],
          ativo: true
        }).sort({ quantidade: 1, nome: 1 });

        const produtosDetalhados = produtosBaixoEstoque.map(p => ({
          nome: p.nome,
          categoria: p.categoria,
          quantidade: p.quantidade,
          quantidadeMinima: p.quantidadeMinima,
          unidade: p.unidade,
          fornecedor: p.fornecedor || 'N/A',
          valorCompra: p.valorCompra || 0,
          quantidadeReposicao: Math.max(0, (p.quantidadeMinima * 2) - p.quantidade),
          valorReposicao: (p.valorCompra || 0) * Math.max(0, (p.quantidadeMinima * 2) - p.quantidade),
          status: p.quantidade === 0 ? 'URGENTE - Zerado' : 'Baixo Estoque',
          prioridade: p.quantidade === 0 ? 1 : 2
        }));

        dados = {
          titulo: 'Relatório de Produtos em Baixo Estoque',
          periodo: { inicio: startDate, fim: endDate },
          produtos: produtosDetalhados,
          resumo: {
            totalProdutos: produtosDetalhados.length,
            produtosZerados: produtosDetalhados.filter(p => p.quantidade === 0).length,
            produtosBaixoEstoque: produtosDetalhados.filter(p => p.quantidade > 0).length,
            valorTotalReposicao: produtosDetalhados.reduce((sum, p) => sum + p.valorReposicao, 0)
          }
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de relatório inválido'
        });
    }

    // Retornar dados em JSON
    // O frontend vai processar e gerar o arquivo (xlsx/pdf)
    res.json({
      success: true,
      data: dados
    });

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      error: error.message
    });
  }
});

// POST - Enviar relatório por email (placeholder para futura implementação)
router.post('/enviar', async (req, res) => {
  try {
    const { para, startDate, endDate, formato, tipo, categoria } = req.body;
    // Por enquanto, retornar que a funcionalidade ainda não está implementada
    return res.status(501).json({
      success: false,
      message:
        'Funcionalidade de envio por email ainda não implementada. Use o botão de download.',
    });
  } catch (error) {
    console.error('❌ Erro ao enviar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação de envio',
      error: error.message
    });
  }
});

export default router;
