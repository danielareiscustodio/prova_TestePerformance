import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { login } from './helpers/auth.js';

// Funções utilitárias para geração de dados dinâmicos
function randomString(length = 10) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function randomPriority() {
  const priorities = ['low', 'medium', 'high'];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

// Métricas customizadas
const loginTrend = new Trend('login_duration');
const taskCreationTrend = new Trend('task_creation_duration');
const taskRetrievalTrend = new Trend('task_retrieval_duration');

// Thresholds
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem ser abaixo de 500ms
    http_req_failed: ['rate<0.1'], // Taxa de erro deve ser menor que 10%
    login_duration: ['p(95)<300'], // Threshold customizado para tendência
    task_creation_duration: ['avg<400'],
  },
  stages: [
    { duration: '30s', target: 10 }, // Aumentar para 10 usuários em 30s
    { duration: '1m', target: 50 }, // Aumentar para 50 usuários em 1m
    { duration: '2m', target: 50 }, // Manter 50 usuários por 2m
    { duration: '30s', target: 0 }, // Diminuir para 0 usuários
  ],
};

// Variáveis de ambiente
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Carregar dados de teste
const users = JSON.parse(open('./data/users.json'));

export function setup() {
  // Registrar usuários uma vez
  for (const user of users) {
    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.name,
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Não verificar, pois pode já existir
  }
}

export default function () {
  // Data-driven: selecionar um usuário aleatório
  const user = users[Math.floor(Math.random() * users.length)];

  let token;
  let userId;
  let taskId;

  group('Authentication', function () {
    // Usar helper para login
    token = login(user.email, user.password);

    // Reutilizando resposta: assumir que login retorna id do usuário ou obter do perfil
    const profileUrl = `${BASE_URL}/api/auth/profile`;
    const profileResponse = http.get(profileUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile has user data': (r) => r.json().data && r.json().data.user && r.json().data.user.hasOwnProperty('id'),
    });

    userId = profileResponse.json().data.user.id;

    loginTrend.add(profileResponse.timings.duration);
  });

  sleep(1);

  group('Task Operations', function () {
    // Criar tarefa usando funções utilitárias para dados dinâmicos
    const taskData = {
      title: `Task-${randomString(6)}`,
      description: `Description-${randomString(15)}`,
      priority: randomPriority(),
    };

    const createTaskUrl = `${BASE_URL}/api/tasks`;
    const createResponse = http.post(createTaskUrl, JSON.stringify(taskData), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    check(createResponse, {
      'create task status is 201': (r) => r.status === 201,
      'create task has id': (r) => r.json().data && r.json().data.task && r.json().data.task.hasOwnProperty('id'),
    });

    taskId = createResponse.json().data.task.id;
    taskCreationTrend.add(createResponse.timings.duration);

    sleep(1);

    // Recuperar tarefa
    const getTaskUrl = `${BASE_URL}/api/tasks/${taskId}`;
    const getResponse = http.get(getTaskUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    check(getResponse, {
      'get task status is 200': (r) => r.status === 200,
      'get task data matches': (r) => r.json().data && r.json().data.task && r.json().data.task.title === taskData.title,
    });

    taskRetrievalTrend.add(getResponse.timings.duration);

    sleep(1);

    // Atualizar tarefa
    const updateData = {
      completed: true,
    };

    const updateTaskUrl = `${BASE_URL}/api/tasks/${taskId}`;
    const updateResponse = http.put(updateTaskUrl, JSON.stringify(updateData), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    check(updateResponse, {
      'update task status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}