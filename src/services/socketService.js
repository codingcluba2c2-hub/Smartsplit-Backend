const socketIO = require('socket.io');

let io;

const init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*", // Adjust as needed for production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGroup', (groupId) => {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group ${groupId}`);
    });

    socket.on('leaveGroup', (groupId) => {
      socket.leave(groupId);
      console.log(`User ${socket.id} left group ${groupId}`);
    });

    socket.on('disconnect', () => {
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

module.exports = {
  init,
  getIO,
  emitToGroup
};
