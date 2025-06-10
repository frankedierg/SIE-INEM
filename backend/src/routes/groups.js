const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Listar todos los grupos (todos los roles pueden consultar)
router.get('/', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('directorId', 'name email')
      .populate('students', 'name email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener grupo por ID
router.get('/:id', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('directorId', 'name email')
      .populate('students', 'name email');
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear grupo (solo admin)
router.post('/', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, grade, directorId, students } = req.body;
    const group = new Group({
      name,
      grade,
      directorId,
      students
    });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Actualizar grupo (solo admin)
router.put('/:id', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    res.json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eliminar grupo (solo admin)
router.delete('/:id', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    res.json({ message: 'Grupo eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
