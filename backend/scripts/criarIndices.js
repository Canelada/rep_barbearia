/**
 * Script para criar índices no MongoDB
 * Melhora significativamente a performance de queries
 * 
 * Uso: node scripts/criarIndices.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não definida nas variáveis de ambiente');
  process.exit(1);
}

const mongodb = await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  maxPoolSize: 5,
  bufferCommands: false,
  retryWrites: false,
  retryReads: false,
});

const db = mongodb.connection.getClient().db();

const indices = [
  {
    collection: 'agendamentos',
    indices: [
      { keys: { funcionarioId: 1, dataHora: -1 }, options: { name: 'idx_funcionario_data' } },
      { keys: { clienteNome: 1 }, options: { name: 'idx_cliente_nome' } },
      { keys: { clienteTelefone: 1 }, options: { name: 'idx_cliente_telefone' } },
      { keys: { status: 1, dataHora: -1 }, options: { name: 'idx_status_data' } },
      { keys: { dataHora: -1 }, options: { name: 'idx_data_hora' } },
      { keys: { 'servicos.id': 1 }, options: { name: 'idx_servicos' } },
    ]
  },
  {
    collection: 'pagamentocomissaos',
    indices: [
      { keys: { funcionarioId: 1, data: -1 }, options: { name: 'idx_funcionario_data' } },
      { keys: { mes: 1, ano: 1 }, options: { name: 'idx_mes_ano' } },
      { keys: { status: 1 }, options: { name: 'idx_status' } },
    ]
  },
  {
    collection: 'caixas',
    indices: [
      { keys: { data: 1 }, options: { name: 'idx_data', unique: false } },
      { keys: { status: 1, data: -1 }, options: { name: 'idx_status_data' } },
    ]
  },
  {
    collection: 'clientes',
    indices: [
      { keys: { nome: 1 }, options: { name: 'idx_nome' } },
      { keys: { telefone: 1 }, options: { name: 'idx_telefone' } },
      { keys: { email: 1 }, options: { name: 'idx_email' } },
      { keys: { ativo: 1 }, options: { name: 'idx_ativo' } },
      { keys: { dataAniversario: 1 }, options: { name: 'idx_data_aniversario' } },
    ]
  },
  {
    collection: 'conversationstates',
    indices: [
      { keys: { phoneNumber: 1 }, options: { name: 'idx_phone', unique: true } },
      { keys: { updatedAt: -1 }, options: { name: 'idx_updated', expireAfterSeconds: 604800 } }, // 7 dias
    ]
  },
  {
    collection: 'produtos',
    indices: [
      { keys: { nome: 1 }, options: { name: 'idx_nome' } },
      { keys: { categoria: 1 }, options: { name: 'idx_categoria' } },
      { keys: { ativo: 1 }, options: { name: 'idx_ativo' } },
      { keys: { quantidade: 1 }, options: { name: 'idx_quantidade' } },
    ]
  },
  {
    collection: 'servicos',
    indices: [
      { keys: { nome: 1 }, options: { name: 'idx_nome' } },
      { keys: { categoria: 1 }, options: { name: 'idx_categoria' } },
      { keys: { ativo: 1 }, options: { name: 'idx_ativo' } },
    ]
  },
  {
    collection: 'users',
    indices: [
      { keys: { usuario: 1 }, options: { name: 'idx_usuario', unique: true } },
      { keys: { email: 1 }, options: { name: 'idx_email', unique: true } },
      { keys: { role: 1 }, options: { name: 'idx_role' } },
      { keys: { ativo: 1 }, options: { name: 'idx_ativo' } },
    ]
  },
  {
    collection: 'auditlogs',
    indices: [
      { keys: { entidade: 1, createdAt: -1 }, options: { name: 'idx_entidade_data' } },
      { keys: { usuarioId: 1 }, options: { name: 'idx_usuario' } },
      { keys: { acao: 1 }, options: { name: 'idx_acao' } },
      { keys: { createdAt: -1 }, options: { name: 'idx_data', expireAfterSeconds: 7776000 } }, // 90 dias
    ]
  }
];

async function criarIndices() {
  try {
    console.log('📊 Iniciando criação de índices no MongoDB...\n');

    for (const { collection, indices: indicesArray } of indices) {
      try {
        const col = db.collection(collection);
        console.log(`📑 Coleção: ${collection}`);

        for (const { keys, options } of indicesArray) {
          try {
            const resultado = await col.createIndex(keys, options);
            console.log(`  ✅ Índice criado: ${options.name}`);
          } catch (error) {
            if (error.code === 85) {
              console.log(`  ⚠️  Índice ${options.name} já existe`);
            } else {
              console.error(`  ❌ Erro ao criar índice ${options.name}:`, error.message);
            }
          }
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Erro na coleção ${collection}:`, error.message);
      }
    }

    console.log('✅ Processo de criação de índices concluído!');
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

criarIndices();
