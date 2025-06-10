const express = require('express');
const router = express.Router();
const Remediation = require('../models/Remediation');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Listar todas las habilitaciones (todos los roles pueden consultar)
router.get('/', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const remediations = await Remediation.find()
      .populate('studentId', 'name email')
      .populate('subjectId', 'name type');
    res.json(remediations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener habilitación por ID
router.get('/:id', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const remediation = await Remediation.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('subjectId', 'name type');
    if (!remediation) {
      return res.status(404).json({ message: 'Habilitación no encontrada' });
    }
    res.json(remediation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear habilitación (solo docentes pueden crear)
router.post('/', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const { studentId, subjectId, type, period, gradeBefore, remediationGrade, approved, observations } = req.body;
    // Validar tipo
    if (!['nivelacion', 'recuperacion_semestral', 'recuperacion_final'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de habilitación inválido' });
    }
    // Validar notas
    const validateGrade = (n) => typeof n === 'number' && n >= 1.0 && n <= 5.0;
    if (!validateGrade(gradeBefore) || !validateGrade(remediationGrade)) {
      return res.status(400).json({ message: 'Las notas deben estar entre 1.0 y 5.0' });
    }
    const remediation = new Remediation({
      studentId,
      subjectId,
      type,
      period,
      gradeBefore,
      remediationGrade,
      approved,
      observations
    });
    await remediation.save();
    res.status(201).json(remediation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Actualizar habilitación (solo docentes pueden editar)
router.put('/:id', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const remediation = await Remediation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!remediation) {
      return res.status(404).json({ message: 'Habilitación no encontrada' });
    }
    res.json(remediation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eliminar habilitación (solo admin)
router.delete('/:id', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const remediation = await Remediation.findByIdAndDelete(req.params.id);
    if (!remediation) {
      return res.status(404).json({ message: 'Habilitación no encontrada' });
    }
    res.json({ message: 'Habilitación eliminada' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
