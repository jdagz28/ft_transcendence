'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')
const jwt = require('@fastify/jwt')

const authApi = axios.create({
  baseURL: `http://authentication:${process.env.AUTH_PORT}`,
  timeout: 2000
})


module.exports = fp(async function authProxy (fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return reply.code(401).send({ error: 'Missing token' })
    }

    try {
      const { data } = await authApi.get('/auth/verify', { params: { token } })
      if (!data.valid) {
        return reply.code(401).send({ error: 'Invalid token' })
      }
      
      request.user = data.user
    } catch (err) {
      fastify.log.error('Error during authentication:', err)
      return reply.code(503).send({ error: 'UserMgmt: Authentication Service Unavailable' })
    }
  })

  fastify.decorateRequest('user', null)
}, {
  name: 'authProxy'
})