const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { authMiddleware, getUser } = require('./middleware/auth');

/**
 * Cria e configura a aplicação Express com todas as rotas e middlewares
 * Esta função é usada tanto para iniciar o servidor quanto para testes externos (E2E)
 * @returns {Promise<{app: Express, server: ApolloServer}>} Aplicação configurada e servidor GraphQL
 */
async function createApp() {
  const app = express();

  // Middleware de segurança (desabilitado em ambiente de teste para facilitar testes)
  if (process.env.NODE_ENV !== 'test') {
    app.use(helmet());
  }
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting - Configurado para testes de performance
  // Desabilitado em ambiente de teste para facilitar testes E2E
  if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 10000 // Aumentado para testes de carga
    });
    app.use('/api/', limiter);
  }

  // Rotas REST API
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', authMiddleware, taskRoutes);
  app.use('/api/users', authMiddleware, userRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Apollo GraphQL Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      // Adicionar contexto de autenticação para GraphQL
      // O GraphQL não usa o authMiddleware das rotas REST,
      // então precisamos extrair o usuário do token manualmente
      const token = req.headers.authorization;
      const user = await getUser(token);
      
      return {
        user: user,
        token: token
      };
    },
    introspection: true,
    playground: process.env.NODE_ENV !== 'test' // Desabilitar playground em testes
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  // Middleware de tratamento de erros
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Erro interno do servidor',
        status: err.status || 500,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Rota 404
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        message: 'Rota não encontrada',
        status: 404,
        path: req.originalUrl
      }
    });
  });

  return { app, server };
}

async function startServer() {
  const { app } = await createApp();

  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 GraphQL Playground disponível em http://localhost:${PORT}/graphql`);
    console.log(`🔗 API REST disponível em http://localhost:${PORT}/api`);
    console.log(`❤️  Health check em http://localhost:${PORT}/health`);
  });
}

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});

module.exports = { startServer, createApp };
