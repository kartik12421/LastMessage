import express from 'express';
import crypto from 'node:crypto';
import store from '../redis/store.js';
const router = express.Router();

const generateId = () => crypto.randomBytes(6).toString('hex');
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

router.post('/create', async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ message: 'Please enter a username (min 2 characters)' });
  }

  const cleanUsername = username.trim().slice(0, 20);
  const sessionId = generateId();
  let roomCode = generateRoomCode();

  while (await store.roomExists(roomCode)) {
    roomCode = generateRoomCode();
  }

  await store.createSession(sessionId, cleanUsername, roomCode);
  await store.addUserToRoom(roomCode, sessionId, cleanUsername);

  return res.json({ sessionId, roomCode, username: cleanUsername });
});

router.post('/join', async (req, res) => {
  const { username, roomCode } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ message: 'Please enter a username (min 2 characters)' });
  }
  if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length === 0) {
    return res.status(400).json({ message: 'Please enter a room code' });
  }

  const cleanRoomCode = roomCode.trim().toUpperCase();
  const cleanUsername = username.trim().slice(0, 20);

  const exists = await store.roomExists(cleanRoomCode);
  if (!exists) {
    return res.status(404).json({ message: 'Room not found or has ended' });
  }

  const sessionId = generateId();
  await store.createSession(sessionId, cleanUsername, cleanRoomCode);
  await store.addUserToRoom(cleanRoomCode, sessionId, cleanUsername);

  return res.json({ sessionId, roomCode: cleanRoomCode, username: cleanUsername });
});

router.post('/leave', async (req, res) => {
  const { sessionId, roomCode } = req.body;
  if (!sessionId || !roomCode) {
    return res.status(400).json({ message: 'Missing session or room info' });
  }

  await store.deleteSession(sessionId);
  await store.removeUserFromRoom(roomCode, sessionId);

  const count = await store.getRoomUserCount(roomCode);
  if (count <= 0) {
    await store.destroyRoom(roomCode);
  }

  return res.json({ success: true });
});

export default router;
