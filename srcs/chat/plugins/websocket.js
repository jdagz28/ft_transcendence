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
  const sockets = roomSockets.get(roomId) || new Set();
  
  for (const sock of sockets) {
    if (sock !== exceptSocket) {
      sock.send(message);
    } else {
    
    }
  }
}


function sendMessageToUser(userId, message) {
  const socket = userSockets.get(userId);
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  } else {
    return false;
  }
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

      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.on('message', async message => {
        try {
          var parsed = JSON.parse(message.toString())
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
            result = await fastify.chat.joinChat(parsed, userId);
            if (result.valid) {
              addSocketToRoom(parsed.room, socket)
              socket.send(JSON.stringify({ type: 'info', message: 'Room joined' }));
            } else {
              socket.send(result.reason)
            }
            break;
          case 'send':
            
            if (!socket.rooms || !socket.rooms.has(parsed.room)) {
                socket.send('You must join the room before sending messages');
                break;
            }
            
            result = await fastify.chat.sendMessage(parsed, userId);
            if (result.valid === true) {
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
