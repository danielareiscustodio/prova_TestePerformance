// Banco de dados em memória para simplicidade da prova
// Em produção, seria ideal usar MongoDB, PostgreSQL, etc.

class Database {
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
    
    // Usuário padrão para testes
    this.seedData();
  }

  seedData() {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    
    // Usuário admin padrão
    const adminId = uuidv4();
    this.users.set(adminId, {
      id: adminId,
      name: 'Admin User',
      email: 'admin@test.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Usuário comum padrão
    const userId = uuidv4();
    this.users.set(userId, {
      id: userId,
      name: 'Test User',
      email: 'user@test.com',
      password: bcrypt.hashSync('user123', 10),
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Algumas tarefas padrão
    const task1Id = uuidv4();
    this.tasks.set(task1Id, {
      id: task1Id,
      title: 'Tarefa de Exemplo 1',
      description: 'Esta é uma tarefa de exemplo para demonstrar a API',
      completed: false,
      userId: userId,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const task2Id = uuidv4();
    this.tasks.set(task2Id, {
      id: task2Id,
      title: 'Tarefa Concluída',
      description: 'Esta tarefa já foi concluída',
      completed: true,
      userId: userId,
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Métodos para Users
  getAllUsers() {
    return Array.from(this.users.values());
  }

  getUserById(id) {
    return this.users.get(id);
  }

  getUserByEmail(email) {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  createUser(userData) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const user = {
      id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  updateUser(id, updateData) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  deleteUser(id) {
    return this.users.delete(id);
  }

  // Métodos para Tasks
  getAllTasks(userId = null) {
    const tasks = Array.from(this.tasks.values());
    return userId ? tasks.filter(task => task.userId === userId) : tasks;
  }

  getTaskById(id) {
    return this.tasks.get(id);
  }

  createTask(taskData) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const task = {
      id,
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  updateTask(id, updateData) {
    const task = this.tasks.get(id);
    if (!task) return null;
    
    const updatedTask = {
      ...task,
      ...updateData,
      updatedAt: new Date()
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  deleteTask(id) {
    return this.tasks.delete(id);
  }

  getTasksByUserId(userId) {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  // Método para limpar dados (útil para testes)
  clear() {
    this.users.clear();
    this.tasks.clear();
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
  }

  // Método para resetar com dados padrão
  reset() {
    this.clear();
    this.seedData();
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
