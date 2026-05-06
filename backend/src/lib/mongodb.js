import mongoose from 'mongoose';

// Variável global para armazenar a conexão
global.mongoose = global.mongoose || { conn: null, promise: null };

/**
 * Conexão otimizada para Vercel/Serverless
 * Usa cache global para evitar múltiplas conexões
 */
export async function connectToDatabase() {
  // Se já existe uma conexão, retorna ela
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  // Se há uma promise em andamento, aguarda ela
  if (global.mongoose.promise) {
    global.mongoose.conn = await global.mongoose.promise;
    return global.mongoose.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não definida nas variáveis de ambiente');
  }

  // Configurações otimizadas para Vercel
  const opts = {
    // Configurações de conexão
    serverSelectionTimeoutMS: 5000, // 5 segundos para seleção do servidor
    socketTimeoutMS: 30000, // 30 segundos para operações
    connectTimeoutMS: 10000, // 10 segundos para conectar

    // Configurações de pool
    maxPoolSize: 1, // Apenas 1 conexão no pool para serverless
    minPoolSize: 0, // Sem conexões mínimas
    maxIdleTimeMS: 30000, // Fecha conexões idle após 30s

    // Configurações de buffer
    bufferCommands: false, // CRÍTICO: não fazer buffer de comandos

    // Configurações de retry
    retryWrites: false, // Não retry writes para evitar timeout
    retryReads: false, // Não retry reads para evitar timeout

    // Outras configurações
    heartbeatFrequencyMS: 30000, // Heartbeat a cada 30s
    authSource: 'admin',
  };

  // Criar a promise de conexão
  global.mongoose.promise = mongoose
    .connect(MONGODB_URI, opts)
    .then((mongoose) => {
      return mongoose;
    });

  try {
    global.mongoose.conn = await global.mongoose.promise;
    return global.mongoose.conn;
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
    global.mongoose.promise = null;
    throw error;
  }
}

export default connectToDatabase;
