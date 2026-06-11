const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
require('express-async-errors');

const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const chatRoutes       = require('./routes/chats');
const messageRoutes    = require('./routes/messages');
const groupRoutes      = require('./routes/groups');
const statusRoutes     = require('./routes/status');
const callRoutes       = require('./routes/calls');
const communityRoutes  = require('./routes/communities');
const adminRoutes      = require('./routes/admin');
const { setupSocketHandlers } = require('./sockets/chatHandlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/chats',       chatRoutes);
app.use('/api/messages',    messageRoutes);
app.use('/api/groups',      groupRoutes);
app.use('/api/status',      statusRoutes);
app.use('/api/calls',       callRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/admin',       adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ChatWave', ts: new Date() }));

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// ── Socket.IO ─────────────────────────────────────────────────
setupSocketHandlers(io);

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n🌊 ===== ChatWave Backend =====');
  console.log(`📡  API:       http://localhost:${PORT}/api`);
  console.log(`🔌  Socket.IO: ws://localhost:${PORT}`);
  console.log(`❤️   Health:    http://localhost:${PORT}/health`);
  console.log('==============================\n');
});

module.exports = { app, io };
