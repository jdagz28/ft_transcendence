'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function userRoutes (fastify, opts) {
    fastify.get('/me', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
          try {
            const user = await fastify.usersDataSource.getMe(request.user.username)
            if (!user) {
              return reply.status(404).send({ error: 'User not found' })
            }
            return reply.status(200).send(user)
          } catch (err) {
            fastify.log.error(`Error fetching user: ${err.message}`)
            return reply.status(500).send({ error: 'Internal Server Error' })
          }
      }
    })
  
    fastify.get('/:username', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
          try {
            const user = await fastify.usersDataSource.getUserProfile(request.params.username)
            if (!user) {
              return reply.status(404).send({ error: 'User not found' })
            }
            return reply.status(200).send(user)
          } catch (err) {
            fastify.log.error(`Error fetching user: ${err.message}`)
            return reply.status(500).send({ error: 'Internal Server Error' })
          }
      }
    })
  }
)
