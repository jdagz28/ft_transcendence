'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')
const userConnections = new Map()

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

    try {
      const { data } = await authApi.get('/auth/verify', { params: { token } })
      if (!data.valid) {
        socket.close(4001, 'Unauthorized: Invalid token')
        return
      }
      const userId = data.user.id;
      socket.send(`User: ${userId} successfuly connected`)

      socket.on('message', message => {
        socket.send(`hi from server: ${message.toString()}`)
      })

      socket.on('close', (code, reason) => {
        console.log(`Client disconnected. IP: ${req.ip}, Code: ${code}, Reason: ${reason.toString()}`)
      })
    } catch (err) {
      console.error('Error during authentication:', err.message)
      socket.close(503, 'Service Unavailable: Authentication service error')
    }

  })
})
