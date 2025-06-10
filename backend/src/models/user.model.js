const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: String,
  email: { type: String, unique: true },
  password: String,
  rol: { type: String, enum: ['admin', 'docente', 'estudiante'], default: 'estudiante' }
});

module.exports = mongoose.model('Usuario', userSchema);
