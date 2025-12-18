# Exemplos de Uso da API

## 🔐 Autenticação

### 1. Registrar Usuário (REST)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Usuário",
    "email": "novo@teste.com",
    "password": "senha123",
    "role": "user"
  }'
```

### 2. Fazer Login (REST)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "user123"
  }'
```

### 3. Login via GraphQL
```graphql
mutation Login {
  login(input: {
    email: "user@test.com"
    password: "user123"
  }) {
    user {
      id
      name
      email
      role
    }
    token
    expiresIn
  }
}
```

## 📝 Gerenciamento de Tarefas

### 1. Criar Tarefa (REST)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Estudar para prova",
    "description": "Revisar conteúdo de automação de testes",
    "priority": "high"
  }'
```

### 2. Listar Tarefas (REST)
```bash
curl -X GET "http://localhost:3000/api/tasks?page=1&limit=10&completed=false" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Criar Tarefa via GraphQL
```graphql
mutation CreateTask {
  createTask(input: {
    title: "Implementar testes E2E"
    description: "Criar testes end-to-end para a API"
    priority: HIGH
    completed: false
  }) {
    id
    title
    description
    completed
    priority
    createdAt
    user {
      name
      email
    }
  }
}
```

### 4. Listar Tarefas via GraphQL
```graphql
query GetTasks {
  tasks(completed: false, priority: HIGH, page: 1, limit: 5) {
    tasks {
      id
      title
      description
      completed
      priority
      createdAt
      updatedAt
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
```

### 5. Atualizar Tarefa (REST)
```bash
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Estudar para prova - CONCLUÍDO",
    "completed": true,
    "priority": "high"
  }'
```

### 6. Atualizar Tarefa via GraphQL
```graphql
mutation UpdateTask {
  updateTask(
    id: "TASK_ID"
    input: {
      title: "Tarefa atualizada"
      completed: true
      priority: MEDIUM
    }
  ) {
    id
    title
    completed
    priority
    updatedAt
  }
}
```

### 7. Deletar Tarefa (REST)
```bash
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 8. Deletar Tarefa via GraphQL
```graphql
mutation DeleteTask {
  deleteTask(id: "TASK_ID")
}
```

## 👥 Gerenciamento de Usuários

### 1. Listar Usuários (Admin apenas)
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN_AQUI"
```

### 2. Obter Perfil
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Alterar Senha
```bash
curl -X POST http://localhost:3000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "currentPassword": "senha_atual",
    "newPassword": "nova_senha123",
    "confirmPassword": "nova_senha123"
  }'
```

### 4. Perfil via GraphQL
```graphql
query Me {
  me {
    id
    name
    email
    role
    createdAt
    updatedAt
  }
}
```

### 5. Alterar Senha via GraphQL
```graphql
mutation ChangePassword {
  changePassword(input: {
    currentPassword: "senha_atual"
    newPassword: "nova_senha123"
    confirmPassword: "nova_senha123"
  })
}
```

## 🔍 Queries e Filtros Avançados

### 1. Buscar Tarefas com Filtros
```bash
# Tarefas não concluídas com prioridade alta, página 2, limite 5
curl -X GET "http://localhost:3000/api/tasks?completed=false&priority=high&page=2&limit=5" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 2. Minhas Tarefas Filtradas
```bash
curl -X GET "http://localhost:3000/api/tasks/my?completed=true&priority=medium" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Query GraphQL com Filtros
```graphql
query FilteredTasks {
  myTasks(completed: false, priority: HIGH) {
    id
    title
    description
    priority
    createdAt
  }
}
```

### 4. Buscar Tarefa Específica
```graphql
query GetSpecificTask {
  task(id: "TASK_ID") {
    id
    title
    description
    completed
    priority
    createdAt
    updatedAt
    user {
      id
      name
      email
      role
    }
  }
}
```

## 🛡️ Exemplos de Cenários de Erro

### 1. Acesso Negado (sem token)
```bash
curl -X GET http://localhost:3000/api/tasks
# Retorna: 401 Unauthorized
```

### 2. Token Inválido
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer token_invalido"
# Retorna: 401 Unauthorized
```

### 3. Acesso a Recurso de Outro Usuário
```bash
curl -X GET http://localhost:3000/api/tasks/task_de_outro_usuario \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
# Retorna: 403 Forbidden
```

### 4. Dados Inválidos
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "description": "Tarefa sem título"
  }'
# Retorna: 400 Bad Request com detalhes de validação
```

## 📊 Health Check

```bash
curl -X GET http://localhost:3000/health
```

Resposta:
```json
{
  "status": "OK",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 🔄 Renovar Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer SEU_TOKEN_ATUAL"
```

## 📝 Notas Importantes

1. **Substitua `SEU_TOKEN_AQUI`** pelo token JWT obtido no login
2. **Substitua `TASK_ID`** pelo ID real da tarefa
3. **Use os usuários padrão** para testes iniciais:
   - User: `user@test.com` / `user123`
   - Admin: `admin@test.com` / `admin123`
4. **Headers obrigatórios**:
   - `Content-Type: application/json` para requisições POST/PUT
   - `Authorization: Bearer TOKEN` para endpoints protegidos
5. **GraphQL**: Use o playground em `http://localhost:3000/graphql` para testes interativos
