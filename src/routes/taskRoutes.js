const express = require('express');
const taskController = require('../controllers/taskController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/tasks
 * @desc    Obter todas as tarefas (admin) ou tarefas do usuário (user)
 * @access  Private
 * @params  ?page=1&limit=10&completed=true&priority=high
 */
router.get('/', taskController.getAllTasks);

/**
 * @route   GET /api/tasks/my
 * @desc    Obter tarefas do usuário autenticado
 * @access  Private
 * @params  ?completed=true&priority=high
 */
router.get('/my', taskController.getMyTasks);

/**
 * @route   GET /api/tasks/:id
 * @desc    Obter tarefa por ID
 * @access  Private
 */
router.get('/:id', taskController.getTaskById);

/**
 * @route   POST /api/tasks
 * @desc    Criar nova tarefa
 * @access  Private
 */
router.post('/', taskController.createTask);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Atualizar tarefa
 * @access  Private
 */
router.put('/:id', taskController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Deletar tarefa
 * @access  Private
 */
router.delete('/:id', taskController.deleteTask);

module.exports = router;
