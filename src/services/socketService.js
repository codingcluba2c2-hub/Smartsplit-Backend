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

module.exports = {
  init,
  getIO,
  emitToGroup,
  emitToTraceRoom
};
