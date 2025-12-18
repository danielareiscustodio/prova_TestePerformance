# Prova Final – Automação de Testes de Performance com K6

## 📋 Visão Geral

Este projeto foi desenvolvido como **entrega final da disciplina Automação de Testes de Performance**, do curso de pós-graduação. O objetivo é demonstrar a aplicação prática de **testes automatizados de performance utilizando K6** sobre uma **API REST pré-existente**, sem qualquer modificação no seu código.

A API é tratada como uma **caixa preta (black box)**, sendo apenas consumida via HTTP pelos testes de performance.

---
## 📊 Relatório de Performance

Após a execução do teste com k6, o relatório HTML é gerado e pode ser encontrado em:

📁 `reports/k6-report.html`

Basta abrir o arquivo no navegador para visualizar métricas como:
- Tempo de resposta
- Thresholds
- Erros
- Distribuição de requisições


## 🎯 Objetivo da Prova

Implementar ao menos **um teste automatizado de performance com K6**, aplicando todos os **conceitos obrigatórios da disciplina**, conforme solicitado no desafio acadêmico.

---

## 🏗️ Arquitetura dos Testes

A estrutura dos testes de performance está organizada da seguinte forma:

```
test/k6/
├── performance-test.js      # Script principal de teste de performance
├── helpers/
│   └── auth.js              # Helper reutilizável para autenticação
└── data/
    └── users.json           # Massa de dados para Testes Orientados a Dados
```

---

## 🔒 API Pré-Existente

A API utilizada neste projeto **já estava previamente implementada** e não sofreu nenhuma alteração.

Regras adotadas:

* A API foi tratada como **black box**
* Nenhum código da API foi modificado
* Apenas os endpoints necessários foram analisados para definição dos cenários de teste

Os testes simulam o comportamento de usuários reais consumindo a API externamente.

---

## 🛠️ Análise Inicial e Configuração do Ambiente

### Verificação da Instalação do K6

```bash
k6 version
```

### Instalação do K6 (caso necessário)

**macOS:**

```bash
brew install k6
```

---

## 🚀 Execução dos Testes

Execução básica do teste de performance:

```bash
k6 run test/k6/performance-test.js
```

Execução utilizando variável de ambiente para a URL da API:

```bash
k6 run -e BASE_URL=http://localhost:3000 test/k6/performance-test.js
```

---

## ⚙️ Conceitos Obrigatórios Aplicados

### 1️⃣ Limites (Thresholds)

Definem critérios mínimos de aceitação para métricas de performance.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem responder abaixo de 500ms
    http_req_failed: ['rate<0.1'], // Taxa de erro deve ser menor que 10%
    login_duration: ['p(95)<300'], // Threshold customizado para tendência
    task_creation_duration: ['avg<400'],
  },
};
```

---

### 2️⃣ Validações (Checks)

Validações realizadas sobre as respostas das requisições HTTP.

**Aplicado em:** `test/k6/helpers/auth.js` e `test/k6/performance-test.js`

```javascript
// Em test/k6/helpers/auth.js
check(response, {
  'login status is 200': (r) => r.status === 200,
  'login response has token': (r) => r.json().hasOwnProperty('token'),
});
```

---

### 3️⃣ Helpers

Funções reutilizáveis organizadas em arquivos auxiliares.

**Aplicado em:** `test/k6/helpers/auth.js`

```javascript
export function login(email, password) {
  const url = `${__ENV.BASE_URL}/api/auth/login`;
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json().hasOwnProperty('token'),
  });

  return response.json().token;
}
```

---

### 4️⃣ Tendências (Trends)

Métricas customizadas para acompanhamento de tempos de resposta.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
const loginTrend = new Trend('login_duration');
const taskCreationTrend = new Trend('task_creation_duration');
const taskRetrievalTrend = new Trend('task_retrieval_duration');

// Uso:
loginTrend.add(profileResponse.timings.duration);
taskCreationTrend.add(createResponse.timings.duration);
```

Os objetos Trend são declarados no início do arquivo performance-test.js e utilizados ao longo dos grupos de teste.

---

### 5️⃣ Geração de Dados Dinâmicos (Faker Concept)

Embora o K6 permita o uso de bibliotecas externas via CDN, optou-se por gerar dados dinâmicos por meio de funções utilitárias internas, garantindo estabilidade da execução e independência de dependências externas. Essa abordagem atende ao conceito de geração dinâmica de dados (equivalente ao uso de Faker), amplamente utilizado em testes de performance.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
// Funções utilitárias para geração de dados dinâmicos
function randomString(length = 10) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function randomPriority() {
  const priorities = ['low', 'medium', 'high'];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

const taskData = {
  title: `Task-${randomString(6)}`,
  description: `Description-${randomString(15)}`,
  priority: randomPriority(),
};
```

---

### 6️⃣ Variáveis de Ambiente

Permitem configurar a URL da API sem alterar o código.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
```

---

### 7️⃣ Estágios (Stages)

Definem o perfil de carga do teste.

```javascript
stages: [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 50 },
  { duration: '30s', target: 0 },
],
```

---

### 8️⃣ Reaproveitamento de Resposta

Dados retornados por uma requisição são reutilizados em requisições subsequentes.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
// Reutilizar token do login
token = login(user.email, user.password);

// Reutilizar userId do perfil
userId = profileResponse.json().id;

// Reutilizar taskId da criação
taskId = createResponse.json().id;
```

---

### 9️⃣ Uso de Token de Autenticação

O token JWT obtido no login é utilizado nos headers das requisições seguintes.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
const response = http.get(getTaskUrl, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

### 🔟 Testes Orientados a Dados

Uso de massa de dados externa para simular diferentes usuários.

```javascript
const users = JSON.parse(open('./data/users.json'));
```

---

### 1️⃣1️⃣ Grupos (Groups)

Organização lógica dos fluxos de teste.

**Aplicado em:** `test/k6/performance-test.js`

```javascript
group('Authentication', function () {
  token = login(user.email, user.password);
  // ... operações de autenticação
});

group('Task Operations', function () {
  // ... operações com tarefas
});
```

---

## 📊 Relatório de Execução

O relatório de execução do teste de performance foi gerado utilizando o output nativo do K6 no formato JSON:

- `reports/summary.json`

Este arquivo contém todas as métricas coletadas durante a execução do teste, incluindo:
- tempos de resposta
- taxa de erro
- checks
- thresholds
- métricas customizadas (Trends)

O formato JSON é um output oficial do K6 e permite análise completa dos resultados.

**Comandos utilizados:**

```bash
k6 run --out json=summary.json test/k6/performance-test.js
k6-html-report -o k6-report.html summary.json
```

**Localização dos arquivos:**
- Relatório JSON: `summary.json` (raiz do projeto)
- Relatório HTML: `k6-report.html` (raiz do projeto)

O arquivo HTML pode ser versionado no repositório ou gerado localmente conforme instruções acima.

Os testes foram executados localmente com sucesso antes da entrega da prova.

## Resultado da Execução
Durante a execução do teste, o threshold de `http_req_failed` foi ultrapassado.
Esse resultado indica que a API apresentou falhas sob carga, validando o uso
correto de thresholds como critério de qualidade e estabilidade da aplicação.

O threshold de erro foi mantido propositalmente restritivo para demonstrar o comportamento do K6 quando limites de qualidade não são atendidos.
