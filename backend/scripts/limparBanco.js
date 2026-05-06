// Script para limpar dados do banco mantendo apenas usuários
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agendamento from '../src/models/Agendamento.js';
import Caixa from '../src/models/Caixa.js';
import Produto from '../src/models/Produto.js';
import Servico from '../src/models/Servico.js';

dotenv.config();

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não encontrada no ambiente');
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

async function limparBancoDados() {
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await connectDB();

    console.log('🗑️ Limpando dados...');
    
    // Remover agendamentos
    const agendamentosRemovidos = await Agendamento.deleteMany({});
    console.log(`📅 ${agendamentosRemovidos.deletedCount} agendamentos removidos`);

    // Remover entradas de caixa
    const caixaRemovido = await Caixa.deleteMany({});
    console.log(`💰 ${caixaRemovido.deletedCount} entradas de caixa removidas`);

    // Remover produtos
    const produtosRemovidos = await Produto.deleteMany({});
    console.log(`📦 ${produtosRemovidos.deletedCount} produtos removidos`);

    // Remover serviços
    const servicosRemovidos = await Servico.deleteMany({});
    console.log(`✂️ ${servicosRemovidos.deletedCount} serviços removidos`);

    console.log('✅ Limpeza concluída! Usuários mantidos.');
    
  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error);
  } finally {
    await disconnectDB();
    console.log('🔌 Desconectado do banco de dados');
    process.exit(0);
  }
}

// Confirmação de segurança
console.log('⚠️ ATENÇÃO: Este script irá remover TODOS os dados exceto usuários!');
console.log('📊 Dados que serão removidos:');
console.log('   - Agendamentos');
console.log('   - Entradas de caixa');
console.log('   - Produtos');
console.log('   - Serviços');
console.log('');
console.log('👤 Dados que serão MANTIDOS:');
console.log('   - Usuários');
console.log('');

// Executar limpeza
limparBancoDados();
