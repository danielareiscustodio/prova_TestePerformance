const Joi = require('joi');
const database = require('../config/database');

// Schemas de validação
const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  completed: Joi.boolean().default(false)
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  completed: Joi.boolean().optional()
});

class TaskController {

  async getAllTasks(req, res) {
    try {
      const { page = 1, limit = 10, completed, priority } = req.query;
      
      // Para usuários normais, mostrar apenas suas tarefas
      // Para admins, mostrar todas as tarefas
      const userId = req.user.role === 'admin' ? null : req.user.id;
      let tasks = database.getAllTasks(userId);

      // Aplicar filtros
      if (completed !== undefined) {
        const isCompleted = completed === 'true';
        tasks = tasks.filter(task => task.completed === isCompleted);
      }

      if (priority) {
        tasks = tasks.filter(task => task.priority === priority);
      }

      // Paginação
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTasks = tasks.slice(startIndex, endIndex);

      res.status(200).json({
        message: 'Tarefas recuperadas com sucesso',
        data: {
          tasks: paginatedTasks,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(tasks.length / limit),
            count: paginatedTasks.length,
            totalItems: tasks.length
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = database.getTaskById(id);

      if (!task) {
        return res.status(404).json({
          error: {
            message: 'Tarefa não encontrada',
            code: 'TASK_NOT_FOUND'
          }
        });
      }

      // Verificar se o usuário pode acessar esta tarefa
      if (req.user.role !== 'admin' && task.userId !== req.user.id) {
        return res.status(403).json({
          error: {
            message: 'Acesso negado a esta tarefa',
            code: 'ACCESS_DENIED'
          }
        });
      }

      res.status(200).json({
        message: 'Tarefa recuperada com sucesso',
        data: {
          task
        }
      });

    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async createTask(req, res) {
    try {
      // Validar dados de entrada
      const { error, value } = createTaskSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      // Criar tarefa associada ao usuário autenticado
      const taskData = {
        ...value,
        userId: req.user.id
      };

      const task = database.createTask(taskData);

      res.status(201).json({
        message: 'Tarefa criada com sucesso',
        data: {
          task
        }
      });

    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      
      // Validar dados de entrada
      const { error, value } = updateTaskSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            message: 'Dados inválidos',
            details: error.details.map(detail => detail.message),
            code: 'VALIDATION_ERROR'
          }
        });
      }

      const existingTask = database.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({
          error: {
            message: 'Tarefa não encontrada',
            code: 'TASK_NOT_FOUND'
          }
        });
      }

      // Verificar se o usuário pode editar esta tarefa
      if (req.user.role !== 'admin' && existingTask.userId !== req.user.id) {
        return res.status(403).json({
          error: {
            message: 'Acesso negado para editar esta tarefa',
            code: 'ACCESS_DENIED'
          }
        });
      }

      const updatedTask = database.updateTask(id, value);

      res.status(200).json({
        message: 'Tarefa atualizada com sucesso',
        data: {
          task: updatedTask
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      
      const existingTask = database.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({
          error: {
            message: 'Tarefa não encontrada',
            code: 'TASK_NOT_FOUND'
          }
        });
      }

      // Verificar se o usuário pode deletar esta tarefa
      if (req.user.role !== 'admin' && existingTask.userId !== req.user.id) {
        return res.status(403).json({
          error: {
            message: 'Acesso negado para deletar esta tarefa',
            code: 'ACCESS_DENIED'
          }
        });
      }

      const deleted = database.deleteTask(id);
      
      if (!deleted) {
        return res.status(500).json({
          error: {
            message: 'Erro ao deletar tarefa',
            code: 'DELETE_ERROR'
          }
        });
      }

      res.status(200).json({
        message: 'Tarefa deletada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  async getMyTasks(req, res) {
    try {
      const { completed, priority } = req.query;
      let tasks = database.getTasksByUserId(req.user.id);

      // Aplicar filtros
      if (completed !== undefined) {
        const isCompleted = completed === 'true';
        tasks = tasks.filter(task => task.completed === isCompleted);
      }

      if (priority) {
        tasks = tasks.filter(task => task.priority === priority);
      }

      res.status(200).json({
        message: 'Suas tarefas recuperadas com sucesso',
        data: {
          tasks,
          count: tasks.length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar tarefas do usuário:', error);
      res.status(500).json({
        error: {
          message: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
}

module.exports = new TaskController();
