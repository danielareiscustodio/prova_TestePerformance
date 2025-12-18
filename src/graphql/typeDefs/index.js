const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    completed: Boolean!
    priority: Priority!
    userId: ID!
    user: User
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    user: User!
    token: String!
    expiresIn: String!
  }

  enum Role {
    USER
    ADMIN
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
    role: Role = USER
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: Priority = MEDIUM
    completed: Boolean = false
  }

  input UpdateTaskInput {
    title: String
    description: String
    priority: Priority
    completed: Boolean
  }

  input UpdateUserInput {
    name: String
    email: String
    role: Role
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
    confirmPassword: String!
  }

  type Query {
    # Auth
    me: User

    # Users
    users: [User!]!
    user(id: ID!): User

    # Tasks
    tasks(completed: Boolean, priority: Priority, page: Int = 1, limit: Int = 10): TaskConnection!
    task(id: ID!): Task
    myTasks(completed: Boolean, priority: Priority): [Task!]!
  }

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken: AuthPayload!

    # Users
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    changePassword(input: ChangePasswordInput!): Boolean!

    # Tasks
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }

  type TaskConnection {
    tasks: [Task!]!
    pagination: Pagination!
  }

  type Pagination {
    current: Int!
    total: Int!
    count: Int!
    totalItems: Int!
  }

  type Error {
    message: String!
    code: String
    details: [String!]
  }
`;

module.exports = typeDefs;
