const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const Performance = require('../models/Performance');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Get all grades for a student (docentes y estudiantes pueden consultar)
router.get('/student/:studentId', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const grades = await Grade.find({ studentId: req.params.studentId })
      .populate('subjectId')
      .sort({ semester: 1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all grades for a subject (docentes y estudiantes pueden consultar)
router.get('/subject/:subjectId', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const grades = await Grade.find({ subjectId: req.params.subjectId })
      .populate('studentId')
      .sort({ semester: 1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update grade (solo docentes pueden crear/editar)
router.post('/', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const { studentId, subjectId, semester, cut1, cut2, finalExam, justifiedAbsences, unjustifiedAbsences, observations } = req.body;

    // Validar escala de notas
    const validateGrade = (n) => typeof n === 'number' && n >= 1.0 && n <= 5.0;
    if (!validateGrade(cut1) || !validateGrade(cut2) || !validateGrade(finalExam)) {
      return res.status(400).json({ message: 'Las notas deben estar entre 1.0 y 5.0' });
    }

    // Obtener tipo de asignatura
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(400).json({ message: 'Asignatura no encontrada' });
    }

    // Calcular nota final
    const finalGrade = parseFloat((cut1 * 0.4 + cut2 * 0.4 + finalExam * 0.2).toFixed(2));

    // Check if grade already exists
    let grade = await Grade.findOne({ studentId, subjectId, semester });

    if (grade) {
      // Update existing grade
      grade.cut1 = cut1;
      grade.cut2 = cut2;
      grade.finalExam = finalExam;
      grade.finalGrade = finalGrade;
      grade.justifiedAbsences = justifiedAbsences;
      grade.unjustifiedAbsences = unjustifiedAbsences;
      grade.observations = observations;
      await grade.save();
    } else {
      // Create new grade
      grade = new Grade({
        studentId,
        subjectId,
        semester,
        cut1,
        cut2,
        finalExam,
        finalGrade,
        justifiedAbsences,
        unjustifiedAbsences,
        observations
      });
      await grade.save();
    }

    // Determinar si aprueba o reprueba según tipo de asignatura
    let aprobado = false;
    if (subject.type === 'core') {
      aprobado = finalGrade >= 3.0;
    } else if (subject.type === 'modality') {
      aprobado = finalGrade >= 3.5;
    }

    res.json({ ...grade.toObject(), aprobado });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add recovery grade (solo docentes pueden editar)
router.put('/recovery/:gradeId', auth, authorizeRole('teacher'), async (req, res) => {
  try {
    const { recoveryGrade } = req.body;
    const grade = await Grade.findByIdAndUpdate(
      req.params.gradeId,
      { recoveryGrade },
      { new: true }
    );
    res.json(grade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
