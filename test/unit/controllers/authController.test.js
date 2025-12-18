const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authController = require('../../../src/controllers/authController');
const database = require('../../../src/config/database');

describe('AuthController Unit Tests', () => {
  let req, res, next;
  let databaseStub;

  beforeEach(() => {
    // Mock request, response e next
    req = {
      body: {},
      user: {}
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

  describe('register', () => {
    it('deve registrar usuário com sucesso', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      
      req.body = userData;

      const mockUser = {
        id: 'user-id',
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      databaseStub.getUserByEmail.returns(null); // Usuário não existe
      databaseStub.createUser.returns(mockUser);
      
      const bcryptStub = sinon.stub(bcrypt, 'hash').resolves('hashed-password');
      const jwtStub = sinon.stub(jwt, 'sign').returns('mock-token');

      // Act
      await authController.register(req, res);

      // Assert
      expect(databaseStub.getUserByEmail.calledOnceWith(userData.email)).to.be.true;
      expect(bcryptStub.calledOnceWith(userData.password, 10)).to.be.true;
      expect(databaseStub.createUser.calledOnce).to.be.true;
      expect(jwtStub.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data).to.have.property('token', 'mock-token');
      expect(responseData.data.user).to.not.have.property('password');
    });

    it('deve rejeitar email duplicado', async () => {
      // Arrange
      req.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      const existingUser = { id: 'existing-id', email: 'existing@example.com' };
      databaseStub.getUserByEmail.returns(existingUser);

      // Act
      await authController.register(req, res);

      // Assert
      expect(databaseStub.getUserByEmail.calledOnceWith(req.body.email)).to.be.true;
      expect(databaseStub.createUser.called).to.be.false;
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('deve validar dados de entrada', async () => {
      // Arrange
      req.body = {
        name: 'A', // Muito curto
        email: 'invalid-email',
        password: '123' // Muito curto
      };

      // Act
      await authController.register(req, res);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'VALIDATION_ERROR');
    });

    it('deve tratar erros internos', async () => {
      // Arrange
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      databaseStub.getUserByEmail.throws(new Error('Database error'));

      // Act
      await authController.register(req, res);

      // Assert
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INTERNAL_ERROR');
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      // Arrange
      const loginData = {
        email: 'user@test.com',
        password: 'password123'
      };
      
      req.body = loginData;

      const mockUser = {
        id: 'user-id',
        name: 'Test User',
        email: loginData.email,
        password: 'hashed-password',
        role: 'user'
      };

      databaseStub.getUserByEmail.returns(mockUser);
      
      const bcryptStub = sinon.stub(bcrypt, 'compare').resolves(true);
      const jwtStub = sinon.stub(jwt, 'sign').returns('mock-token');

      // Act
      await authController.login(req, res);

      // Assert
      expect(databaseStub.getUserByEmail.calledOnceWith(loginData.email)).to.be.true;
      expect(bcryptStub.calledOnceWith(loginData.password, mockUser.password)).to.be.true;
      expect(jwtStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data).to.have.property('token', 'mock-token');
      expect(responseData.data.user).to.not.have.property('password');
    });

    it('deve rejeitar usuário inexistente', async () => {
      // Arrange
      req.body = {
        email: 'nonexistent@test.com',
        password: 'password123'
      };

      databaseStub.getUserByEmail.returns(null);

      // Act
      await authController.login(req, res);

      // Assert
      expect(databaseStub.getUserByEmail.calledOnceWith(req.body.email)).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INVALID_CREDENTIALS');
    });

    it('deve rejeitar senha incorreta', async () => {
      // Arrange
      req.body = {
        email: 'user@test.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        password: 'hashed-password'
      };

      databaseStub.getUserByEmail.returns(mockUser);
      const bcryptStub = sinon.stub(bcrypt, 'compare').resolves(false);

      // Act
      await authController.login(req, res);

      // Assert
      expect(databaseStub.getUserByEmail.calledOnceWith(req.body.email)).to.be.true;
      expect(bcryptStub.calledOnceWith(req.body.password, mockUser.password)).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INVALID_CREDENTIALS');
    });

    it('deve validar dados de entrada', async () => {
      // Arrange
      req.body = {
        email: 'invalid-email',
        // password missing
      };

      // Act
      await authController.login(req, res);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'VALIDATION_ERROR');
    });
  });

  describe('profile', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      // Arrange
      req.user = { id: 'user-id' };

      const mockUser = {
        id: 'user-id',
        name: 'Test User',
        email: 'user@test.com',
        password: 'hashed-password',
        role: 'user'
      };

      databaseStub.getUserById.returns(mockUser);

      // Act
      await authController.profile(req, res);

      // Assert
      expect(databaseStub.getUserById.calledOnceWith('user-id')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data.user).to.not.have.property('password');
      expect(responseData.data.user).to.have.property('email', 'user@test.com');
    });

    it('deve retornar 404 se usuário não encontrado', async () => {
      // Arrange
      req.user = { id: 'nonexistent-id' };
      databaseStub.getUserById.returns(null);

      // Act
      await authController.profile(req, res);

      // Assert
      expect(databaseStub.getUserById.calledOnceWith('nonexistent-id')).to.be.true;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'USER_NOT_FOUND');
    });
  });

  describe('refreshToken', () => {
    it('deve renovar token com sucesso', async () => {
      // Arrange
      req.user = {
        id: 'user-id',
        email: 'user@test.com',
        role: 'user'
      };

      const jwtStub = sinon.stub(jwt, 'sign').returns('new-token');

      // Act
      await authController.refreshToken(req, res);

      // Assert
      expect(jwtStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('message');
      expect(responseData.data).to.have.property('token', 'new-token');
      expect(responseData.data).to.have.property('expiresIn');

      // Verificar os dados passados para jwt.sign
      const jwtCall = jwtStub.getCall(0);
      expect(jwtCall.args[0]).to.have.property('userId', 'user-id');
      expect(jwtCall.args[0]).to.have.property('email', 'user@test.com');
      expect(jwtCall.args[0]).to.have.property('role', 'user');
    });

    it('deve tratar erros na geração do token', async () => {
      // Arrange
      req.user = {
        id: 'user-id',
        email: 'user@test.com',
        role: 'user'
      };

      const jwtStub = sinon.stub(jwt, 'sign').throws(new Error('JWT Error'));

      // Act
      await authController.refreshToken(req, res);

      // Assert
      expect(jwtStub.calledOnce).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData).to.have.property('error');
      expect(responseData.error).to.have.property('code', 'INTERNAL_ERROR');
    });
  });
});
