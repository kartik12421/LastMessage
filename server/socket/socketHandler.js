import crypto from 'node:crypto';
import store from '../redis/store.js';

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', async ({ roomCode, sessionId }) => {
      try {
        const session = await store.getSession(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Invalid or expired session' });
          return;
        }

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.sessionId = sessionId;
        socket.data.username = session.username;

        await store.addUserToRoom(roomCode, sessionId, session.username);
        const members = await store.roomMembers(roomCode);
        const messages = await store.getMessages(roomCode);

        io.to(roomCode).emit('room_members', members);
        socket.emit('room_history', messages);
        console.log(`${session.username} joined room ${roomCode}`);
      } catch (error) {
        console.error('join_room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('send_message', async (data) => {
      const { roomCode, content } = data;
      try {
        const sessionId = socket.data.sessionId;
        const username = socket.data.username;
        if (!roomCode || !content || !content.trim()) return;

        const message = {
          id: crypto.randomUUID(),
          senderId: sessionId,
          senderName: username,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        };

        await store.addMessage(roomCode, message);
        io.to(roomCode).emit('receive_message', message);
      } catch (error) {
        console.error('send_message error:', error);
      }
    });

    socket.on('typing', ({ roomCode, isTyping }) => {
      socket.to(roomCode).emit('user_typing', {
        senderId: socket.data.sessionId,
        senderName: socket.data.username,
        isTyping,
      });
    });

    // ---- WebRTC Signaling ----
    socket.on('call_user', ({ roomCode, toSessionId, offer, callType }) => {
      const toSocket = getSocketBySession(io, roomCode, toSessionId);
      if (toSocket) {
        toSocket.emit('incoming_call', {
          from: { sessionId: socket.data.sessionId, username: socket.data.username },
          offer,
          callType, // 'voice' | 'video'
        });
      }
    });

    socket.on('call_accepted', ({ roomCode, toSessionId, answer }) => {
      const toSocket = getSocketBySession(io, roomCode, toSessionId);
      if (toSocket) {
        toSocket.emit('call_accepted', {
          from: { sessionId: socket.data.sessionId, username: socket.data.username },
          answer,
        });
      }
    });

    socket.on('ice_candidate', ({ roomCode, toSessionId, candidate }) => {
      const toSocket = getSocketBySession(io, roomCode, toSessionId);
      if (toSocket) {
        toSocket.emit('ice_candidate', {
          from: socket.data.sessionId,
          candidate,
        });
      }
    });

    socket.on('end_call', ({ roomCode, toSessionId }) => {
      const toSocket = getSocketBySession(io, roomCode, toSessionId);
      if (toSocket) {
        toSocket.emit('end_call', { from: socket.data.sessionId });
      }
    });

    socket.on('disconnect', async () => {
      try {
        const { roomCode, sessionId, username } = socket.data;
        if (roomCode && sessionId) {
          await store.removeUserFromRoom(roomCode, sessionId);
          const count = await store.getRoomUserCount(roomCode);
          const members = await store.roomMembers(roomCode);

          if (count <= 0) {
            // Room is empty — completely erase all session data
            await store.destroyRoom(roomCode);
            await store.destroySessionData(sessionId);
            console.log(`Room ${roomCode} destroyed, all data erased`);
          } else {
            io.to(roomCode).emit('room_members', members);
            io.to(roomCode).emit('user_left', { sessionId, username });
            console.log(`${username} left room ${roomCode}`);
          }
        }
      } catch (error) {
        console.error('disconnect error:', error);
      }
    });
  });
};

const getSocketBySession = (io, roomCode, sessionId) => {
  const sockets = io.sockets.adapter.rooms.get(roomCode);
  if (!sockets) return null;

  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.data.sessionId === sessionId) {
      return s;
    }
  }
  return null;
};

export default socketHandler;
