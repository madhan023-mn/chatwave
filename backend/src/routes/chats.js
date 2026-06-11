const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/chats — list all chats for current user
router.get('/', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT
       c.id, c.type, c.last_message_at, c.updated_at,
       cp.is_pinned, cp.is_archived, cp.is_muted, cp.unread_count,
       -- For direct chats: other user info
       CASE WHEN c.type = 'direct' THEN ou.id END           AS other_user_id,
       CASE WHEN c.type = 'direct' THEN ou.name END          AS other_user_name,
       CASE WHEN c.type = 'direct' THEN ou.avatar_url END    AS other_user_avatar,
       CASE WHEN c.type = 'direct' THEN ou.is_online END     AS other_user_online,
       CASE WHEN c.type = 'direct' THEN ou.last_seen END     AS other_user_last_seen,
       CASE WHEN c.type = 'direct' THEN ou.about END         AS other_user_about,
       -- For group chats
       CASE WHEN c.type = 'group' THEN g.name END            AS group_name,
       CASE WHEN c.type = 'group' THEN g.avatar_url END      AS group_avatar,
       CASE WHEN c.type = 'group' THEN g.id END              AS group_id,
       -- Last message preview
       m.type AS last_msg_type, m.content AS last_msg_content,
       m.sender_id AS last_msg_sender_id,
       mu.name AS last_msg_sender_name
     FROM cw_chats c
     JOIN cw_chat_participants cp ON cp.chat_id = c.id AND cp.user_id = $1
     -- Other participant (direct chats)
     LEFT JOIN cw_chat_participants ocp ON ocp.chat_id = c.id AND ocp.user_id != $1
     LEFT JOIN cw_users ou ON ou.id = ocp.user_id AND c.type = 'direct'
     -- Group info
     LEFT JOIN cw_groups g ON g.chat_id = c.id AND c.type = 'group'
     -- Last message
     LEFT JOIN cw_messages m ON m.id = c.last_message_id
     LEFT JOIN cw_users mu ON mu.id = m.sender_id
     WHERE cp.is_archived = false
     ORDER BY c.last_message_at DESC NULLS LAST`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/chats/archived
router.get('/archived', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.type,
       CASE WHEN c.type = 'direct' THEN ou.name END AS other_user_name,
       CASE WHEN c.type = 'group'  THEN g.name END  AS group_name
     FROM cw_chats c
     JOIN cw_chat_participants cp ON cp.chat_id = c.id AND cp.user_id = $1
     LEFT JOIN cw_chat_participants ocp ON ocp.chat_id = c.id AND ocp.user_id != $1
     LEFT JOIN cw_users ou ON ou.id = ocp.user_id AND c.type = 'direct'
     LEFT JOIN cw_groups g ON g.chat_id = c.id AND c.type = 'group'
     WHERE cp.is_archived = true ORDER BY c.updated_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/chats/direct — open or get direct chat with user
router.post('/direct', auth, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot chat with yourself' });

  // Check if direct chat already exists
  const { rows: existing } = await query(
    `SELECT c.id FROM cw_chats c
     JOIN cw_chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = $1
     JOIN cw_chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = $2
     WHERE c.type = 'direct' LIMIT 1`,
    [req.user.id, userId]
  );
  if (existing[0]) return res.json({ chatId: existing[0].id, created: false });

  // Create new direct chat
  const { rows: newChat } = await query(
    `INSERT INTO cw_chats (type, created_by) VALUES ('direct', $1) RETURNING id`,
    [req.user.id]
  );
  const chatId = newChat[0].id;
  await query(
    `INSERT INTO cw_chat_participants (chat_id, user_id) VALUES ($1,$2),($1,$3)`,
    [chatId, req.user.id, userId]
  );
  res.status(201).json({ chatId, created: true });
});

// PATCH /api/chats/:id/pin
router.patch('/:id/pin', auth, async (req, res) => {
  const { pinned } = req.body;
  await query(
    'UPDATE cw_chat_participants SET is_pinned=$1 WHERE chat_id=$2 AND user_id=$3',
    [pinned, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// PATCH /api/chats/:id/archive
router.patch('/:id/archive', auth, async (req, res) => {
  const { archived } = req.body;
  await query(
    'UPDATE cw_chat_participants SET is_archived=$1 WHERE chat_id=$2 AND user_id=$3',
    [archived, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// PATCH /api/chats/:id/mute
router.patch('/:id/mute', auth, async (req, res) => {
  const { muted, until } = req.body;
  await query(
    'UPDATE cw_chat_participants SET is_muted=$1, mute_until=$2 WHERE chat_id=$3 AND user_id=$4',
    [muted, until || null, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// POST /api/chats/:id/read — mark all as read
router.post('/:id/read', auth, async (req, res) => {
  await query(
    `UPDATE cw_chat_participants SET unread_count=0, last_read_at=NOW()
     WHERE chat_id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  await query(
    `UPDATE cw_message_status SET status='read', updated_at=NOW()
     WHERE user_id=$1 AND message_id IN (
       SELECT id FROM cw_messages WHERE chat_id=$2 AND sender_id != $1
     )`,
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
});

module.exports = router;
