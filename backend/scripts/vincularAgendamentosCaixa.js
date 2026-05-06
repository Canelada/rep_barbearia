import mongoose from 'mongoose';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barbearia');

// Modelos
const Agendamento = mongoose.model('Agendamento', new mongoose.Schema({
  clienteNome: String,
  clienteTelefone: String,
  servicoId: mongoose.Schema.Types.ObjectId,
  funcionarioId: mongoose.Schema.Types.ObjectId,
  dataHora: Date,
  status: String,
  preco: Number,
  desconto: { type: Number, default: 0 },
  origem: String,
  observacoes: String,
  lembreteEnviado: { type: Boolean, default: false },
}, { timestamps: true }));

const movimentacaoSchema = new mongoose.Schema({
  valor: Number,
  descricao: String,
  categoria: String,
  hora: String,
  usuarioId: mongoose.Schema.Types.ObjectId,
  agendamentoId: mongoose.Schema.Types.ObjectId
}, { _id: false });

const Caixa = mongoose.model('Caixa', new mongoose.Schema({
  data: { type: String, required: true, unique: true },
  entradas: [movimentacaoSchema],
  saidas: [movimentacaoSchema],
  saldoInicial: { type: Number, default: 0 },
  saldoFinal: { type: Number, default: 0 },
  fechado: { type: Boolean, default: false },
  fechadoPor: mongoose.Schema.Types.ObjectId,
  dataFechamento: Date,
  observacoes: String
}, { timestamps: true }));

const Servico = mongoose.model('Servico', new mongoose.Schema({
  nome: { type: String, required: true },
  preco: { type: Number, required: true },
  duracao: { type: Number, required: true },
  categoria: String,
  descricao: String,
  ativo: { type: Boolean, default: true },
}, { timestamps: true }));

async function vincularAgendamentosCaixa() {
  console.log('🔄 Iniciando vinculação de agendamentos concluídos ao caixa...');

  try {
    // Buscar agendamentos concluídos que não têm entrada no caixa
    const agendamentosConcluidos = await Agendamento.find({
      status: 'concluido',
    }).populate('servicoId');

    console.log(`📋 Encontrados ${agendamentosConcluidos.length} agendamentos concluídos`);

    let criados = 0;
    let jaCriados = 0;

    for (const agendamento of agendamentosConcluidos) {
      const dataFormatada = dayjs(agendamento.dataHora).format('YYYY-MM-DD');
      
      // Buscar ou criar caixa para o dia
      let caixaDia = await Caixa.findOne({ data: dataFormatada });
      
      if (!caixaDia) {
        caixaDia = await Caixa.create({
          data: dataFormatada,
          entradas: [],
          saidas: [],
          saldoInicial: 0,
          saldoFinal: 0
        });
      }

      // Verificar se já existe entrada para este agendamento
      const entradaExistente = caixaDia.entradas.find(
        entrada => entrada.agendamentoId && entrada.agendamentoId.toString() === agendamento._id.toString()
      );

      if (entradaExistente) {
        jaCriados++;
        continue;
      }

      // Adicionar entrada no caixa
      const valorFinal = agendamento.preco - (agendamento.desconto || 0);
      
      caixaDia.entradas.push({
        valor: valorFinal,
        descricao: `${agendamento.servicoId?.nome || 'Serviço'} - ${agendamento.clienteNome}`,
        categoria: 'servicos',
        hora: dayjs(agendamento.dataHora).format('HH:mm'),
        usuarioId: agendamento.funcionarioId,
        agendamentoId: agendamento._id
      });

      // Atualizar saldo final
      const totalEntradas = caixaDia.entradas.reduce((total, entrada) => total + entrada.valor, 0);
      const totalSaidas = caixaDia.saidas.reduce((total, saida) => total + saida.valor, 0);
      caixaDia.saldoFinal = caixaDia.saldoInicial + totalEntradas - totalSaidas;

      await caixaDia.save();
      criados++;
    }

    console.log(`✅ Vinculação concluída!`);
    console.log(`📊 ESTATÍSTICAS:`);
    console.log(`💰 Entradas criadas: ${criados}`);
    console.log(`🔄 Já existiam: ${jaCriados}`);

    // Calcular totais
    const todasCaixas = await Caixa.find({});
    let totalReceita = 0;
    let totalDespesas = 0;

    todasCaixas.forEach(caixa => {
      totalReceita += caixa.entradas.reduce((total, entrada) => total + entrada.valor, 0);
      totalDespesas += caixa.saidas.reduce((total, saida) => total + saida.valor, 0);
    });

    console.log(`💵 Receita total: R$ ${totalReceita.toFixed(2)}`);
    console.log(`💸 Despesas totais: R$ ${totalDespesas.toFixed(2)}`);
    console.log(`📈 Lucro: R$ ${(totalReceita - totalDespesas).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Erro ao vincular agendamentos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar
vincularAgendamentosCaixa();
