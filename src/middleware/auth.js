const jwt = require('jsonwebtoken');
const database = require('../config/database');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          message: 'Token de acesso não fornecido',
          code: 'NO_TOKEN'
        }
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Formato do token inválido',
          code: 'INVALID_TOKEN_FORMAT'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    // Verificar se o usuário ainda existe
    const user = database.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      error: {
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Middleware para GraphQL
const getUser = async (token) => {
  try {
    if (!token) return null;
    
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'default_secret');
    
    const user = database.getUserById(decoded.userId);
    return user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    } : null;
  } catch (error) {
    return null;
  }
};

// Middleware para verificar roles específicas
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        }
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: {
          message: 'Acesso negado. Permissões insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: roles
        }
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  getUser,
  requireRole
};
