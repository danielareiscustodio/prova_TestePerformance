const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Fazer login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obter perfil do usuário autenticado
 * @access  Private
 */
router.get('/profile', authMiddleware, authController.profile);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar token de acesso
 * @access  Private
 */
router.post('/refresh', authMiddleware, authController.refreshToken);

module.exports = router;
