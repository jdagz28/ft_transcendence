'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')
const roomSockets = new Map()
const userSockets = new Map()

function addSocketToRoom(roomId, socket) {
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId).add(socket);
  
  if (!socket.rooms) socket.rooms = new Set();
  socket.rooms.add(roomId);

  socket.roomId = roomId;
}

function broadcastToRoom(roomId, message, exceptSocket = null) {
  console.log(`Broadcasting to room ${roomId}:`);
  const sockets = roomSockets.get(roomId) || new Set();
  console.log(`  - Found ${sockets.size} sockets in room ${roomId}`);
  
  for (const sock of sockets) {
    if (sock !== exceptSocket) {
      console.log(`  - Broadcasting to user ${sock.userId || 'unknown'} (rooms: ${sock.rooms ? Array.from(sock.rooms).join(', ') : 'none'})`);
      sock.send(message);
    } else {
      console.log(`  - Skipping sender user ${sock.userId || 'unknown'}`);
    }
  }
}


function sendMessageToUser(userId, message) {
  const socket = userSockets.get(userId);
  if (socket && socket.readyState === socket.OPEN) {
    console.log(`message = ${JSON.stringify(message)}`);
    socket.send(JSON.stringify(message));
    console.log(`Sent notification to user ${userId}:`, message);
    return true;
  } else {
    console.log(`User ${userId} not connected or connection not open`);
    return false;
  }
}

function printRoomsDebug() {
  console.log('\n=== ROOMS DEBUG INFO ===');
  console.log('Total rooms:', roomSockets.size);
  console.log('Total connected users:', userSockets.size);
  
  for (const [roomId, sockets] of roomSockets.entries()) {
    console.log(`\nRoom ${roomId}:`);
    console.log(`  - Number of sockets: ${sockets.size}`);
    for (const socket of sockets) {
      const userId = socket.userId || 'unknown';
      const isAlive = socket.isAlive ? 'alive' : 'dead';
      const readyState = socket.readyState === socket.OPEN ? 'OPEN' : 
                        socket.readyState === socket.CLOSED ? 'CLOSED' : 
                        socket.readyState === socket.CLOSING ? 'CLOSING' : 'CONNECTING';
      console.log(`    User ${userId}: ${isAlive}, ${readyState}`);
    }
  }
  
  console.log('\nUser-Socket mapping:');
  for (const [userId, socket] of userSockets.entries()) {
    const rooms = socket.rooms ? Array.from(socket.rooms).join(', ') : 'none';
    console.log(`  User ${userId} is in rooms: [${rooms}]`);
  }
  console.log('=== END ROOMS DEBUG ===\n');
}

const authApi = axios.create({
  baseURL: `http://authentication:${process.env.AUTH_PORT}`,
  timeout: 2000
})

module.exports = fp(async function chatPlugin (fastify, opts) {
  await fastify.register(require('@fastify/websocket'))

  fastify.decorate('sendMessageToUser', sendMessageToUser)

  fastify.get('/chat', {websocket: true}, async (socket, req) => {

    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const token = parsedUrl.query.token;
    console.log("token received: token")
    if (!token) {
      socket.close(4001, 'Unauthorized: Missing token')
      return
    }
    fastify.log.info(`New WebSocket connection from ${req.ip} with token: ${token}`)

    try {
      const { data } = await authApi.get('/auth/verify', { params: { token } })
      if (!data.valid) {
        socket.close(4001, 'Unauthorized: Invalid token')
        return
      }
      const userId = Number(data.user.id);
      socket.userId = userId;
      userSockets.set(userId, socket);
      socket.send(JSON.stringify({ type: 'info', message: `User: ${userId} successfully connected` }));
      console.log(`User ${userId} connected via WebSocket`);
      printRoomsDebug(); // Debug: afficher l'état après connexion

      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.on('message', async message => {
        try {
          var parsed = JSON.parse(message.toString())
          console.log('Message received:', parsed);
        } catch {
          console.error('Error parsing JSON:', message.toString())
          socket.send('Need to send a valid JSON object')
          return
        }

        let result = await fastify.chat.checkFields(parsed);
        if (result.valid === false) {
          socket.send(`${result.reason}`)
          return
        }

        switch (parsed.action) {
          case 'join':
            console.log("in case JOIN")
            result = await fastify.chat.joinChat(parsed, userId);
            if (result.valid) {
              addSocketToRoom(parsed.room, socket)
              socket.send(JSON.stringify({ type: 'info', message: 'Room joined' }));
              console.log(`User ${userId} joined room ${parsed.room}`);
              printRoomsDebug(); // Debug: afficher l'état des rooms
            } else {
              socket.send(result.reason)
            }
            break;
          case 'send':
            console.log("in case SEND")
            console.log("SEND parsed:", JSON.stringify(parsed, null, 2)); // Debug: afficher le parsed complet
            console.log(`User ${userId} wants to send to room ${parsed.room}`);
            console.log(`User ${userId} is currently in rooms: [${socket.rooms ? Array.from(socket.rooms).join(', ') : 'none'}]`);
            
            if (!socket.rooms || !socket.rooms.has(parsed.room)) {
                console.log(`User ${userId} is not in room ${parsed.room}, sending error`);
                socket.send('You must join the room before sending messages');
                break;
            }
            
            result = await fastify.chat.sendMessage(parsed, userId);
            if (result.valid === true) {
              console.log(`Message validated, broadcasting to room ${parsed.room}`);
              broadcastToRoom(parsed.room, JSON.stringify({
                from: result.fromUsername || `User${userId}`,
                fromId: result.fromUserId || userId,
                message: parsed.message,
                roomId: parsed.room,
                scope: parsed.scope
              }), socket);
            } else {
              socket.send(result.reason)
            }
            break;
        }
      })

      socket.on('close', (code, reason) => {
        console.log(`User ${socket.userId} disconnecting...`); // debug log
        printRoomsDebug(); // Debug: afficher l'état avant déconnexion
        
        if (socket.userId) {
          userSockets.delete(socket.userId);
        }
        
        if (socket.rooms) {
          for (const roomId of socket.rooms) {
            if (roomSockets.has(roomId)) {
              roomSockets.get(roomId).delete(socket);
              if (roomSockets.get(roomId).size === 0) {
                roomSockets.delete(roomId);
              }
            }
          }
        }

        if (socket.roomId && roomSockets.has(socket.roomId)) {
          roomSockets.get(socket.roomId).delete(socket);
          if (roomSockets.get(socket.roomId).size === 0) {
            roomSockets.delete(socket.roomId);
          }
        }
        
        console.log(`Client disconnected. IP: ${req.ip}, Code: ${code}, Reason: ${reason.toString()}`)
        printRoomsDebug(); // Debug: afficher l'état après déconnexion
      })
    } catch (err) {
      console.error('Error during authentication:', err.message)
      socket.close(503, 'Service Unavailable: Authentication service error')
    }

  })
})

setInterval(() => {
  const allSockets = new Set();
  for (const room of roomSockets.values()) {
    for (const sock of room) {
      allSockets.add(sock);
    }
  }
  
  for (const sock of allSockets) {
    if (sock.readyState === sock.OPEN) {
      if (sock.isAlive === false) {
        sock.terminate();
      } else {
        sock.isAlive = false;
        try { sock.ping(); } catch {}
      }
    }
  }
}, 30000);
