const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Get all subjects (permite filtrar por tipo: ?type=core o ?type=modality)
router.get('/', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const subjects = await Subject.find(filter)
      .populate('teacherId')
      .sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get subject by ID (todos los roles pueden ver)
router.get('/:id', auth, authorizeRole(['admin', 'teacher', 'student']), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('teacherId');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create subject (solo admin)
router.post('/', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, type, description, teacherId } = req.body;
    const subject = new Subject({
      name,
      type,
      description,
      teacherId
    });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update subject (solo admin)
router.put('/:id', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete subject (solo admin)
router.delete('/:id', auth, authorizeRole('admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
