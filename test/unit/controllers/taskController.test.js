const { expect } = require('chai');
const sinon = require('sinon');
const taskController = require('../../../src/controllers/taskController');
const database = require('../../../src/config/database');

describe('TaskController Unit Tests', () => {
  let req, res, next;
  let databaseStub;

  beforeEach(() => {
    // Mock request, response e next
    req = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-id',
        email: 'user@test.com',
        role: 'user'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis()
    };
    
    next = sinon.stub();

    // Stub do database
    databaseStub = sinon.stub(database);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getAllTasks', () => {
    it('deve listar tarefas do usuário comum', async () => {
      // Arrange
      const mockTasks = [
        { id: '1', title: 'Task 1', userId: 'user-id', completed: false },
        { id: '2', title: 'Task 2', userId: 'user-id', completed: true }
      ];

      databaseStub.getAllTasks.returns(mockTasks);

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(databaseStub.getAllTasks.calledOnceWith('user-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('tasks');
      expect(responseData.data).to.have.property('pagination');
      expect(responseData.data.tasks).to.deep.equal(mockTasks);
    });

    it('deve listar todas as tarefas para admin', async () => {
      // Arrange
      req.user.role = 'admin';
      const mockTasks = [
        { id: '1', title: 'Task 1', userId: 'user-1', completed: false },
        { id: '2', title: 'Task 2', userId: 'user-2', completed: true }
      ];

      databaseStub.getAllTasks.returns(mockTasks);

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(databaseStub.getAllTasks.calledOnceWith(null)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.deep.equal(mockTasks);
    });

    it('deve filtrar tarefas por status completed', async () => {
      // Arrange
      req.query.completed = 'true';
      const allTasks = [
        { id: '1', title: 'Task 1', userId: 'user-id', completed: false },
        { id: '2', title: 'Task 2', userId: 'user-id', completed: true }
      ];
      const completedTasks = [
        { id: '2', title: 'Task 2', userId: 'user-id', completed: true }
      ];

      databaseStub.getAllTasks.returns(allTasks);

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(res.status.calledWith(200)).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.lengthOf(1);
      expect(responseData.data.tasks[0].completed).to.be.true;
    });

    it('deve filtrar tarefas por prioridade', async () => {
      // Arrange
      req.query.priority = 'high';
      const allTasks = [
        { id: '1', title: 'Task 1', userId: 'user-id', priority: 'low' },
        { id: '2', title: 'Task 2', userId: 'user-id', priority: 'high' }
      ];

      databaseStub.getAllTasks.returns(allTasks);

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(res.status.calledWith(200)).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.lengthOf(1);
      expect(responseData.data.tasks[0].priority).to.equal('high');
    });

    it('deve implementar paginação', async () => {
      // Arrange
      req.query = { page: '2', limit: '1' };
      const mockTasks = [
        { id: '1', title: 'Task 1', userId: 'user-id' },
        { id: '2', title: 'Task 2', userId: 'user-id' },
        { id: '3', title: 'Task 3', userId: 'user-id' }
      ];

      databaseStub.getAllTasks.returns(mockTasks);

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(res.status.calledWith(200)).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.lengthOf(1);
      expect(responseData.data.tasks[0].id).to.equal('2');
      expect(responseData.data.pagination.current).to.equal(2);
      expect(responseData.data.pagination.total).to.equal(3);
    });

    it('deve tratar erros internos', async () => {
      // Arrange
      databaseStub.getAllTasks.throws(new Error('Database error'));

      // Act
      await taskController.getAllTasks(req, res);

      // Assert
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INTERNAL_ERROR');
    });
  });

  describe('getTaskById', () => {
    it('deve retornar tarefa por ID para o próprio usuário', async () => {
      // Arrange
      req.params.id = 'task-id';
      const mockTask = {
        id: 'task-id',
        title: 'My Task',
        userId: 'user-id'
      };

      databaseStub.getTaskById.returns(mockTask);

      // Act
      await taskController.getTaskById(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('task');
      expect(responseData.data.task).to.deep.equal(mockTask);
    });

    it('deve permitir acesso para admin mesmo que não seja o dono', async () => {
      // Arrange
      req.params.id = 'task-id';
      req.user.role = 'admin';
      const mockTask = {
        id: 'task-id',
        title: 'Other User Task',
        userId: 'other-user-id'
      };

      databaseStub.getTaskById.returns(mockTask);

      // Act
      await taskController.getTaskById(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.task).to.deep.equal(mockTask);
    });

    it('deve retornar 404 para tarefa inexistente', async () => {
      // Arrange
      req.params.id = 'nonexistent-id';
      databaseStub.getTaskById.returns(null);

      // Act
      await taskController.getTaskById(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('nonexistent-id')).to.be.true;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'TASK_NOT_FOUND');
    });

    it('deve negar acesso a tarefa de outro usuário para usuário comum', async () => {
      // Arrange
      req.params.id = 'task-id';
      const mockTask = {
        id: 'task-id',
        title: 'Other User Task',
        userId: 'other-user-id'
      };

      databaseStub.getTaskById.returns(mockTask);

      // Act
      await taskController.getTaskById(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'ACCESS_DENIED');
    });
  });

  describe('createTask', () => {
    it('deve criar tarefa com sucesso', async () => {
      // Arrange
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high'
      };
      
      req.body = taskData;

      const createdTask = {
        id: 'new-task-id',
        ...taskData,
        userId: 'user-id',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      databaseStub.createTask.returns(createdTask);

      // Act
      await taskController.createTask(req, res);

      // Assert
      expect(databaseStub.createTask.calledOnce).to.be.true;
      const createCall = databaseStub.createTask.getCall(0);
      expect(createCall.args[0]).to.have.property('title', taskData.title);
      expect(createCall.args[0]).to.have.property('userId', 'user-id');
      
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('task');
      expect(responseData.data.task).to.deep.equal(createdTask);
    });

    it('deve validar dados obrigatórios', async () => {
      // Arrange
      req.body = {
        description: 'Missing title'
      };

      // Act
      await taskController.createTask(req, res);

      // Assert
      expect(databaseStub.createTask.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'VALIDATION_ERROR');
    });

    it('deve aplicar valores padrão', async () => {
      // Arrange
      req.body = {
        title: 'Simple Task'
      };

      const createdTask = {
        id: 'new-task-id',
        title: 'Simple Task',
        userId: 'user-id',
        priority: 'medium',
        completed: false
      };

      databaseStub.createTask.returns(createdTask);

      // Act
      await taskController.createTask(req, res);

      // Assert
      expect(databaseStub.createTask.calledOnce).to.be.true;
      const createCall = databaseStub.createTask.getCall(0);
      expect(createCall.args[0]).to.have.property('priority', 'medium');
      expect(createCall.args[0]).to.have.property('completed', false);
    });

    it('deve tratar erros internos', async () => {
      // Arrange
      req.body = {
        title: 'Valid Task'
      };

      databaseStub.createTask.throws(new Error('Database error'));

      // Act
      await taskController.createTask(req, res);

      // Assert
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INTERNAL_ERROR');
    });
  });

  describe('updateTask', () => {
    it('deve atualizar tarefa com sucesso', async () => {
      // Arrange
      req.params.id = 'task-id';
      req.body = {
        title: 'Updated Task',
        completed: true
      };

      const existingTask = {
        id: 'task-id',
        title: 'Original Task',
        userId: 'user-id',
        completed: false
      };

      const updatedTask = {
        ...existingTask,
        ...req.body,
        updatedAt: new Date()
      };

      databaseStub.getTaskById.returns(existingTask);
      databaseStub.updateTask.returns(updatedTask);

      // Act
      await taskController.updateTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(databaseStub.updateTask.calledOnceWith('task-id', req.body)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('task');
      expect(responseData.data.task).to.deep.equal(updatedTask);
    });

    it('deve retornar 404 para tarefa inexistente', async () => {
      // Arrange
      req.params.id = 'nonexistent-id';
      req.body = { title: 'Updated Title' };

      databaseStub.getTaskById.returns(null);

      // Act
      await taskController.updateTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('nonexistent-id')).to.be.true;
      expect(databaseStub.updateTask.called).to.be.false;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'TASK_NOT_FOUND');
    });

    it('deve negar acesso a tarefa de outro usuário', async () => {
      // Arrange
      req.params.id = 'task-id';
      req.body = { title: 'Updated Title' };

      const existingTask = {
        id: 'task-id',
        title: 'Other User Task',
        userId: 'other-user-id'
      };

      databaseStub.getTaskById.returns(existingTask);

      // Act
      await taskController.updateTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(databaseStub.updateTask.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'ACCESS_DENIED');
    });

    it('deve validar dados de entrada', async () => {
      // Arrange
      req.params.id = 'task-id';
      req.body = {
        title: '', // Título vazio inválido
        priority: 'invalid-priority'
      };

      // Act
      await taskController.updateTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'VALIDATION_ERROR');
    });
  });

  describe('deleteTask', () => {
    it('deve deletar tarefa com sucesso', async () => {
      // Arrange
      req.params.id = 'task-id';

      const existingTask = {
        id: 'task-id',
        title: 'Task to Delete',
        userId: 'user-id'
      };

      databaseStub.getTaskById.returns(existingTask);
      databaseStub.deleteTask.returns(true);

      // Act
      await taskController.deleteTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(databaseStub.deleteTask.calledOnceWith('task-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
    });

    it('deve retornar 404 para tarefa inexistente', async () => {
      // Arrange
      req.params.id = 'nonexistent-id';
      databaseStub.getTaskById.returns(null);

      // Act
      await taskController.deleteTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('nonexistent-id')).to.be.true;
      expect(databaseStub.deleteTask.called).to.be.false;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'TASK_NOT_FOUND');
    });

    it('deve negar acesso a tarefa de outro usuário', async () => {
      // Arrange
      req.params.id = 'task-id';

      const existingTask = {
        id: 'task-id',
        title: 'Other User Task',
        userId: 'other-user-id'
      };

      databaseStub.getTaskById.returns(existingTask);

      // Act
      await taskController.deleteTask(req, res);

      // Assert
      expect(databaseStub.getTaskById.calledOnceWith('task-id')).to.be.true;
      expect(databaseStub.deleteTask.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'ACCESS_DENIED');
    });

    it('deve tratar erro na deleção', async () => {
      // Arrange
      req.params.id = 'task-id';

      const existingTask = {
        id: 'task-id',
        title: 'Task to Delete',
        userId: 'user-id'
      };

      databaseStub.getTaskById.returns(existingTask);
      databaseStub.deleteTask.returns(false); // Falha na deleção

      // Act
      await taskController.deleteTask(req, res);

      // Assert
      expect(databaseStub.deleteTask.calledOnceWith('task-id')).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'DELETE_ERROR');
    });
  });

  describe('getMyTasks', () => {
    it('deve retornar tarefas do usuário autenticado', async () => {
      // Arrange
      const userTasks = [
        { id: '1', title: 'My Task 1', userId: 'user-id', completed: false },
        { id: '2', title: 'My Task 2', userId: 'user-id', completed: true }
      ];

      databaseStub.getTasksByUserId.returns(userTasks);

      // Act
      await taskController.getMyTasks(req, res);

      // Assert
      expect(databaseStub.getTasksByUserId.calledOnceWith('user-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('tasks');
      expect(responseData.data).to.have.property('count', 2);
      expect(responseData.data.tasks).to.deep.equal(userTasks);
    });

    it('deve filtrar por status completed', async () => {
      // Arrange
      req.query.completed = 'true';
      const userTasks = [
        { id: '1', title: 'My Task 1', userId: 'user-id', completed: false },
        { id: '2', title: 'My Task 2', userId: 'user-id', completed: true }
      ];

      databaseStub.getTasksByUserId.returns(userTasks);

      // Act
      await taskController.getMyTasks(req, res);

      // Assert
      expect(databaseStub.getTasksByUserId.calledOnceWith('user-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.lengthOf(1);
      expect(responseData.data.tasks[0].completed).to.be.true;
      expect(responseData.data.count).to.equal(1);
    });

    it('deve filtrar por prioridade', async () => {
      // Arrange
      req.query.priority = 'high';
      const userTasks = [
        { id: '1', title: 'My Task 1', userId: 'user-id', priority: 'low' },
        { id: '2', title: 'My Task 2', userId: 'user-id', priority: 'high' }
      ];

      databaseStub.getTasksByUserId.returns(userTasks);

      // Act
      await taskController.getMyTasks(req, res);

      // Assert
      expect(databaseStub.getTasksByUserId.calledOnceWith('user-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.lengthOf(1);
      expect(responseData.data.tasks[0].priority).to.equal('high');
      expect(responseData.data.count).to.equal(1);
    });

    it('deve tratar erros internos', async () => {
      // Arrange
      databaseStub.getTasksByUserId.throws(new Error('Database error'));

      // Act
      await taskController.getMyTasks(req, res);

      // Assert
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INTERNAL_ERROR');
    });
  });
});
