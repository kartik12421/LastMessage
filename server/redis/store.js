const redis = require('./client');

const SESSION_TTL = 60 * 60 * 24; // 24 hours in seconds

const ROOM_PREFIX = 'room:';
const MESSAGE_PREFIX = 'room:messages:';
const SESSION_KEY = 'session:';

const createSession = async (sessionId, username, roomCode) => {
  await redis.set(`${SESSION_KEY}${sessionId}`, JSON.stringify({ username, roomCode }), 'EX', SESSION_TTL);
};

const getSession = async (sessionId) => {
  const data = await redis.get(`${SESSION_KEY}${sessionId}`);
  return data ? JSON.parse(data) : null;
};

const deleteSession = async (sessionId) => {
  await redis.del(`${SESSION_KEY}${sessionId}`);
};

const roomExists = async (roomCode) => {
  const count = await redis.hlen(`${ROOM_PREFIX}${roomCode}`);
  return count > 0;
};

const roomMembers = async (roomCode) => {
  const members = await redis.hgetall(`${ROOM_PREFIX}${roomCode}`);
  return Object.values(members).map((m) => JSON.parse(m));
};

const getRoomUserCount = async (roomCode) => {
  return redis.hlen(`${ROOM_PREFIX}${roomCode}`);
};

const addUserToRoom = async (roomCode, sessionId, username) => {
  await redis.hset(`${ROOM_PREFIX}${roomCode}`, sessionId, JSON.stringify({ sessionId, username }));
  await redis.expire(`${ROOM_PREFIX}${roomCode}`, SESSION_TTL);
};

const removeUserFromRoom = async (roomCode, sessionId) => {
  await redis.hdel(`${ROOM_PREFIX}${roomCode}`, sessionId);
  await redis.expire(`${ROOM_PREFIX}${roomCode}`, SESSION_TTL);
};

const addMessage = async (roomCode, message) => {
  await redis.rpush(`${MESSAGE_PREFIX}${roomCode}`, JSON.stringify(message));
  await redis.expire(`${MESSAGE_PREFIX}${roomCode}`, SESSION_TTL);
};

const getMessages = async (roomCode) => {
  const rawMessages = await redis.lrange(`${MESSAGE_PREFIX}${roomCode}`, 0, -1);
  return rawMessages.map((m) => JSON.parse(m));
};

const destroyRoom = async (roomCode) => {
  await redis.del(`${ROOM_PREFIX}${roomCode}`);
  await redis.del(`${MESSAGE_PREFIX}${roomCode}`);
};

const destroySessionData = async (sessionId) => {
  await redis.del(`${SESSION_KEY}${sessionId}`);
};

module.exports = {
  createSession,
  getSession,
  deleteSession,
  roomExists,
  roomMembers,
  getRoomUserCount,
  addUserToRoom,
  removeUserFromRoom,
  addMessage,
  getMessages,
  destroyRoom,
  destroySessionData,
};
