import mongoose from 'mongoose';
import logger from '../utils/logger.js';

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // Se já conectado, retorna a conexão existente
      if (mongoose.connection.readyState === 1) {
        logger.info('✅ Usando conexão MongoDB existente');
        return mongoose.connection;
      }

      const MONGODB_URI = process.env.MONGODB_URI;

      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI não definida nas variáveis de ambiente');
      }

      // Configurações otimizadas para Vercel/Serverless
      const options = {
        maxPoolSize: 1, // Conexão única para serverless
        serverSelectionTimeoutMS: 5000, // Timeout rápido para seleção
        socketTimeoutMS: 15000, // Timeout de socket reduzido
        connectTimeoutMS: 10000, // Timeout de conexão mais rápido
        bufferCommands: false, // CRÍTICO: Desabilita buffering
        maxIdleTimeMS: 10000, // Fecha conexões idle rapidamente
        retryWrites: false, // Desabilita retry para evitar timeout
        retryReads: false, // Desabilita retry para evitar timeout
        heartbeatFrequencyMS: 30000,
        // Configurações específicas para MongoDB Atlas
        ssl: true,
        authSource: 'admin',
      };

      logger.info('🔄 Conectando ao MongoDB...');

      this.connection = await mongoose.connect(MONGODB_URI, options);

      logger.info('✅ Conectado ao MongoDB com sucesso');

      // Event listeners para monitoramento
      mongoose.connection.on('error', (error) => {
        logger.error('❌ Erro na conexão com MongoDB:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB desconectado');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🔄 MongoDB reconectado');
      });

      mongoose.connection.on('timeout', () => {
        logger.error('⏰ Timeout na conexão MongoDB');
      });

      return this.connection;
    } catch (error) {
      logger.error('❌ Erro ao conectar com MongoDB:', error);

      // Em ambiente serverless, não sair do processo
      if (process.env.NODE_ENV === 'production') {
        throw error;
      } else {
        process.exit(1);
      }
    }
  }

  async disconnect() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        this.connection = null;
        logger.info('🔌 Desconectado do MongoDB');
      }
    } catch (error) {
      logger.error('❌ Erro ao desconectar MongoDB:', error);
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  // Função para garantir conexão antes de operações
  async ensureConnection() {
    if (!this.isConnected()) {
      await this.connect();
    }
    return this.connection;
  }
}

export default new Database();
