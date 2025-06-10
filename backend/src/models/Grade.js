const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  cut1: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  cut2: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  finalExam: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  recoveryGrade: {
    type: Number,
    min: 1.0,
    max: 5.0
  },
  justifiedAbsences: {
    type: Number,
    default: 0
  },
  unjustifiedAbsences: {
    type: Number,
    default: 0
  },
  observations: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Grade', gradeSchema);
