const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// GET /api/users/search?q=
router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const { rows } = await query(
    `SELECT id, name, email, phone, about, avatar_url, is_online, last_seen
     FROM cw_users
     WHERE id != $1 AND (name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
     LIMIT 20`,
    [req.user.id, `%${q}%`]
  );
  res.json(rows);
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, email, phone, about, avatar_url, is_online, last_seen, created_at
     FROM cw_users WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// PUT /api/users/avatar - upload avatar
router.put('/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE cw_users SET avatar_url=$1, updated_at=NOW() WHERE id=$2', [avatarUrl, req.user.id]);
  res.json({ avatar_url: avatarUrl });
});

// POST /api/users/block/:id
router.post('/block/:id', auth, async (req, res) => {
  await query(
    `INSERT INTO cw_blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.user.id, req.params.id]
  );
  res.json({ message: 'User blocked' });
});

// DELETE /api/users/block/:id
router.delete('/block/:id', auth, async (req, res) => {
  await query(
    'DELETE FROM cw_blocked_users WHERE blocker_id=$1 AND blocked_id=$2',
    [req.user.id, req.params.id]
  );
  res.json({ message: 'User unblocked' });
});

// GET /api/users/blocked/list
router.get('/blocked/list', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.avatar_url, u.phone, b.blocked_at
     FROM cw_blocked_users b JOIN cw_users u ON u.id = b.blocked_id
     WHERE b.blocker_id = $1 ORDER BY b.blocked_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
