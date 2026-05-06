// Configurações de ambiente para desenvolvimento e produção
export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Configurações do servidor
    PORT: process.env.PORT || 3001,

    // URLs do frontend baseado no ambiente
    FRONTEND_URL: isDevelopment
      ? 'http://localhost:3000'
      : process.env.FRONTEND_URL ||
        'https://barbearia-frontend-caneladas-projects.vercel.app',

    // Configurações CORS
    CORS_ORIGINS: isDevelopment
      ? ['http://localhost:3000', 'http://192.168.18.48:3000']
      : [
          /^https:\/\/.*\.vercel\.app$/,
          'https://frontend-sepia-nine-38.vercel.app',
          'https://frontend-mxim2uke6-caneladas-projects.vercel.app',
          'https://barbearia-frontend-caneladas-projects.vercel.app',
          process.env.FRONTEND_URL,
        ].filter(Boolean),

    // Configurações de database
    MONGODB_URI: process.env.MONGODB_URI,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

    // Outras configurações
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
  };
};

export default getConfig();
