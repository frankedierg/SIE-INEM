const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Get all performances for a student (todos los roles pueden consultar)
router.get('/student/:studentId', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const performances = await Performance.find({ studentId: req.params.studentId })
      .populate('subjectId')
      .sort({ semester: 1 });
    res.json(performances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all performances for a subject (todos los roles pueden consultar)
router.get('/subject/:subjectId', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const performances = await Performance.find({ subjectId: req.params.subjectId })
      .populate('studentId')
      .sort({ semester: 1 });
    res.json(performances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create performance (solo docentes pueden crear)
router.post('/', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const { studentId, subjectId, semester, level, description, recommendations } = req.body;

    // Validar que la asignatura exista
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(400).json({ message: 'Asignatura no encontrada' });
    }

    // Validar nivel de desempeño según tipo de asignatura
    let validLevel = false;
    if (subject.type === 'core') {
      validLevel = ['bajo', 'básico', 'alto', 'superior'].includes(level);
    } else if (subject.type === 'modality') {
      validLevel = ['bajo', 'básico', 'alto', 'superior'].includes(level);
    }
    if (!validLevel) {
      return res.status(400).json({ message: 'Nivel de desempeño inválido para el tipo de asignatura' });
    }

    const performance = new Performance({
      studentId,
      subjectId,
      semester,
      level,
      description,
      recommendations
    });
    await performance.save();
    res.status(201).json(performance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update performance (solo docentes pueden editar)
router.put('/:id', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!performance) {
      return res.status(404).json({ message: 'Performance not found' });
    }
    res.json(performance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
