const express = require('express');
const { query } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  const [users, online, messages, calls, groups, reports] = await Promise.all([
    query('SELECT COUNT(*) FROM cw_users'),
    query('SELECT COUNT(*) FROM cw_users WHERE is_online=true'),
    query('SELECT COUNT(*) FROM cw_messages WHERE created_at > NOW() - INTERVAL \'24 hours\''),
    query('SELECT COUNT(*) FROM cw_calls WHERE started_at > NOW() - INTERVAL \'24 hours\''),
    query('SELECT COUNT(*) FROM cw_groups'),
    query("SELECT COUNT(*) FROM cw_reports WHERE status='pending'"),
  ]);
  res.json({
    totalUsers:    parseInt(users.rows[0].count),
    onlineUsers:   parseInt(online.rows[0].count),
    messagesDay:   parseInt(messages.rows[0].count),
    callsDay:      parseInt(calls.rows[0].count),
    totalGroups:   parseInt(groups.rows[0].count),
    pendingReports:parseInt(reports.rows[0].count),
  });
});

// GET /api/admin/users?page=1&q=
router.get('/users', auth, adminOnly, async (req, res) => {
  const { page = 1, q = '' } = req.query;
  const offset = (parseInt(page) - 1) * 20;
  const { rows } = await query(
    `SELECT id, name, email, phone, avatar_url, role, is_online, last_seen, created_at
     FROM cw_users WHERE name ILIKE $1 OR email ILIKE $1
     ORDER BY created_at DESC LIMIT 20 OFFSET $2`,
    [`%${q}%`, offset]
  );
  const { rows: total } = await query('SELECT COUNT(*) FROM cw_users WHERE name ILIKE $1 OR email ILIKE $1', [`%${q}%`]);
  res.json({ users: rows, total: parseInt(total[0].count) });
});

// PATCH /api/admin/users/:id/ban
router.patch('/users/:id/ban', auth, adminOnly, async (req, res) => {
  const { banned } = req.body;
  await query('UPDATE cw_users SET role=$1 WHERE id=$2', [banned ? 'banned' : 'user', req.params.id]);
  res.json({ ok: true });
});

// GET /api/admin/reports
router.get('/reports', auth, adminOnly, async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, u1.name AS reporter_name, u2.name AS reported_name
     FROM cw_reports r
     JOIN cw_users u1 ON u1.id = r.reporter_id
     JOIN cw_users u2 ON u2.id = r.reported_user_id
     ORDER BY r.created_at DESC LIMIT 50`
  );
  res.json(rows);
});

// POST /api/admin/reports — submit report
router.post('/reports', auth, async (req, res) => {
  const { reportedUserId, messageId, reason, description } = req.body;
  await query(
    `INSERT INTO cw_reports (reporter_id, reported_user_id, message_id, reason, description)
     VALUES ($1,$2,$3,$4,$5)`,
    [req.user.id, reportedUserId, messageId || null, reason, description || null]
  );
  res.status(201).json({ ok: true });
});

// PATCH /api/admin/reports/:id
router.patch('/reports/:id', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  await query('UPDATE cw_reports SET status=$1, reviewed_by=$2 WHERE id=$3', [status, req.user.id, req.params.id]);
  res.json({ ok: true });
});

// GET /api/admin/activity — recent messages/calls
router.get('/activity', auth, adminOnly, async (req, res) => {
  const { rows: messages } = await query(
    `SELECT m.id, m.type, m.content, m.created_at, u.name AS sender
     FROM cw_messages m JOIN cw_users u ON u.id = m.sender_id
     ORDER BY m.created_at DESC LIMIT 20`
  );
  const { rows: calls } = await query(
    `SELECT c.type, c.status, c.duration, c.started_at, u.name AS caller
     FROM cw_calls c JOIN cw_users u ON u.id = c.caller_id
     ORDER BY c.started_at DESC LIMIT 20`
  );
  res.json({ messages, calls });
});

module.exports = router;
