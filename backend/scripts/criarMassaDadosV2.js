import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Importar modelos
import User from '../src/models/userModel.js';
import Servico from '../src/models/Servico.js';
import Produto from '../src/models/Produto.js';
import Agendamento from '../src/models/Agendamento.js';
import Caixa from '../src/models/Caixa.js';

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

// Dados para criação
const usuariosData = [
  {
    nome: 'Administrador',
    email: 'admin@barbearia.com',
    senha: 'Admin123',
    usuario: 'admin',
    tipo: 'admin',
    telefone: '(11) 99999-9999',
    ativo: true
  },
  {
    nome: 'João Silva',
    email: 'joao@barbearia.com',
    senha: 'barbeiro123',
    usuario: 'joao',
    tipo: 'barbeiro',
    telefone: '(11) 98888-8888',
    ativo: true
  },
  {
    nome: 'Carlos Santos',
    email: 'carlos@barbearia.com',
    senha: 'barbeiro123',
    usuario: 'carlos',
    tipo: 'barbeiro',
    telefone: '(11) 97777-7777',
    ativo: true
  },
  {
    nome: 'Pedro Oliveira',
    email: 'pedro@barbearia.com',
    senha: 'barbeiro123',
    usuario: 'pedro',
    tipo: 'barbeiro',
    telefone: '(11) 96666-6666',
    ativo: true
  }
];

const servicosData = [
  {
    nome: 'Corte Simples',
    descricao: 'Corte de cabelo masculino tradicional',
    preco: 25.00,
    duracaoMin: 30,
    categoria: 'Corte Masculino',
    ativo: true
  },
  {
    nome: 'Corte + Barba',
    descricao: 'Corte de cabelo + barba completa',
    preco: 45.00,
    duracaoMin: 60,
    categoria: 'Combo',
    ativo: true
  },
  {
    nome: 'Barba Completa',
    descricao: 'Barba completa com navalha',
    preco: 25.00,
    duracaoMin: 30,
    categoria: 'Barba',
    ativo: true
  },
  {
    nome: 'Sobrancelha',
    descricao: 'Aparar sobrancelhas masculinas',
    preco: 15.00,
    duracaoMin: 15,
    categoria: 'Especial',
    ativo: true
  },
  {
    nome: 'Corte Premium',
    descricao: 'Corte estilizado + acabamento',
    preco: 60.00,
    duracaoMin: 45,
    categoria: 'Corte Masculino',
    ativo: true
  },
  {
    nome: 'Tratamento Capilar',
    descricao: 'Hidratação e tratamento capilar',
    preco: 80.00,
    duracaoMin: 90,
    categoria: 'Tratamento',
    ativo: true
  },
  {
    nome: 'Corte Infantil',
    descricao: 'Corte especial para crianças',
    preco: 20.00,
    duracaoMin: 30,
    categoria: 'Infantil',
    ativo: true
  }
];

const produtosData = [
  {
    nome: 'Shampoo Masculino',
    descricao: 'Shampoo para cabelos masculinos',
    preco: 35.00,
    categoria: 'higiene',
    quantidade: 45,
    quantidadeMinima: 10,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Pomada Modeladora',
    descricao: 'Pomada para modelar cabelo',
    preco: 28.00,
    categoria: 'finalizacao',
    quantidade: 8, // Baixo estoque
    quantidadeMinima: 15,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Óleo para Barba',
    descricao: 'Óleo hidratante para barba',
    preco: 42.00,
    categoria: 'barba',
    quantidade: 30,
    quantidadeMinima: 8,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Navalha Descartável',
    descricao: 'Navalhas descartáveis para barba',
    preco: 1.50,
    categoria: 'ferramentas',
    quantidade: 5, // Baixo estoque
    quantidadeMinima: 20,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Toalha Pequena',
    descricao: 'Toalha para barbear',
    preco: 15.00,
    categoria: 'acessorios',
    quantidade: 25,
    quantidadeMinima: 10,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Condicionador',
    descricao: 'Condicionador para cabelos',
    preco: 38.00,
    categoria: 'higiene',
    quantidade: 3, // Baixo estoque
    quantidadeMinima: 12,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Gel Fixador',
    descricao: 'Gel para fixação do cabelo',
    preco: 22.00,
    categoria: 'finalizacao',
    quantidade: 18,
    quantidadeMinima: 10,
    unidade: 'unid',
    ativo: true
  },
  {
    nome: 'Loção Pós-Barba',
    descricao: 'Loção calmante pós-barba',
    preco: 32.00,
    categoria: 'barba',
    quantidade: 20,
    quantidadeMinima: 8,
    unidade: 'unid',
    ativo: true
  }
];

// Nomes de clientes realistas
const nomesClientes = [
  'André Silva', 'Bruno Costa', 'Carlos Lima', 'Diego Santos', 'Eduardo Alves',
  'Felipe Oliveira', 'Gabriel Souza', 'Henrique Rodrigues', 'Igor Ferreira', 'João Pereira',
  'Lucas Martins', 'Marcos Ribeiro', 'Nicolas Cardoso', 'Otávio Barbosa', 'Paulo Nunes',
  'Rafael Moreira', 'Sérgio Castro', 'Thiago Araújo', 'Victor Gomes', 'Wesley Dias',
  'Anderson Silva', 'Bernardo Costa', 'Cristiano Lima', 'Daniel Santos', 'Emerson Alves',
  'Fábio Oliveira', 'Gustavo Souza', 'Heitor Rodrigues', 'Ivan Ferreira', 'José Pereira',
  'Leonardo Martins', 'Mateus Ribeiro', 'Nathan Cardoso', 'Orlando Barbosa', 'Patrick Nunes',
  'Roberto Moreira', 'Samuel Castro', 'Tiago Araújo', 'Vinícius Gomes', 'William Dias'
];

const telefones = [
  '(11) 99876-5432', '(11) 98765-4321', '(11) 97654-3210', '(11) 96543-2109',
  '(11) 95432-1098', '(11) 94321-0987', '(11) 93210-9876', '(11) 92109-8765',
  '(11) 91098-7654', '(11) 90987-6543', '(11) 89876-5432', '(11) 88765-4321',
  '(11) 87654-3210', '(11) 86543-2109', '(11) 85432-1098', '(11) 84321-0987',
  '(11) 83210-9876', '(11) 82109-8765', '(11) 81098-7654', '(11) 80987-6543'
];

// Função para gerar data aleatória nos últimos 6 meses
const gerarDataAleatoria = (mesesAtras = 6) => {
  const agora = new Date();
  const dataInicio = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, 1);
  const dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  
  const timestamp = dataInicio.getTime() + Math.random() * (dataFim.getTime() - dataInicio.getTime());
  return new Date(timestamp);
};

// Função para gerar horário comercial
const gerarHorarioComercial = (data) => {
  const horas = [9, 10, 11, 14, 15, 16, 17, 18];
  const minutos = [0, 30];
  
  const horaAleatoria = horas[Math.floor(Math.random() * horas.length)];
  const minutoAleatorio = minutos[Math.floor(Math.random() * minutos.length)];
  
  const novaData = new Date(data);
  novaData.setHours(horaAleatoria, minutoAleatorio, 0, 0);
  
  return novaData;
};

// Função principal para criar massa de dados
const criarMassaDados = async () => {
  try {
    console.log('🗑️  Limpando dados existentes...');
    
    // Limpar dados existentes
    await Promise.all([
      User.deleteMany({}),
      Servico.deleteMany({}),
      Produto.deleteMany({}),
      Agendamento.deleteMany({}),
      Caixa.deleteMany({})
    ]);

    console.log('👥 Criando usuários...');
    
    // Criar usuários
    const usuariosCriados = [];
    for (const userData of usuariosData) {
      const usuario = new User({
        nome: userData.nome,
        email: userData.email,
        telefone: userData.telefone,
        usuario: userData.usuario,
        senhaHash: userData.senha, // O middleware do modelo vai fazer o hash
        role: userData.tipo === 'admin' ? 'admin' : 'barbeiro',
        ativo: userData.ativo
      });
      const usuarioSalvo = await usuario.save();
      usuariosCriados.push(usuarioSalvo);
    }

    console.log('✂️  Criando serviços...');
    
    // Criar serviços
    const servicosCriados = [];
    for (const servicoData of servicosData) {
      const servico = new Servico(servicoData);
      const servicoSalvo = await servico.save();
      servicosCriados.push(servicoSalvo);
    }

    console.log('🧴 Criando produtos...');
    
    // Criar produtos
    const produtosCriados = [];
    for (const produtoData of produtosData) {
      const produto = new Produto(produtoData);
      const produtoSalvo = await produto.save();
      produtosCriados.push(produtoSalvo);
    }

    console.log('📅 Criando agendamentos...');
    
    // Criar agendamentos (300 agendamentos nos últimos 6 meses)
    const agendamentosCriados = [];
    const barbeiros = usuariosCriados.filter(u => u.role === 'barbeiro');
    const statusPossiveis = ['agendado', 'confirmado', 'concluido', 'cancelado'];
    const pesosStatus = [10, 20, 60, 10]; // 60% concluído, 20% confirmado, 10% agendado, 10% cancelado

    console.log(`Barbeiros encontrados: ${barbeiros.length}`);
    console.log(`Serviços criados: ${servicosCriados.length}`);

    if (barbeiros.length === 0) {
      throw new Error('Nenhum barbeiro encontrado!');
    }

    if (servicosCriados.length === 0) {
      throw new Error('Nenhum serviço encontrado!');
    }

    for (let i = 0; i < 300; i++) {
      const clienteNome = nomesClientes[Math.floor(Math.random() * nomesClientes.length)];
      const clienteTelefone = telefones[Math.floor(Math.random() * telefones.length)];
      const servico = servicosCriados[Math.floor(Math.random() * servicosCriados.length)];
      const barbeiro = barbeiros[Math.floor(Math.random() * barbeiros.length)];
      
      if (!servico || !barbeiro) {
        console.error(`Erro no agendamento ${i}: serviço=${!!servico}, barbeiro=${!!barbeiro}`);
        continue;
      }

      // Selecionar status com base nos pesos
      const randomStatus = Math.random() * 100;
      let status;
      if (randomStatus < pesosStatus[0]) status = statusPossiveis[0]; // agendado
      else if (randomStatus < pesosStatus[0] + pesosStatus[1]) status = statusPossiveis[1]; // confirmado  
      else if (randomStatus < pesosStatus[0] + pesosStatus[1] + pesosStatus[2]) status = statusPossiveis[2]; // concluido
      else status = statusPossiveis[3]; // cancelado

      const dataAgendamento = gerarDataAleatoria(6);
      const dataHora = gerarHorarioComercial(dataAgendamento);

      // Variação de preço (±20% do preço base)
      const variacao = (Math.random() - 0.5) * 0.4; // -20% a +20%
      const precoFinal = servico.preco * (1 + variacao);

      const agendamento = new Agendamento({
        clienteNome,
        clienteTelefone,
        servicoId: servico._id,
        funcionarioId: barbeiro._id,
        dataHora,
        preco: Math.round(precoFinal * 100) / 100, // Arredondar para 2 casas decimais
        status,
        observacoes: i % 10 === 0 ? 'Cliente preferencial - atendimento especial' : undefined,
        metodoPagamento: status === 'concluido' ? ['dinheiro', 'cartao_debito', 'cartao_credito', 'pix'][Math.floor(Math.random() * 4)] : undefined,
        origem: ['presencial', 'whatsapp', 'telefone'][Math.floor(Math.random() * 3)],
        lembreteEnviado: status !== 'agendado',
        createdAt: new Date(dataAgendamento.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Criado até 7 dias antes
        updatedAt: dataAgendamento
      });

      // Remover temporariamente a validação de data futura para dados históricos
      agendamento.validateSync = function() { return null; };
      
      const agendamentoSalvo = await agendamento.save({ validateBeforeSave: false });
      agendamentosCriados.push(agendamentoSalvo);
    }

    console.log('💰 Criando movimentações de caixa...');
    
    // Criar movimentações de caixa baseadas nos agendamentos concluídos
    const agendamentosConcluidos = agendamentosCriados.filter(a => a.status === 'concluido');
    
    // Agrupar entradas por data
    const entradasPorData = {};
    for (const agendamento of agendamentosConcluidos) {
      const dataStr = agendamento.dataHora.toISOString().split('T')[0]; // YYYY-MM-DD
      const hora = agendamento.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      if (!entradasPorData[dataStr]) {
        entradasPorData[dataStr] = [];
      }
      
      entradasPorData[dataStr].push({
        valor: agendamento.preco,
        descricao: `${agendamento.clienteNome} - Serviço`,
        hora
      });
    }

    // Criar saídas (despesas) realistas agrupadas por data
    const saidasPorData = {};
    const categoriasSaidas = [
      { nome: 'energia', descricoes: ['Conta de luz', 'Energia elétrica'] },
      { nome: 'agua', descricoes: ['Conta de água', 'Saneamento'] },
      { nome: 'aluguel', descricoes: ['Aluguel do salão', 'Taxa de ocupação'] },
      { nome: 'produtos', descricoes: ['Compra de produtos', 'Estoque shampoo', 'Reposição pomadas', 'Produtos de limpeza'] },
      { nome: 'salarios', descricoes: ['Salário João', 'Salário Carlos', 'Salário Pedro', '13º salário', 'Férias'] },
      { nome: 'manutencao', descricoes: ['Manutenção cadeiras', 'Reparo equipamentos', 'Troca de lâmpadas'] },
      { nome: 'marketing', descricoes: ['Facebook Ads', 'Material gráfico', 'Cartões de visita'] },
      { nome: 'impostos', descricoes: ['IRPJ', 'ISS', 'Contribuições federais'] }
    ];

    // Gerar despesas mensais
    for (let mes = 0; mes < 6; mes++) {
      const dataBase = new Date();
      dataBase.setMonth(dataBase.getMonth() - mes);
      
      for (const categoria of categoriasSaidas) {
        const numSaidas = categoria.nome === 'produtos' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numSaidas; i++) {
          const diaAleatorio = 1 + Math.floor(Math.random() * 28);
          const dataSaida = new Date(dataBase.getFullYear(), dataBase.getMonth(), diaAleatorio);
          const dataStr = dataSaida.toISOString().split('T')[0];
          const hora = `${9 + Math.floor(Math.random() * 9)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
          
          let valorSaida;
          switch (categoria.nome) {
            case 'aluguel':
              valorSaida = 2500 + Math.random() * 500; // R$ 2500-3000
              break;
            case 'salarios':
              valorSaida = 1800 + Math.random() * 800; // R$ 1800-2600
              break;
            case 'energia':
              valorSaida = 350 + Math.random() * 200; // R$ 350-550
              break;
            case 'agua':
              valorSaida = 120 + Math.random() * 80; // R$ 120-200
              break;
            case 'produtos':
              valorSaida = 200 + Math.random() * 600; // R$ 200-800
              break;
            case 'manutencao':
              valorSaida = 150 + Math.random() * 350; // R$ 150-500
              break;
            case 'marketing':
              valorSaida = 300 + Math.random() * 500; // R$ 300-800
              break;
            case 'impostos':
              valorSaida = 400 + Math.random() * 600; // R$ 400-1000
              break;
            default:
              valorSaida = 100 + Math.random() * 300;
          }

          const descricao = categoria.descricoes[Math.floor(Math.random() * categoria.descricoes.length)];
          
          if (!saidasPorData[dataStr]) {
            saidasPorData[dataStr] = [];
          }
          
          saidasPorData[dataStr].push({
            valor: Math.round(valorSaida * 100) / 100,
            descricao,
            hora
          });
        }
      }
    }

    // Criar registros de caixa agrupados por data
    const todasAsDatas = new Set([...Object.keys(entradasPorData), ...Object.keys(saidasPorData)]);
    
    for (const data of todasAsDatas) {
      const entradas = entradasPorData[data] || [];
      const saidas = saidasPorData[data] || [];
      
      const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);
      const totalSaidas = saidas.reduce((sum, s) => sum + s.valor, 0);
      const totalDia = totalEntradas - totalSaidas;
      
      const caixa = new Caixa({
        data,
        entradas,
        saidas,
        totalDia: Math.round(totalDia * 100) / 100
      });
      
      await caixa.save();
    }

    // Estatísticas finais
    const totalAgendamentos = await Agendamento.countDocuments();
    
    // Calcular receita e despesas totais
    const caixas = await Caixa.find({});
    let totalReceita = 0;
    let totalDespesas = 0;
    
    caixas.forEach(caixa => {
      const entradasDia = caixa.entradas.reduce((sum, e) => sum + e.valor, 0);
      const saidasDia = caixa.saidas.reduce((sum, s) => sum + s.valor, 0);
      totalReceita += entradasDia;
      totalDespesas += saidasDia;
    });

    console.log('\n✅ Massa de dados criada com sucesso!');
    console.log('\n📊 ESTATÍSTICAS:');
    console.log(`👥 Usuários criados: ${usuariosCriados.length}`);
    console.log(`✂️  Serviços criados: ${servicosCriados.length}`);
    console.log(`🧴 Produtos criados: ${produtosCriados.length}`);
    console.log(`📅 Agendamentos criados: ${totalAgendamentos}`);
    console.log(`💰 Receita total: R$ ${totalReceita.toFixed(2)}`);
    console.log(`💸 Despesas totais: R$ ${totalDespesas.toFixed(2)}`);
    console.log(`📈 Lucro: R$ ${(totalReceita - totalDespesas).toFixed(2)}`);
    console.log(`📊 Dias com movimentação: ${caixas.length}`);
    
    console.log('\n🔑 CREDENCIAIS DE ACESSO:');
    console.log('Admin: admin / Admin123');
    console.log('Barbeiro: joao / barbeiro123');

  } catch (error) {
    console.error('❌ Erro ao criar massa de dados:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
};

// Executar o script
const main = async () => {
  await connectDB();
  await criarMassaDados();
};

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
