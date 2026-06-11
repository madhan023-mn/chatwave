const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// GET /api/messages/:chatId?before=<timestamp>&limit=50
router.get('/:chatId', auth, async (req, res) => {
  const { before, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit), 100);

  // Verify user is in this chat
  const { rows: access } = await query(
    'SELECT 1 FROM cw_chat_participants WHERE chat_id=$1 AND user_id=$2',
    [req.params.chatId, req.user.id]
  );
  if (!access[0]) return res.status(403).json({ error: 'Not a chat member' });

  const { rows } = await query(
    `SELECT
       m.*, u.name AS sender_name, u.avatar_url AS sender_avatar,
       -- Reply-to message
       rm.content AS reply_content, rm.type AS reply_type, rmu.name AS reply_sender_name,
       -- Reactions JSON
       COALESCE((
         SELECT json_agg(json_build_object('emoji', mr.emoji, 'user_id', mr.user_id, 'user_name', ru.name))
         FROM cw_message_reactions mr JOIN cw_users ru ON ru.id = mr.user_id
         WHERE mr.message_id = m.id
       ), '[]') AS reactions,
       -- Read status for this user
       ms.status AS my_status
     FROM cw_messages m
     JOIN cw_users u ON u.id = m.sender_id
     LEFT JOIN cw_messages rm ON rm.id = m.reply_to_id
     LEFT JOIN cw_users rmu ON rmu.id = rm.sender_id
     LEFT JOIN cw_message_status ms ON ms.message_id = m.id AND ms.user_id = $2
     WHERE m.chat_id = $1
       AND m.is_deleted_for_everyone = false
       AND NOT ($2 = ANY(COALESCE(m.deleted_for::text[]::uuid[], ARRAY[]::uuid[])))
       ${before ? 'AND m.created_at < $4' : ''}
     ORDER BY m.created_at DESC
     LIMIT $3`,
    before
      ? [req.params.chatId, req.user.id, lim, before]
      : [req.params.chatId, req.user.id, lim]
  );

  res.json(rows.reverse());
});

// POST /api/messages/:chatId — send a text/poll message
router.post('/:chatId', auth, async (req, res) => {
  const { type = 'text', content, replyToId, pollData, latitude, longitude, locationName } = req.body;

  const { rows: access } = await query(
    'SELECT 1 FROM cw_chat_participants WHERE chat_id=$1 AND user_id=$2',
    [req.params.chatId, req.user.id]
  );
  if (!access[0]) return res.status(403).json({ error: 'Not a chat member' });

  const { rows } = await query(
    `INSERT INTO cw_messages
       (chat_id, sender_id, type, content, reply_to_id, poll_data, latitude, longitude, location_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.params.chatId, req.user.id, type, content, replyToId || null,
     pollData ? JSON.stringify(pollData) : null, latitude || null, longitude || null, locationName || null]
  );
  const msg = rows[0];

  // Update chat last message
  await query(
    `UPDATE cw_chats SET last_message_id=$1, last_message_at=$2, updated_at=$2 WHERE id=$3`,
    [msg.id, msg.created_at, req.params.chatId]
  );
  // Increment unread for other participants
  await query(
    `UPDATE cw_chat_participants SET unread_count = unread_count + 1
     WHERE chat_id=$1 AND user_id != $2`,
    [req.params.chatId, req.user.id]
  );

  // Emit via Socket.IO
  const io = req.app.get('io');
  if (io) io.to(`chat:${req.params.chatId}`).emit('new_message', { ...msg, sender_name: req.user.name, sender_avatar: req.user.avatar_url, reactions: [] });

  res.status(201).json(msg);
});

// POST /api/messages/:chatId/media — send media file
router.post('/:chatId/media', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const mime = req.file.mimetype;
  let type = 'document';
  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('video/')) type = 'video';
  else if (mime.startsWith('audio/')) type = 'voice_note';

  const mediaUrl = `/uploads/${type === 'image' ? 'images' : type === 'video' ? 'videos' : type === 'voice_note' ? 'audio' : 'documents'}/${req.file.filename}`;

  const { rows } = await query(
    `INSERT INTO cw_messages (chat_id, sender_id, type, media_url, media_name, media_size, content)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.chatId, req.user.id, type, mediaUrl, req.file.originalname, req.file.size, req.body.caption || null]
  );
  const msg = rows[0];
  await query(`UPDATE cw_chats SET last_message_id=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2`, [msg.id, req.params.chatId]);
  await query(`UPDATE cw_chat_participants SET unread_count=unread_count+1 WHERE chat_id=$1 AND user_id!=$2`, [req.params.chatId, req.user.id]);

  const io = req.app.get('io');
  if (io) io.to(`chat:${req.params.chatId}`).emit('new_message', { ...msg, sender_name: req.user.name, sender_avatar: req.user.avatar_url, reactions: [] });

  res.status(201).json(msg);
});

// PUT /api/messages/:id/react
router.put('/:id/react', auth, async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) {
    await query('DELETE FROM cw_message_reactions WHERE message_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  } else {
    await query(
      `INSERT INTO cw_message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)
       ON CONFLICT (message_id, user_id) DO UPDATE SET emoji=$3`,
      [req.params.id, req.user.id, emoji]
    );
  }
  const { rows } = await query(
    `SELECT mr.emoji, mr.user_id, u.name AS user_name FROM cw_message_reactions mr
     JOIN cw_users u ON u.id = mr.user_id WHERE mr.message_id = $1`,
    [req.params.id]
  );
  const io = req.app.get('io');
  const { rows: [msg] } = await query('SELECT chat_id FROM cw_messages WHERE id=$1', [req.params.id]);
  if (io && msg) io.to(`chat:${msg.chat_id}`).emit('message_reaction', { messageId: req.params.id, reactions: rows });
  res.json(rows);
});

// PUT /api/messages/:id/star
router.put('/:id/star', auth, async (req, res) => {
  const { starred } = req.body;
  await query('UPDATE cw_messages SET is_starred=$1 WHERE id=$2 AND sender_id=$3', [starred, req.params.id, req.user.id]);
  res.json({ ok: true });
});

// DELETE /api/messages/:id - delete for me or everyone
router.delete('/:id', auth, async (req, res) => {
  const { forEveryone } = req.body;
  const { rows } = await query('SELECT * FROM cw_messages WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Message not found' });
  const msg = rows[0];

  if (forEveryone && msg.sender_id === req.user.id) {
    await query('UPDATE cw_messages SET is_deleted_for_everyone=true, content=NULL WHERE id=$1', [req.params.id]);
    const io = req.app.get('io');
    if (io) io.to(`chat:${msg.chat_id}`).emit('message_deleted', { messageId: req.params.id, forEveryone: true });
  } else {
    const deletedFor = [...(msg.deleted_for || []), req.user.id];
    await query('UPDATE cw_messages SET deleted_for=$1 WHERE id=$2', [JSON.stringify(deletedFor), req.params.id]);
  }
  res.json({ ok: true });
});

// POST /api/messages/:chatId/ai-reply
router.post('/:chatId/ai-reply', auth, async (req, res) => {
  const { message } = req.body;
  if (!process.env.GOOGLE_API_KEY) return res.json({ suggestions: [] });

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Given this message in a chat: "${message}"\nSuggest 3 short, natural reply options (each max 8 words). Return JSON: {"suggestions":["reply1","reply2","reply3"]}` }]
        }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 }
      })
    });
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"suggestions":[]}';
    res.json(JSON.parse(text));
  } catch (e) {
    res.json({ suggestions: ['👍', 'Sounds good!', 'Thanks!'] });
  }
});

module.exports = router;
