const express = require('express');
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Obter todos os usuários
 * @access  Private (Admin only)
 */
router.get('/', requireRole(['admin']), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obter usuário por ID
 * @access  Private
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Atualizar usuário
 * @access  Private
 */
router.put('/:id', userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deletar usuário
 * @access  Private
 */
router.delete('/:id', userController.deleteUser);

/**
 * @route   POST /api/users/change-password
 * @desc    Alterar senha do usuário autenticado
 * @access  Private
 */
router.post('/change-password', userController.changePassword);

module.exports = router;
