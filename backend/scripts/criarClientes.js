import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Importar modelos
import Cliente from '../src/models/clienteModel.js';
import Agendamento from '../src/models/Agendamento.js';
import Servico from '../src/models/Servico.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no .env');
  process.exit(1);
}

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

// Função para gerar data de aniversário aleatória
const gerarDataAniversario = () => {
  const dia = Math.floor(Math.random() * 28) + 1; // 1-28 para evitar problemas com fevereiro
  const mes = Math.floor(Math.random() * 12) + 1; // 1-12
  return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`;
};

// Observações realistas para clientes
const observacoesPossiveis = [
  'Cliente preferencial - sempre pontual',
  'Gosta de conversar durante o atendimento',
  'Prefere cortes mais conservadores',
  'Cliente fidelizado há mais de 2 anos',
  'Sempre agenda com antecedência',
  'Gosta de produtos para cabelo',
  'Cliente muito educado e simpático',
  'Prefere atendimentos pela manhã',
  'Sempre dá boas gorjetas',
  'Cliente indicou vários amigos',
  'Gosta de experimentar novos estilos',
  'Prefere cortes rápidos',
  'Cliente desde a inauguração',
  'Sempre confirma agendamentos',
  'Gosta do ambiente da barbearia'
];

// Função principal para criar clientes baseado nos agendamentos
const criarClientesDeAgendamentos = async () => {
  try {
    console.log('🗑️  Limpando clientes existentes...');
    await Cliente.deleteMany({});

    console.log('📅 Buscando agendamentos únicos...');
    
    // Buscar todos os agendamentos e agrupar por cliente
    const agendamentos = await Agendamento.find({})
      .populate('servicoId')
      .sort({ dataHora: 1 });

    console.log(`Encontrados ${agendamentos.length} agendamentos`);

    // Agrupar agendamentos por cliente (nome + telefone)
    const clientesMap = new Map();
    
    agendamentos.forEach(agendamento => {
      const chaveCliente = `${agendamento.clienteNome}_${agendamento.clienteTelefone}`;
      
      if (!clientesMap.has(chaveCliente)) {
        clientesMap.set(chaveCliente, {
          nome: agendamento.clienteNome,
          telefone: agendamento.clienteTelefone,
          agendamentos: [],
          servicos: new Map()
        });
      }
      
      const cliente = clientesMap.get(chaveCliente);
      cliente.agendamentos.push(agendamento);
      
      // Contar serviços para encontrar o preferido
      if (agendamento.servicoId) {
        const servicoId = agendamento.servicoId._id.toString();
        const count = cliente.servicos.get(servicoId) || 0;
        cliente.servicos.set(servicoId, count + 1);
      }
    });

    console.log(`👥 Encontrados ${clientesMap.size} clientes únicos`);
    console.log('💾 Criando registros de clientes...');

    const clientesCriados = [];

    for (const [chave, dadosCliente] of clientesMap) {
      // Encontrar serviço mais utilizado
      let servicoPreferido = null;
      let maxCount = 0;
      
      for (const [servicoId, count] of dadosCliente.servicos) {
        if (count > maxCount) {
          maxCount = count;
          servicoPreferido = servicoId;
        }
      }

      // Calcular estatísticas
      const agendamentosConcluidos = dadosCliente.agendamentos.filter(a => a.status === 'concluido');
      const ultimoAgendamento = dadosCliente.agendamentos[dadosCliente.agendamentos.length - 1];
      
      // Dados do cliente
      const clienteData = {
        nome: dadosCliente.nome,
        telefone: dadosCliente.telefone,
        dataAniversario: gerarDataAniversario(),
        servicoPreferido: servicoPreferido ? new mongoose.Types.ObjectId(servicoPreferido) : null,
        observacoes: Math.random() < 0.3 ? observacoesPossiveis[Math.floor(Math.random() * observacoesPossiveis.length)] : undefined,
        ativo: true,
        ultimoAgendamento: ultimoAgendamento ? ultimoAgendamento.dataHora : null,
        totalAgendamentos: dadosCliente.agendamentos.length,
        createdAt: dadosCliente.agendamentos[0]?.createdAt || new Date(),
        updatedAt: ultimoAgendamento?.updatedAt || new Date()
      };

      const cliente = new Cliente(clienteData);
      const clienteSalvo = await cliente.save();
      clientesCriados.push(clienteSalvo);
    }

    // Estatísticas finais
    const totalClientes = clientesCriados.length;
    const clientesComAniversario = clientesCriados.filter(c => c.dataAniversario).length;
    const clientesComServicoPreferido = clientesCriados.filter(c => c.servicoPreferido).length;
    const clientesComObservacoes = clientesCriados.filter(c => c.observacoes).length;

    // Clientes que fazem aniversário este mês
    const mesAtual = new Date().getMonth() + 1;
    const aniversariantesDoMes = clientesCriados.filter(c => {
      if (!c.dataAniversario) return false;
      const mesAniversario = parseInt(c.dataAniversario.split('/')[1]);
      return mesAniversario === mesAtual;
    });

    console.log('\n✅ Clientes criados com sucesso!');
    console.log('\n📊 ESTATÍSTICAS DOS CLIENTES:');
    console.log(`👥 Total de clientes: ${totalClientes}`);
    console.log(`🎂 Clientes com aniversário cadastrado: ${clientesComAniversario}`);
    console.log(`✂️  Clientes com serviço preferido: ${clientesComServicoPreferido}`);
    console.log(`📝 Clientes com observações: ${clientesComObservacoes}`);
    console.log(`🎉 Aniversariantes deste mês: ${aniversariantesDoMes.length}`);

    if (aniversariantesDoMes.length > 0) {
      console.log('\n🎂 ANIVERSARIANTES DESTE MÊS:');
      aniversariantesDoMes.forEach(cliente => {
        console.log(`- ${cliente.nome} (${cliente.dataAniversario}) - ${cliente.telefone}`);
      });
    }

    // Mostrar top 5 clientes com mais agendamentos
    const topClientes = clientesCriados
      .sort((a, b) => b.totalAgendamentos - a.totalAgendamentos)
      .slice(0, 5);

    console.log('\n🏆 TOP 5 CLIENTES MAIS FIÉIS:');
    topClientes.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.nome} - ${cliente.totalAgendamentos} agendamentos`);
    });

  } catch (error) {
    console.error('❌ Erro ao criar clientes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
};

// Executar o script
const main = async () => {
  await connectDB();
  await criarClientesDeAgendamentos();
};

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
