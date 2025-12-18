const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const database = require('../../config/database');
const { getUser } = require('../../middleware/auth');

// Scalar personalizado para DateTime
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Função para verificar autenticação
const requireAuth = (user) => {
  if (!user) {
    throw new AuthenticationError('Você precisa estar logado para acessar este recurso');
  }
  return user;
};

// Função para verificar role de admin
const requireAdmin = (user) => {
  requireAuth(user);
  if (user.role !== 'admin') {
    throw new ForbiddenError('Acesso negado. Permissões de administrador necessárias');
  }
  return user;
};

const resolvers = {
  DateTime: DateTimeScalar,

  // Resolvers para campos aninhados
  Task: {
    user: (task) => {
      const user = database.getUserById(task.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    }
  },

  Query: {
    // Auth
    me: async (parent, args, context) => {
      const user = await getUser(context.token);
      requireAuth(user);
      const fullUser = database.getUserById(user.id);
      if (fullUser) {
        const { password, ...userWithoutPassword } = fullUser;
        return userWithoutPassword;
      }
      return null;
    },

    // Users
    users: async (parent, args, context) => {
      const user = await getUser(context.token);
      requireAdmin(user);
      
      const users = database.getAllUsers();
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    },

    user: async (parent, { id }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);
      
      const targetUser = database.getUserById(id);
      if (!targetUser) {
        throw new UserInputError('Usuário não encontrado');
      }

      const { password, ...userWithoutPassword } = targetUser;
      return userWithoutPassword;
    },

    // Tasks
    tasks: async (parent, { completed, priority, page = 1, limit = 10 }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      // Para usuários normais, mostrar apenas suas tarefas
      // Para admins, mostrar todas as tarefas
      const userId = user.role === 'admin' ? null : user.id;
      let tasks = database.getAllTasks(userId);

      // Aplicar filtros
      if (completed !== undefined) {
        tasks = tasks.filter(task => task.completed === completed);
      }

      if (priority) {
        tasks = tasks.filter(task => task.priority.toLowerCase() === priority.toLowerCase());
      }

      // Paginação
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTasks = tasks.slice(startIndex, endIndex);

      return {
        tasks: paginatedTasks,
        pagination: {
          current: page,
          total: Math.ceil(tasks.length / limit),
          count: paginatedTasks.length,
          totalItems: tasks.length
        }
      };
    },

    task: async (parent, { id }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const task = database.getTaskById(id);
      if (!task) {
        throw new UserInputError('Tarefa não encontrada');
      }

      // Verificar se o usuário pode acessar esta tarefa
      if (user.role !== 'admin' && task.userId !== user.id) {
        throw new ForbiddenError('Acesso negado a esta tarefa');
      }

      return task;
    },

    myTasks: async (parent, { completed, priority }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      let tasks = database.getTasksByUserId(user.id);

      // Aplicar filtros
      if (completed !== undefined) {
        tasks = tasks.filter(task => task.completed === completed);
      }

      if (priority) {
        tasks = tasks.filter(task => task.priority.toLowerCase() === priority.toLowerCase());
      }

      return tasks;
    }
  },

  Mutation: {
    // Auth
    register: async (parent, { input }) => {
      const { name, email, password, role = 'USER' } = input;

      // Verificar se usuário já existe
      const existingUser = database.getUserByEmail(email);
      if (existingUser) {
        throw new UserInputError('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = database.createUser({
        name,
        email,
        password: hashedPassword,
        role: role.toLowerCase()
      });

      // Gerar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remover senha da resposta
      const { password: _, ...userResponse } = user;

      return {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
    },

    login: async (parent, { input }) => {
      const { email, password } = input;

      // Buscar usuário
      const user = database.getUserByEmail(email);
      if (!user) {
        throw new AuthenticationError('Credenciais inválidas');
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Credenciais inválidas');
      }

      // Gerar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remover senha da resposta
      const { password: _, ...userResponse } = user;

      return {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
    },

    refreshToken: async (parent, args, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      // Gerar novo token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const fullUser = database.getUserById(user.id);
      const { password, ...userResponse } = fullUser;

      return {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
    },

    // Users
    updateUser: async (parent, { id, input }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const existingUser = database.getUserById(id);
      if (!existingUser) {
        throw new UserInputError('Usuário não encontrado');
      }

      // Verificar se o usuário pode editar este perfil
      if (user.role !== 'admin' && user.id !== id) {
        throw new ForbiddenError('Acesso negado para editar este usuário');
      }

      // Se tentando alterar email, verificar se já existe
      if (input.email && input.email !== existingUser.email) {
        const userWithEmail = database.getUserByEmail(input.email);
        if (userWithEmail) {
          throw new UserInputError('Email já está em uso');
        }
      }

      // Apenas admins podem alterar roles
      if (input.role && user.role !== 'admin') {
        throw new ForbiddenError('Apenas administradores podem alterar roles');
      }

      const updateData = { ...input };
      if (updateData.role) {
        updateData.role = updateData.role.toLowerCase();
      }

      const updatedUser = database.updateUser(id, updateData);
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    },

    deleteUser: async (parent, { id }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const existingUser = database.getUserById(id);
      if (!existingUser) {
        throw new UserInputError('Usuário não encontrado');
      }

      // Verificar permissões
      if (user.role !== 'admin' && user.id !== id) {
        throw new ForbiddenError('Acesso negado para deletar este usuário');
      }

      // Não permitir que delete o último admin
      if (existingUser.role === 'admin') {
        const allUsers = database.getAllUsers();
        const adminCount = allUsers.filter(user => user.role === 'admin').length;
        
        if (adminCount === 1) {
          throw new UserInputError('Não é possível deletar o último administrador');
        }
      }

      return database.deleteUser(id);
    },

    changePassword: async (parent, { input }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const { currentPassword, newPassword, confirmPassword } = input;

      if (newPassword !== confirmPassword) {
        throw new UserInputError('Nova senha e confirmação não coincidem');
      }

      const fullUser = database.getUserById(user.id);
      if (!fullUser) {
        throw new UserInputError('Usuário não encontrado');
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, fullUser.password);
      if (!isCurrentPasswordValid) {
        throw new UserInputError('Senha atual incorreta');
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha
      database.updateUser(user.id, { password: hashedNewPassword });

      return true;
    },

    // Tasks
    createTask: async (parent, { input }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const taskData = {
        ...input,
        userId: user.id,
        priority: input.priority ? input.priority.toLowerCase() : 'medium',
        completed: input.completed || false
      };

      return database.createTask(taskData);
    },

    updateTask: async (parent, { id, input }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const existingTask = database.getTaskById(id);
      if (!existingTask) {
        throw new UserInputError('Tarefa não encontrada');
      }

      // Verificar se o usuário pode editar esta tarefa
      if (user.role !== 'admin' && existingTask.userId !== user.id) {
        throw new ForbiddenError('Acesso negado para editar esta tarefa');
      }

      const updateData = { ...input };
      if (updateData.priority) {
        updateData.priority = updateData.priority.toLowerCase();
      }

      return database.updateTask(id, updateData);
    },

    deleteTask: async (parent, { id }, context) => {
      const user = await getUser(context.token);
      requireAuth(user);

      const existingTask = database.getTaskById(id);
      if (!existingTask) {
        throw new UserInputError('Tarefa não encontrada');
      }

      // Verificar se o usuário pode deletar esta tarefa
      if (user.role !== 'admin' && existingTask.userId !== user.id) {
        throw new ForbiddenError('Acesso negado para deletar esta tarefa');
      }

      return database.deleteTask(id);
    }
  }
};

module.exports = resolvers;
