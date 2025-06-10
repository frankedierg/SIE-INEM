const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  crearUsuario,
  getUsuarioById,
  updateUsuario,
  deleteUsuario
} = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Listar todos los usuarios (solo admin)
router.get('/', auth, authorizeRole('admin'), getUsuarios);
// Crear usuario (solo admin)
router.post('/', auth, authorizeRole('admin'), crearUsuario);
// Obtener usuario por ID (admin puede ver cualquiera, los demás solo a sí mismos)
router.get('/:id', auth, authorizeRole(['admin', 'teacher', 'student']), getUsuarioById);
// Actualizar usuario (admin puede editar cualquiera, los demás solo a sí mismos)
router.put('/:id', auth, authorizeRole(['admin', 'teacher', 'student']), updateUsuario);
// Eliminar usuario (solo admin)
router.delete('/:id', auth, authorizeRole('admin'), deleteUsuario);

module.exports = router;
