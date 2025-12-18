const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const database = require('../config/database');

// Schemas de validação
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

class AuthController {
  
  async register(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      const { name, email, password, role } = value;

      // Verificar se usuário já existe
      const existingUser = database.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: {
            message: 'Email já está em uso',
            code: 'EMAIL_ALREADY_EXISTS'
          }
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = database.createUser({
        name,
        email,
        password: hashedPassword,
        role
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

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        data: {
          user: userResponse,
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      });

    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async login(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      const { email, password } = value;

      // Buscar usuário
      const user = database.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: {
            message: 'Credenciais inválidas',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            message: 'Credenciais inválidas',
            code: 'INVALID_CREDENTIALS'
          }
        });
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

      res.status(200).json({
        message: 'Login realizado com sucesso',
        data: {
          user: userResponse,
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      });

    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async profile(req, res) {
    try {
      const user = database.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: {
            message: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Remover senha da resposta
      const { password: _, ...userResponse } = user;

      res.status(200).json({
        message: 'Perfil recuperado com sucesso',
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async refreshToken(req, res) {
    try {
      // Gerar novo token
      const token = jwt.sign(
        { 
          userId: req.user.id, 
          email: req.user.email,
          role: req.user.role 
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(200).json({
        message: 'Token renovado com sucesso',
        data: {
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      });

    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
}

module.exports = new AuthController();
