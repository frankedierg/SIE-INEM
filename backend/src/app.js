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
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Middleware para responder a todas las preflight requests (CORS OPTIONS)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(200);
  }
  next();
});

// Servir archivos estáticos de Angular
app.use(express.static(path.join(__dirname, '../../frontend/dist/frontend')));

// Rutas de API (asegúrate de que estén antes del fallback SPA)
app.use('/api/auth', authRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/performances', performancesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/remediations', require('./routes/remediations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/usuarios', userRoutes);

// Fallback SPA: cualquier ruta no API devuelve index.html (DEBE IR AL FINAL)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/frontend/index.html'));
});

module.exports = app;
