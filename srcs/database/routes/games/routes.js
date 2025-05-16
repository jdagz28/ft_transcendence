'use strict'

const fp = require('fastify-plugin')

module.exports = fp(
  async function gameRoutes (fastify, opts) {
    fastify.post('/games', {
      schema: {
        body: fastify.getSchema('schema:games:createGame')
      },
      onRequest: fastify.authenticate,
      handler: async function createGameHandler (request, reply) {
        try {
          const user = request.user.id 
          const { mode } = request.body
          const game = await fastify.dbGames.createGame(user, mode)
          if (!game) {
            reply.status(400).send({ error: 'Failed to create game' })
            return
          }
          reply.status(201).send(game)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
  },
  {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks' ]
  }
)