require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const sessionRoutes = require('./routes/sessionRoutes');
const socketHandler = require('./socket/socketHandler');
const redis = require('./redis/client');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use('/api/session', sessionRoutes);

socketHandler(io);

app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await redis.connect();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.error('Make sure Redis is running. Example:');
    console.error('  docker run -d --name redis -p 6379:6379 redis:7-alpine');
    process.exit(1);
  }
};

start();
