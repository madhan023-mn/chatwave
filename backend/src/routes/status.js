const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// GET /api/status — get all statuses from contacts
router.get('/', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.name AS user_name, u.avatar_url AS user_avatar,
       COUNT(sv.viewer_id) AS view_count,
       MAX(CASE WHEN sv.viewer_id=$1 THEN 1 ELSE 0 END) AS viewed_by_me
     FROM cw_statuses s
     JOIN cw_users u ON u.id = s.user_id
     LEFT JOIN cw_status_views sv ON sv.status_id = s.id
     WHERE s.expires_at > NOW()
       AND (s.user_id = $1 OR s.privacy = 'everyone'
         OR (s.privacy = 'contacts' AND EXISTS (
           SELECT 1 FROM cw_chat_participants cp1
           JOIN cw_chat_participants cp2 ON cp1.chat_id = cp2.chat_id
           WHERE cp1.user_id=$1 AND cp2.user_id=s.user_id
         ))
       )
     GROUP BY s.id, u.name, u.avatar_url
     ORDER BY s.user_id = $1 DESC, s.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/status/my — own statuses
router.get('/my', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, COUNT(sv.viewer_id) AS view_count FROM cw_statuses s
     LEFT JOIN cw_status_views sv ON sv.status_id = s.id
     WHERE s.user_id=$1 AND s.expires_at > NOW()
     GROUP BY s.id ORDER BY s.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/status — create text status
router.post('/', auth, async (req, res) => {
  const { type = 'text', content, backgroundColor = '#00a884', textColor = '#ffffff', fontSize = 24, privacy = 'contacts' } = req.body;
  const { rows } = await query(
    `INSERT INTO cw_statuses (user_id, type, content, background_color, text_color, font_size, privacy)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, type, content, backgroundColor, textColor, fontSize, privacy]
  );
  const io = req.app.get('io');
  if (io) io.emit('new_status', { ...rows[0], user_name: req.user.name, user_avatar: req.user.avatar_url });
  res.status(201).json(rows[0]);
});

// POST /api/status/media — upload image/video status
router.post('/media', auth, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const mime = req.file.mimetype;
  const type = mime.startsWith('video/') ? 'video' : 'image';
  const mediaUrl = `/uploads/${type === 'video' ? 'videos' : 'images'}/${req.file.filename}`;
  const { rows } = await query(
    `INSERT INTO cw_statuses (user_id, type, media_url, content, privacy) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id, type, mediaUrl, req.body.caption || null, req.body.privacy || 'contacts']
  );
  res.status(201).json(rows[0]);
});

// POST /api/status/:id/view
router.post('/:id/view', auth, async (req, res) => {
  await query(
    `INSERT INTO cw_status_views (status_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// POST /api/status/:id/react
router.post('/:id/react', auth, async (req, res) => {
  const { emoji } = req.body;
  await query(
    `INSERT INTO cw_status_views (status_id, viewer_id, reaction) VALUES ($1,$2,$3)
     ON CONFLICT (status_id, viewer_id) DO UPDATE SET reaction=$3`,
    [req.params.id, req.user.id, emoji]
  );
  res.json({ ok: true });
});

// GET /api/status/:id/viewers
router.get('/:id/viewers', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.avatar_url, sv.viewed_at, sv.reaction
     FROM cw_status_views sv JOIN cw_users u ON u.id = sv.viewer_id
     WHERE sv.status_id=$1 ORDER BY sv.viewed_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// DELETE /api/status/:id
router.delete('/:id', auth, async (req, res) => {
  await query('DELETE FROM cw_statuses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
