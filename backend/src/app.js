const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth');
const gradesRoutes = require('./routes/grades');
const subjectsRoutes = require('./routes/subjects');
const performancesRoutes = require('./routes/performances');
const groupsRoutes = require('./routes/groups');

const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de Angular
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Routes
   app.use('/api/auth', authRoutes);
   app.use('/api/grades', gradesRoutes);
   app.use('/api/subjects', subjectsRoutes);
   app.use('/api/performances', performancesRoutes);
   app.use('/api/groups', groupsRoutes);
   app.use('/api/remediations', require('./routes/remediations'));
   app.use('/api/reports', require('./routes/reports'));
   app.use('/api/usuarios', userRoutes);

// Fallback SPA: cualquier ruta no API devuelve index.html
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

module.exports = app;
