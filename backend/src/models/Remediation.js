const mongoose = require('mongoose');

const remediationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  type: {
    type: String,
    enum: ['nivelacion', 'recuperacion_semestral', 'recuperacion_final'],
    required: true
  },
  period: { type: String }, // Ejemplo: '2025-1', '2025-2'
  gradeBefore: { type: Number, required: true },
  remediationGrade: { type: Number, required: true },
  approved: { type: Boolean },
  observations: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Remediation', remediationSchema);
