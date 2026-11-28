const socketIO = require('socket.io');
const User = require('../models/User');

let io;
// Map<userIdStr, Set<socketId>> to track multi-tab online presence accurately
const onlineUsers = new Map();

const init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*", // Adjust as needed for production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinTraceDebugger', () => {
      socket.join('trace-debugger');
      
      const room = io.sockets.adapter.rooms.get('trace-debugger');
      const numMembers = room ? room.size : 0;
      const connectedSockets = io.engine.clientsCount;
      
      console.log(`\n[SOCKET] Trace Debugger Joined`);
      console.log(`[SOCKET] Socket ID: ${socket.id}`);
      console.log(`[SOCKET] Room Members: ${numMembers}`);
      console.log(`[SOCKET] Connected Clients: ${connectedSockets}\n`);
    });

    socket.on('joinGroup', (groupId) => {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group ${groupId}`);
    });

    socket.on('leaveGroup', (groupId) => {
      socket.leave(groupId);
      console.log(`User ${socket.id} left group ${groupId}`);
    });

    socket.on('joinDirectChat', ({ userId, recipientId }) => {
      if (userId && recipientId) {
        const roomName = [userId.toString(), recipientId.toString()].sort().join('_');
        socket.join(roomName);
        console.log(`User ${socket.id} (${userId}) joined direct chat room ${roomName}`);
      }
    });

    socket.on('leaveDirectChat', ({ userId, recipientId }) => {
      if (userId && recipientId) {
        const roomName = [userId.toString(), recipientId.toString()].sort().join('_');
        socket.leave(roomName);
        console.log(`User ${socket.id} (${userId}) left direct chat room ${roomName}`);
      }
    });

    socket.on('joinUser', (userId) => {
      if (userId) {
        const userIdStr = userId.toString();
        const userRoom = `user_${userIdStr}`;
        socket.join(userRoom);
        socket.userId = userIdStr;

        if (!onlineUsers.has(userIdStr)) {
          onlineUsers.set(userIdStr, new Set());
        }
        const userSockets = onlineUsers.get(userIdStr);
        const wasOffline = userSockets.size === 0;
        userSockets.add(socket.id);

        if (wasOffline) {
          const now = new Date();
          User.updateOne({ _id: userIdStr }, { $set: { lastSeen: now } }).catch(() => {});
          io.emit('userPresenceUpdate', {
            userId: userIdStr,
            isOnline: true,
            lastSeen: now.toISOString()
          });
        }
        console.log(`User ${socket.id} joined personal room ${userRoom}`);
      }
    });

    socket.on('disconnect', () => {
      const userIdStr = socket.userId;
      if (userIdStr && onlineUsers.has(userIdStr)) {
        const userSockets = onlineUsers.get(userIdStr);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userIdStr);
          const now = new Date();
          User.updateOne({ _id: userIdStr }, { $set: { lastSeen: now } }).catch(() => {});
          io.emit('userPresenceUpdate', {
            userId: userIdStr,
            isOnline: false,
            lastSeen: now.toISOString()
          });
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const emitToGroup = (groupId, event, data) => {
  if (io) {
    io.to(groupId).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user_${userId.toString()}`).emit(event, data);
  }
};

const emitToTraceRoom = (event, data) => {
  if (io) {
    const roomName = 'trace-debugger';
    const room = io.sockets.adapter.rooms.get(roomName);
    const numMembers = room ? room.size : 0;
    
    io.to(roomName).emit(event, data);
    return numMembers;
  }
  return 0;
};

const isUserOnline = (userId) => {
  if (!userId) return false;
  const userIdStr = userId.toString();
  if (onlineUsers.has(userIdStr) && onlineUsers.get(userIdStr).size > 0) {
    return true;
  }
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user_${userIdStr}`);
  return Boolean(room && room.size > 0);
};

module.exports = {
  init,
  getIO,
  emitToGroup,
  emitToUser,
  emitToTraceRoom,
  isUserOnline
};
