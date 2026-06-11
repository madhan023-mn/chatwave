const express = require('express');
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/communities
router.get('/', auth, async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, cm.role, u.name AS creator_name,
       COUNT(cm2.user_id) AS member_count
     FROM cw_communities c
     JOIN cw_community_members cm ON cm.community_id = c.id AND cm.user_id=$1
     JOIN cw_users u ON u.id = c.created_by
     LEFT JOIN cw_community_members cm2 ON cm2.community_id = c.id
     GROUP BY c.id, cm.role, u.name ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/communities
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query(
    `INSERT INTO cw_communities (name, description, created_by) VALUES ($1,$2,$3) RETURNING *`,
    [name, description || null, req.user.id]
  );
  await query(
    `INSERT INTO cw_community_members (community_id, user_id, role) VALUES ($1,$2,'admin')`,
    [rows[0].id, req.user.id]
  );
  res.status(201).json(rows[0]);
});

// GET /api/communities/:id
router.get('/:id', auth, async (req, res) => {
  const { rows } = await query('SELECT * FROM cw_communities WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const { rows: members } = await query(
    `SELECT u.id, u.name, u.avatar_url, cm.role FROM cw_community_members cm
     JOIN cw_users u ON u.id = cm.user_id WHERE cm.community_id=$1 LIMIT 20`,
    [req.params.id]
  );
  const { rows: groups } = await query(
    `SELECT g.*, cg.is_announcement FROM cw_community_groups cg
     JOIN cw_groups g ON g.id = cg.group_id WHERE cg.community_id=$1`,
    [req.params.id]
  );
  res.json({ ...rows[0], members, groups });
});

// POST /api/communities/:id/groups — add group to community
router.post('/:id/groups', auth, async (req, res) => {
  const { groupId, isAnnouncement = false } = req.body;
  await query(
    `INSERT INTO cw_community_groups (community_id, group_id, is_announcement) VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [req.params.id, groupId, isAnnouncement]
  );
  res.json({ ok: true });
});

// POST /api/communities/:id/join
router.post('/:id/join', auth, async (req, res) => {
  await query(
    `INSERT INTO cw_community_members (community_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
