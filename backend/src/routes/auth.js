const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, name, email } = req.body;
    const user = new User({
      username,
      password,
      role,
      name,
      email
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user._id, role: user.role, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener perfil del usuario autenticado
const auth = require('../middleware/auth');

router.get('/profile', auth, async (req, res) => {
  try {
    const { _id, username, name, email, role } = req.user;
    res.json({ id: _id, username, name, email, role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
