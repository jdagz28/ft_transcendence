'use strict'

const fp = require('fastify-plugin')


module.exports = fp(
  async function gameRoutes (fastify, opts) {
    //  create a new game
    fastify.post('/games', {
      schema: {
        body: fastify.getSchema('schema:games:createGame')
      },
      onRequest: fastify.authenticate,
      handler: async function createGameHandler (request, reply) {
        try {
          const { mode } = request.body
          const game = await fastify.gameService.createGame(request, mode)
          reply.status(201).send(game)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    
    // get a list of games
    fastify.get('/games', {
      onRequest: fastify.authenticate,
      handler: async function getGamesHandler (request, reply) {
        try {
          const games = await fastify.gameService.getGames(request)
          console.log('Games retrieved:', games) //! DELETE
          if (!games) {
            reply.status(400).send({ error: 'Failed to retrieve games' })
            return
          }
          reply.status(200).send(games)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
    
    /*
    * get a specific game
    fastify.get('/games/:gameId', {
    })

    * join a game
    fastify.put('/games/:gameId/join', {
    })

    * leave a game
    fastify.delete('/games/:gameId', {
    })

    * create a tournament
    fastify.post('/games/tournaments', {
    })

    * get a list of tournaments
    fastify.get('/games/tournaments', {
    })

    * get a specific tournament
    fastify.get('/games/tournaments/:tournamentId', {
    })

    * join a tournament
    fastify.put('/games/tournaments/:tournamentId/join', {
    })

    * leave a tournament
    
    */
  }, {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks']
  }
)