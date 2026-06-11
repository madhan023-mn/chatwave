const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/calls — call history
router.get('/', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, caller.name AS caller_name, caller.avatar_url AS caller_avatar,
       callee.name AS callee_name, callee.avatar_url AS callee_avatar
     FROM cw_calls c
     JOIN cw_users caller ON caller.id = c.caller_id
     JOIN cw_users callee ON callee.id = c.callee_id
     WHERE c.caller_id=$1 OR c.callee_id=$1
     ORDER BY c.started_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/calls — initiate call (log + signal via socket)
router.post('/', auth, async (req, res) => {
  const { calleeId, type = 'voice', chatId } = req.body;
  const { rows } = await query(
    `INSERT INTO cw_calls (caller_id, callee_id, type, chat_id, status)
     VALUES ($1,$2,$3,$4,'ringing') RETURNING *`,
    [req.user.id, calleeId, type, chatId || null]
  );
  const call = rows[0];
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${calleeId}`).emit('incoming_call', {
      callId: call.id, callerId: req.user.id, callerName: req.user.name,
      callerAvatar: req.user.avatar_url, type, chatId,
    });
  }
  res.status(201).json(call);
});

// PATCH /api/calls/:id — update call status
router.patch('/:id', auth, async (req, res) => {
  const { status, duration } = req.body;
  const { rows } = await query(
    `UPDATE cw_calls SET status=$1, duration=COALESCE($2,duration), ended_at=NOW()
     WHERE id=$3 RETURNING *`,
    [status, duration || null, req.params.id]
  );
  res.json(rows[0]);
});

module.exports = router;
