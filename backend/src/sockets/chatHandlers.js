const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Maps userId -> Set of socket ids
const onlineUsers = new Map();

const getUserFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, name, avatar_url FROM cw_users WHERE id=$1', [decoded.id]);
    return rows[0] || null;
  } catch {
    return null;
  }
};

const setupSocketHandlers = (io) => {
  // ── Auth Middleware ───────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const user = await getUserFromToken(token);
    if (!user) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 ${socket.user.name} connected (${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Update online status in DB
    await query('UPDATE cw_users SET is_online=true WHERE id=$1', [userId]);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join all chat rooms this user belongs to
    const { rows: chats } = await query(
      'SELECT chat_id FROM cw_chat_participants WHERE user_id=$1',
      [userId]
    );
    for (const { chat_id } of chats) {
      socket.join(`chat:${chat_id}`);
    }

    // Notify contacts this user is online
    io.emit('user_online', { userId, online: true });

    // ── JOIN CHAT ROOM ────────────────────────────────────────────
    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    // ── TYPING ────────────────────────────────────────────────────
    socket.on('typing_start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { userId, userName: socket.user.name, chatId, typing: true });
    });

    socket.on('typing_stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { userId, userName: socket.user.name, chatId, typing: false });
    });

    // ── READ RECEIPT ──────────────────────────────────────────────
    socket.on('messages_read', async ({ chatId, messageIds }) => {
      try {
        for (const msgId of messageIds) {
          await query(
            `INSERT INTO cw_message_status (message_id, user_id, status) VALUES ($1,$2,'read')
             ON CONFLICT (message_id, user_id) DO UPDATE SET status='read', updated_at=NOW()`,
            [msgId, userId]
          );
        }
        await query(
          'UPDATE cw_chat_participants SET unread_count=0, last_read_at=NOW() WHERE chat_id=$1 AND user_id=$2',
          [chatId, userId]
        );
        socket.to(`chat:${chatId}`).emit('messages_read', { userId, chatId, messageIds });
      } catch (e) {
        console.error('Read receipt error:', e.message);
      }
    });

    // ── WEBRTC CALL SIGNALING ─────────────────────────────────────
    socket.on('call_signal', ({ targetUserId, signal, callId, type }) => {
      io.to(`user:${targetUserId}`).emit('call_signal', {
        fromUserId: userId, fromName: socket.user.name, fromAvatar: socket.user.avatar_url,
        signal, callId, type,
      });
    });

    socket.on('call_accept', ({ callId, targetUserId, signal }) => {
      io.to(`user:${targetUserId}`).emit('call_accepted', { callId, signal, fromUserId: userId });
    });

    socket.on('call_reject', ({ callId, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call_rejected', { callId, fromUserId: userId });
      query("UPDATE cw_calls SET status='declined', ended_at=NOW() WHERE id=$1", [callId]).catch(() => {});
    });

    socket.on('call_end', ({ callId, targetUserId, duration }) => {
      io.to(`user:${targetUserId}`).emit('call_ended', { callId, fromUserId: userId });
      query("UPDATE cw_calls SET status='ended', duration=$1, ended_at=NOW() WHERE id=$2", [duration || 0, callId]).catch(() => {});
    });

    socket.on('call_ice_candidate', ({ targetUserId, candidate, callId }) => {
      io.to(`user:${targetUserId}`).emit('call_ice_candidate', { candidate, callId, fromUserId: userId });
    });

    // ── STATUS EVENTS ─────────────────────────────────────────────
    socket.on('status_viewed', async ({ statusId }) => {
      try {
        await query(
          `INSERT INTO cw_status_views (status_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [statusId, userId]
        );
      } catch (e) {}
    });

    // ── DISCONNECT ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await query('UPDATE cw_users SET is_online=false, last_seen=NOW() WHERE id=$1', [userId]);
          io.emit('user_online', { userId, online: false, lastSeen: new Date() });
        }
      }
      console.log(`🔌 ${socket.user.name} disconnected`);
    });
  });
};

module.exports = { setupSocketHandlers };
