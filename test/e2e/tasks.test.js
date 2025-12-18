const request = require('supertest');
const { expect } = require('chai');
const database = require('../../src/config/database');
const { createApp } = require('../../src/server');

/**
 * Testes E2E (Externos) de Tasks
 * 
 * Estes testes seguem o conceito correto de teste externo:
 * - Usam a aplicação real (não criam uma nova instância)
 * - Testam a API como um cliente externo faria
 * - Testam tanto REST quanto GraphQL usando a mesma aplicação
 */
describe('Tasks E2E Tests', () => {
  let app;
  let graphqlServer;
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  before(async () => {
    // Criar a aplicação real uma única vez (conceito de teste externo)
    const application = await createApp();
    app = application.app;
    graphqlServer = application.server;
  });

  beforeEach(async () => {
    // Reset database before each test
    database.reset();

    // Obter tokens de autenticação usando a aplicação real
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'user123'
      });
    
    userToken = userLoginResponse.body.data.token;
    userId = userLoginResponse.body.data.user.id;

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    
    adminToken = adminLoginResponse.body.data.token;
    adminId = adminLoginResponse.body.data.user.id;
  });

  after(async () => {
    // Limpar recursos após todos os testes
    if (graphqlServer) {
      await graphqlServer.stop();
    }
  });

  describe('REST API Tasks', () => {
    describe('POST /api/tasks', () => {
      it('deve criar uma nova tarefa', async () => {
        const taskData = {
          title: 'Nova Tarefa de Teste',
          description: 'Descrição da tarefa de teste',
          priority: 'high'
        };

        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send(taskData)
          .expect(201);

        expect(response.body).to.have.property('message');
        expect(response.body.data).to.have.property('task');
        expect(response.body.data.task).to.have.property('title', taskData.title);
        expect(response.body.data.task).to.have.property('userId', userId);
        expect(response.body.data.task).to.have.property('completed', false);
      });

      it('deve validar dados obrigatórios', async () => {
        const invalidData = {
          description: 'Sem título'
        };

        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).to.have.property('error');
        expect(response.body.error).to.have.property('code', 'VALIDATION_ERROR');
      });

      it('deve rejeitar acesso sem autenticação', async () => {
        const taskData = {
          title: 'Tarefa Não Autorizada'
        };

        const response = await request(app)
          .post('/api/tasks')
          .send(taskData)
          .expect(401);

        expect(response.body).to.have.property('error');
      });
    });

    describe('GET /api/tasks', () => {
      let taskId;

      beforeEach(async () => {
        // Criar uma tarefa para os testes
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Listagem',
            description: 'Tarefa criada para teste de listagem'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve listar tarefas do usuário', async () => {
        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).to.have.property('message');
        expect(response.body.data).to.have.property('tasks');
        expect(response.body.data).to.have.property('pagination');
        expect(response.body.data.tasks).to.be.an('array');
        
        // Verificar se contém a tarefa criada
        const createdTask = response.body.data.tasks.find(task => task.id === taskId);
        expect(createdTask).to.exist;
        expect(createdTask).to.have.property('userId', userId);
      });

      it('admin deve ver todas as tarefas', async () => {
        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).to.have.property('message');
        expect(response.body.data).to.have.property('tasks');
        expect(response.body.data.tasks).to.be.an('array');
        
        // Admin deve ver tarefas de diferentes usuários
        expect(response.body.data.tasks.length).to.be.greaterThan(0);
      });

      it('deve filtrar por status completed', async () => {
        const response = await request(app)
          .get('/api/tasks?completed=false')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.data.tasks).to.be.an('array');
        response.body.data.tasks.forEach(task => {
          expect(task.completed).to.be.false;
        });
      });

      it('deve implementar paginação', async () => {
        const response = await request(app)
          .get('/api/tasks?page=1&limit=1')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.data).to.have.property('pagination');
        expect(response.body.data.pagination).to.have.property('current', 1);
        expect(response.body.data.pagination).to.have.property('count');
        expect(response.body.data.tasks.length).to.be.at.most(1);
      });
    });

    describe('GET /api/tasks/:id', () => {
      let taskId;

      beforeEach(async () => {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Busca Individual',
            description: 'Tarefa criada para teste de busca por ID'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve retornar tarefa por ID', async () => {
        const response = await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).to.have.property('message');
        expect(response.body.data).to.have.property('task');
        expect(response.body.data.task).to.have.property('id', taskId);
        expect(response.body.data.task).to.have.property('title', 'Tarefa para Busca Individual');
      });

      it('deve retornar 404 para tarefa inexistente', async () => {
        const response = await request(app)
          .get('/api/tasks/nonexistent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);

        expect(response.body).to.have.property('error');
        expect(response.body.error).to.have.property('code', 'TASK_NOT_FOUND');
      });

      it('deve negar acesso a tarefa de outro usuário', async () => {
        // Criar outro usuário
        await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Other User',
            email: 'other@test.com',
            password: 'password123'
          });

        const otherUserLogin = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'other@test.com',
            password: 'password123'
          });

        const response = await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${otherUserLogin.body.data.token}`)
          .expect(403);

        expect(response.body).to.have.property('error');
        expect(response.body.error).to.have.property('code', 'ACCESS_DENIED');
      });
    });

    describe('PUT /api/tasks/:id', () => {
      let taskId;

      beforeEach(async () => {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Atualização',
            description: 'Tarefa criada para teste de atualização'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve atualizar tarefa', async () => {
        const updateData = {
          title: 'Tarefa Atualizada',
          completed: true,
          priority: 'high'
        };

        const response = await request(app)
          .put(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).to.have.property('message');
        expect(response.body.data).to.have.property('task');
        expect(response.body.data.task).to.have.property('title', updateData.title);
        expect(response.body.data.task).to.have.property('completed', true);
        expect(response.body.data.task).to.have.property('priority', 'high');
      });

      it('deve retornar 404 para tarefa inexistente', async () => {
        const response = await request(app)
          .put('/api/tasks/nonexistent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: 'Nova Título' })
          .expect(404);

        expect(response.body).to.have.property('error');
        expect(response.body.error).to.have.property('code', 'TASK_NOT_FOUND');
      });
    });

    describe('DELETE /api/tasks/:id', () => {
      let taskId;

      beforeEach(async () => {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Deleção',
            description: 'Tarefa criada para teste de deleção'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve deletar tarefa', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).to.have.property('message');

        // Verificar se foi realmente deletada
        await request(app)
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('deve retornar 404 para tarefa inexistente', async () => {
        const response = await request(app)
          .delete('/api/tasks/nonexistent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);

        expect(response.body).to.have.property('error');
        expect(response.body.error).to.have.property('code', 'TASK_NOT_FOUND');
      });
    });
  });

  describe('GraphQL Tasks', () => {
    describe('Create Task Mutation', () => {
      it('deve criar tarefa via GraphQL', async () => {
        const mutation = `
          mutation CreateTask($input: CreateTaskInput!) {
            createTask(input: $input) {
              id
              title
              description
              completed
              priority
              userId
              createdAt
              updatedAt
            }
          }
        `;

        const variables = {
          input: {
            title: 'Tarefa GraphQL',
            description: 'Criada via GraphQL',
            priority: 'HIGH'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: mutation,
            variables
          })
          .expect(200);

        expect(response.body.data).to.have.property('createTask');
        expect(response.body.data.createTask).to.have.property('title', variables.input.title);
        expect(response.body.data.createTask).to.have.property('userId', userId);
        expect(response.body.data.createTask).to.have.property('priority', 'high');
      });

      it('deve rejeitar criação sem autenticação', async () => {
        const mutation = `
          mutation CreateTask($input: CreateTaskInput!) {
            createTask(input: $input) {
              id
              title
            }
          }
        `;

        const variables = {
          input: {
            title: 'Tarefa Não Autorizada'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .send({
            query: mutation,
            variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
        expect(response.body.errors[0]).to.have.property('message')
          .that.includes('logado');
      });
    });

    describe('Tasks Query', () => {
      let taskId;

      beforeEach(async () => {
        // Criar tarefa via REST para usar nos testes GraphQL
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para GraphQL Query',
            description: 'Tarefa para teste de query GraphQL',
            priority: 'medium'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve listar tarefas via GraphQL', async () => {
        const query = `
          query GetTasks {
            tasks {
              tasks {
                id
                title
                description
                completed
                priority
                userId
                user {
                  id
                  name
                  email
                }
              }
              pagination {
                current
                total
                count
                totalItems
              }
            }
          }
        `;

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ query })
          .expect(200);

        expect(response.body.data).to.have.property('tasks');
        expect(response.body.data.tasks).to.have.property('tasks');
        expect(response.body.data.tasks).to.have.property('pagination');
        expect(response.body.data.tasks.tasks).to.be.an('array');

        const createdTask = response.body.data.tasks.tasks.find(task => task.id === taskId);
        expect(createdTask).to.exist;
        expect(createdTask).to.have.property('title', 'Tarefa para GraphQL Query');
        expect(createdTask).to.have.property('user');
        expect(createdTask.user).to.have.property('email', 'user@test.com');
      });

      it('deve buscar tarefa específica via GraphQL', async () => {
        const query = `
          query GetTask($id: ID!) {
            task(id: $id) {
              id
              title
              description
              completed
              priority
              userId
              user {
                id
                name
                email
              }
            }
          }
        `;

        const variables = { id: taskId };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query,
            variables
          })
          .expect(200);

        expect(response.body.data).to.have.property('task');
        expect(response.body.data.task).to.have.property('id', taskId);
        expect(response.body.data.task).to.have.property('title', 'Tarefa para GraphQL Query');
        expect(response.body.data.task).to.have.property('user');
      });

      it('deve filtrar tarefas por completed', async () => {
        const query = `
          query GetTasks($completed: Boolean) {
            tasks(completed: $completed) {
              tasks {
                id
                completed
              }
            }
          }
        `;

        const variables = { completed: false };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query,
            variables
          })
          .expect(200);

        expect(response.body.data.tasks.tasks).to.be.an('array');
        response.body.data.tasks.tasks.forEach(task => {
          expect(task.completed).to.be.false;
        });
      });
    });

    describe('Update Task Mutation', () => {
      let taskId;

      beforeEach(async () => {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Update GraphQL',
            description: 'Tarefa para teste de update GraphQL'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve atualizar tarefa via GraphQL', async () => {
        const mutation = `
          mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
            updateTask(id: $id, input: $input) {
              id
              title
              description
              completed
              priority
              updatedAt
            }
          }
        `;

        const variables = {
          id: taskId,
          input: {
            title: 'Tarefa Atualizada via GraphQL',
            completed: true,
            priority: 'HIGH'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: mutation,
            variables
          })
          .expect(200);

        expect(response.body.data).to.have.property('updateTask');
        expect(response.body.data.updateTask).to.have.property('title', variables.input.title);
        expect(response.body.data.updateTask).to.have.property('completed', true);
        expect(response.body.data.updateTask).to.have.property('priority', 'high');
      });

      it('deve rejeitar update de tarefa inexistente', async () => {
        const mutation = `
          mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
            updateTask(id: $id, input: $input) {
              id
              title
            }
          }
        `;

        const variables = {
          id: 'nonexistent-id',
          input: {
            title: 'Novo Título'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: mutation,
            variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
        expect(response.body.errors[0]).to.have.property('message', 'Tarefa não encontrada');
      });
    });

    describe('Delete Task Mutation', () => {
      let taskId;

      beforeEach(async () => {
        const taskResponse = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Tarefa para Delete GraphQL',
            description: 'Tarefa para teste de delete GraphQL'
          });
        
        taskId = taskResponse.body.data.task.id;
      });

      it('deve deletar tarefa via GraphQL', async () => {
        const mutation = `
          mutation DeleteTask($id: ID!) {
            deleteTask(id: $id)
          }
        `;

        const variables = { id: taskId };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: mutation,
            variables
          })
          .expect(200);

        expect(response.body.data).to.have.property('deleteTask', true);

        // Verificar se foi realmente deletada
        const checkQuery = `
          query GetTask($id: ID!) {
            task(id: $id) {
              id
            }
          }
        `;

        const checkResponse = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            query: checkQuery,
            variables: { id: taskId }
          })
          .expect(200);

        expect(checkResponse.body).to.have.property('errors');
        expect(checkResponse.body.errors[0]).to.have.property('message', 'Tarefa não encontrada');
      });
    });
  });
});
