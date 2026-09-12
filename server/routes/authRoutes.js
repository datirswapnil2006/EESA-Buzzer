const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'eesa_secret_jwt_key_2026', {
    expiresIn: '7d',
  });
};

// Seed default admin account if not existing
router.post('/seed-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ email: 'admin@eesa.org' });
    if (!adminExists) {
      const admin = await User.create({
        name: 'EESA Admin',
        email: 'admin@eesa.org',
        password: 'admin123',
        role: 'admin',
      });
      return res.json({ success: true, message: 'Admin created', email: admin.email });
    }
    return res.json({ success: true, message: 'Admin already exists' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'admin',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Auto-create default admin if logging in as admin@eesa.org and doesn't exist
    if (email === 'admin@eesa.org') {
      const existing = await User.findOne({ email });
      if (!existing) {
        await User.create({
          name: 'EESA Admin',
          email: 'admin@eesa.org',
          password: 'admin123',
          role: 'admin',
        });
      }
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Current User Profile
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

module.exports = router;
