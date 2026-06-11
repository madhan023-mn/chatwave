const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

  const hash = password ? await bcrypt.hash(password, 10) : null;
  const { rows } = await query(
    `INSERT INTO cw_users (email, phone, name, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, phone, name, about, avatar_url, role, created_at`,
    [email || null, phone || null, name, hash]
  );
  const user = rows[0];
  res.status(201).json({ token: signToken(user.id), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await query('SELECT * FROM cw_users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash || '');
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { password_hash, ...safeUser } = user;
  res.json({ token: signToken(user.id), user: safeUser });
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await query(
    `INSERT INTO cw_otps (phone, otp, expires_at) VALUES ($1, $2, $3)`,
    [phone, otp, expiresAt]
  );

  // In production: integrate Twilio/vonage here
  console.log(`📱 OTP for ${phone}: ${otp}`);
  res.json({ message: 'OTP sent successfully', ...(process.env.NODE_ENV === 'development' && { otp }) });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const { rows } = await query(
    `SELECT * FROM cw_otps WHERE phone = $1 AND otp = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, otp]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired OTP' });

  await query('UPDATE cw_otps SET used = true WHERE id = $1', [rows[0].id]);

  // Find or create user
  let userResult = await query('SELECT * FROM cw_users WHERE phone = $1', [phone]);
  let user = userResult.rows[0];

  if (!user) {
    const insert = await query(
      `INSERT INTO cw_users (phone, name) VALUES ($1, $2) RETURNING *`,
      [phone, name || `User${phone.slice(-4)}`]
    );
    user = insert.rows[0];
  }

  const { password_hash, ...safeUser } = user;
  res.json({ token: signToken(user.id), user: safeUser });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// PUT /api/auth/profile - update own profile
router.put('/profile', auth, async (req, res) => {
  const { name, about, avatar_url } = req.body;
  const { rows } = await query(
    `UPDATE cw_users SET name=$1, about=$2, avatar_url=$3, updated_at=NOW()
     WHERE id=$4 RETURNING id, email, phone, name, about, avatar_url, role`,
    [name || req.user.name, about ?? req.user.about, avatar_url || req.user.avatar_url, req.user.id]
  );
  res.json({ user: rows[0] });
});

module.exports = router;
