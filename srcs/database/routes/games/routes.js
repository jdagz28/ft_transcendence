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

    fastify.get('/games', {
      onRequest: fastify.authenticate,
      handler: async function getGamesHandler (request, reply) {
        try {
          const games = await fastify.dbGames.getGames()
          if (!games) {
            reply.status(400).send({ error: 'Failed to retrieve games' })
            return
          }
          console.log('Games retrieved:', games) //! DELETE
          reply.status(200).send(games)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/:gameId', {
      onRequest: fastify.authenticate,
      handler: async function getSpecificGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const game = await fastify.dbGames.getGameById(gameId)
          if (!game) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(game)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    }
    )

  },
  {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks' ]
  }
)