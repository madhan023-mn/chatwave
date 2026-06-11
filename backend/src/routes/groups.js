const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /api/groups — create group
router.post('/', auth, async (req, res) => {
  const { name, description, memberIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required' });

  // Create chat container
  const { rows: chatRows } = await query(
    `INSERT INTO cw_chats (type, created_by) VALUES ('group', $1) RETURNING id`,
    [req.user.id]
  );
  const chatId = chatRows[0].id;

  // Create group
  const { rows: groupRows } = await query(
    `INSERT INTO cw_groups (chat_id, name, description, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [chatId, name, description || null, req.user.id]
  );
  const group = groupRows[0];

  // Add creator + members as participants & group members
  const allMembers = [req.user.id, ...memberIds.filter(id => id !== req.user.id)];
  for (const uid of allMembers) {
    await query(`INSERT INTO cw_chat_participants (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [chatId, uid]);
    await query(`INSERT INTO cw_group_members (group_id, user_id, role, added_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [group.id, uid, uid === req.user.id ? 'admin' : 'member', req.user.id]);
  }

  res.status(201).json({ group, chatId });
});

// GET /api/groups/:id — group info
router.get('/:id', auth, async (req, res) => {
  const { rows: groups } = await query(
    `SELECT g.*, c.id AS chat_id FROM cw_groups g JOIN cw_chats c ON c.id = g.chat_id WHERE g.id = $1`,
    [req.params.id]
  );
  if (!groups[0]) return res.status(404).json({ error: 'Group not found' });

  const { rows: members } = await query(
    `SELECT u.id, u.name, u.avatar_url, u.is_online, u.last_seen, gm.role, gm.joined_at
     FROM cw_group_members gm JOIN cw_users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 ORDER BY gm.role DESC, u.name ASC`,
    [req.params.id]
  );

  res.json({ ...groups[0], members });
});

// PUT /api/groups/:id — update group info
router.put('/:id', auth, upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

  // Check admin
  const { rows: role } = await query(
    'SELECT role FROM cw_group_members WHERE group_id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!['admin', 'super_admin'].includes(role[0]?.role)) {
    return res.status(403).json({ error: 'Admin only' });
  }

  const { rows } = await query(
    `UPDATE cw_groups SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       avatar_url = COALESCE($3, avatar_url)
     WHERE id = $4 RETURNING *`,
    [name || null, description || null, avatarUrl || null, req.params.id]
  );
  res.json(rows[0]);
});

// POST /api/groups/:id/members — add member
router.post('/:id/members', auth, async (req, res) => {
  const { userId } = req.body;
  const { rows: group } = await query('SELECT chat_id FROM cw_groups WHERE id=$1', [req.params.id]);
  if (!group[0]) return res.status(404).json({ error: 'Group not found' });
  await query(`INSERT INTO cw_chat_participants (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [group[0].chat_id, userId]);
  await query(`INSERT INTO cw_group_members (group_id, user_id, added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [req.params.id, userId, req.user.id]);
  res.json({ ok: true });
});

// DELETE /api/groups/:id/members/:userId — remove member
router.delete('/:id/members/:userId', auth, async (req, res) => {
  const { rows: role } = await query('SELECT role FROM cw_group_members WHERE group_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!['admin', 'super_admin'].includes(role[0]?.role) && req.params.userId !== req.user.id) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { rows: group } = await query('SELECT chat_id FROM cw_groups WHERE id=$1', [req.params.id]);
  await query('DELETE FROM cw_group_members WHERE group_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
  await query('DELETE FROM cw_chat_participants WHERE chat_id=$1 AND user_id=$2', [group[0]?.chat_id, req.params.userId]);
  res.json({ ok: true });
});

// PUT /api/groups/:id/members/:userId/role
router.put('/:id/members/:userId/role', auth, async (req, res) => {
  const { role } = req.body;
  const { rows: myRole } = await query('SELECT role FROM cw_group_members WHERE group_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!['admin', 'super_admin'].includes(myRole[0]?.role)) return res.status(403).json({ error: 'Admin only' });
  await query('UPDATE cw_group_members SET role=$1 WHERE group_id=$2 AND user_id=$3', [role, req.params.id, req.params.userId]);
  res.json({ ok: true });
});

// GET /api/groups/invite/:link — join via invite link
router.post('/join/:link', auth, async (req, res) => {
  const { rows } = await query('SELECT * FROM cw_groups WHERE invite_link=$1', [req.params.link]);
  if (!rows[0]) return res.status(404).json({ error: 'Invalid invite link' });
  const group = rows[0];
  await query(`INSERT INTO cw_chat_participants (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [group.chat_id, req.user.id]);
  await query(`INSERT INTO cw_group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [group.id, req.user.id]);
  res.json({ group, chatId: group.chat_id });
});

module.exports = router;
