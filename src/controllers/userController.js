const Joi = require('joi');
const bcrypt = require('bcryptjs');
const database = require('../config/database');

// Schemas de validação
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('user', 'admin').optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

class UserController {

  async getAllUsers(req, res) {
    try {
      const users = database.getAllUsers();
      
      // Remover senhas da resposta
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.status(200).json({
        message: 'Usuários recuperados com sucesso',
        data: {
          users: usersWithoutPasswords,
          count: usersWithoutPasswords.length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = database.getUserById(id);

      if (!user) {
        return res.status(404).json({
          error: {
            message: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Remover senha da resposta
      const { password, ...userWithoutPassword } = user;

      res.status(200).json({
        message: 'Usuário recuperado com sucesso',
        data: {
          user: userWithoutPassword
        }
      });

    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      
      // Validar dados de entrada
      const { error, value } = updateUserSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      const existingUser = database.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: {
            message: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Verificar se o usuário pode editar este perfil
      // Usuários podem editar apenas seu próprio perfil, admins podem editar qualquer um
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({
          error: {
            message: 'Acesso negado para editar este usuário',
            code: 'ACCESS_DENIED'
          }
        });
      }

      // Se tentando alterar email, verificar se já existe
      if (value.email && value.email !== existingUser.email) {
        const userWithEmail = database.getUserByEmail(value.email);
        if (userWithEmail) {
          return res.status(409).json({
            error: {
              message: 'Email já está em uso',
              code: 'EMAIL_ALREADY_EXISTS'
            }
          });
        }
      }

      // Apenas admins podem alterar roles
      if (value.role && req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            message: 'Apenas administradores podem alterar roles',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }

      const updatedUser = database.updateUser(id, value);
      
      // Remover senha da resposta
      const { password, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        message: 'Usuário atualizado com sucesso',
        data: {
          user: userWithoutPassword
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const existingUser = database.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({
          error: {
            message: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Verificar permissões
      // Usuários podem deletar apenas seu próprio perfil, admins podem deletar qualquer um
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({
          error: {
            message: 'Acesso negado para deletar este usuário',
            code: 'ACCESS_DENIED'
          }
        });
      }

      // Não permitir que o usuário delete a si mesmo se for o único admin
      if (existingUser.role === 'admin') {
        const allUsers = database.getAllUsers();
        const adminCount = allUsers.filter(user => user.role === 'admin').length;
        
        if (adminCount === 1) {
          return res.status(400).json({
            error: {
              message: 'Não é possível deletar o último administrador',
              code: 'LAST_ADMIN_CANNOT_BE_DELETED'
            }
          });
        }
      }

      const deleted = database.deleteUser(id);
      
      if (!deleted) {
        return res.status(500).json({
          error: {
            message: 'Erro ao deletar usuário',
            code: 'DELETE_ERROR'
          }
        });
      }

      res.status(200).json({
        message: 'Usuário deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async changePassword(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      const { currentPassword, newPassword } = value;
      const user = database.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          error: {
            message: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: {
            message: 'Senha atual incorreta',
            code: 'INVALID_CURRENT_PASSWORD'
          }
        });
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha
      database.updateUser(req.user.id, { password: hashedNewPassword });

      res.status(200).json({
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
}

module.exports = new UserController();
