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

    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
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
      socket.send(`User: ${userId} successfuly connected`)

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
            result = await fastify.chat.joinChat(parsed, userId);//CHANGE PARAM 
            if (result.valid) {
              addSocketToRoom(parsed.room, socket)
              socket.send('Room joined')
            } else {
              socket.send(result.reason)
            }
            break;
          case 'send':
              if (!socket.roomId || socket.roomId !== parsed.room) {
                socket.send('You must join the room before sending messages');
                break;
              }
            result = await fastify.chat.sendMessage(parsed, userId);
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
        if (socket.roomId && roomSockets.has(socket.roomId)) {
          roomSockets.get(socket.roomId).delete(socket);
          if (roomSockets.get(socket.roomId).size === 0) {
            roomSockets.delete(socket.roomId);
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
