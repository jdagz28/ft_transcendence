'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')
const roomSockets = new Map()

function addSocketToRoom(roomId, socket) {
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
  roomSockets.get(roomId).add(socket);
  socket.roomId = roomId;
}

function broadcastToRoom(roomId, message, exceptSocket = null) {
  const sockets = roomSockets.get(roomId) || new Set();
  for (const sock of sockets) {
    if (sock !== exceptSocket) sock.send(message);
  }
}

const authApi = axios.create({
  baseURL: `http://authentication:${process.env.AUTH_PORT}`,
  timeout: 2000
})

module.exports = fp(async function chatPlugin (fastify, opts) {
  await fastify.register(require('@fastify/websocket'))

  fastify.get('/chat', {websocket: true}, async (socket, req) => {

    // const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const token = parsedUrl.query.token;
    console.log("token received: token") // REMOVE THIS LOG
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
      socket.send(JSON.stringify({ type: 'info', message: `User: ${userId} successfully connected` }));

      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.on('message', async message => {
        try {
          var parsed = JSON.parse(message.toString())
          console.log('Message reçu:', parsed); // REMOVE LOG
        } catch {
          console.error('Error parsing JSON:', message.toString())
          socket.send('Need to send a valid JSON object')
          return
        }

        let result = await fastify.chat.checkFields(parsed);
        if (result.valid === false) {
          console.log('checkFields failed:', result.reason);// REMOVE LOG
          socket.send(`${result.reason}`)
          return
        }

        switch (parsed.action) {
          case 'join':
            console.log("in case JOIN") //REMOVE THIS LOG
            result = await fastify.chat.joinChat(parsed, userId);//CHANGE PARAM 
            if (result.valid) {
              addSocketToRoom(parsed.room, socket)
              socket.send(JSON.stringify({ type: 'info', message: 'Room joined' }));
            } else {
              socket.send(result.reason)
            }
            break;
          case 'send':
            console.log("in case SEND") //REMOVE THIS LOG
              if (!socket.roomId || socket.roomId !== parsed.room) {
                socket.send('You must join the room before sending messages');
                break;
              }
            result = await fastify.chat.sendMessage(parsed, userId);
            console.log('Result sendMessage:', result); // REMOVE THIS LOG
            if (result.valid === true) {
              broadcastToRoom(parsed.room, JSON.stringify({
                from: userId,
                message: parsed.message
              }), socket);
            } else {
              socket.send(result.reason)
            }
            break;
        }
      })

      socket.on('close', (code, reason) => {
        console.log("INSIDE THE CLOSE EVENT!!!!!!") // REMOVE THIS LOG
        if (socket.roomId && roomSockets.has(socket.roomId)) {
          roomSockets.get(socket.roomId).delete(socket);
          console.log(`Socket removed from room ${socket.roomId}`); // REMOVE THIS LOG
          if (roomSockets.get(socket.roomId).size === 0) {
            roomSockets.delete(socket.roomId);
            console.log(`Room ${socket.roomId} deleted as it is empty`); // REMOVE THIS LOG
          }
        }
        console.log(`Client disconnected. IP: ${req.ip}, Code: ${code}, Reason: ${reason.toString()}`)
      })
    } catch (err) {
      console.error('Error during authentication:', err.message)
      socket.close(503, 'Service Unavailable: Authentication service error')
    }

  })
})

setInterval(() => {
  for (const room of roomSockets.values()) {
    for (const sock of room) {
      if (sock.isAlive === false) {
        sock.terminate();
      } else {
        sock.isAlive = false;
        try { sock.ping(); } catch {}
      }
    }
  }
}, 30000);
