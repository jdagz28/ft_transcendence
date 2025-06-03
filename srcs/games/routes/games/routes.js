'use strict'

const fp = require('fastify-plugin')


module.exports = fp(
  async function gameRoutes (fastify, opts) {
    //  create a new game
    fastify.post('/games/create', {
      schema: {
        body: fastify.getSchema('schema:games:createGame')
      },
      onRequest: fastify.authenticate,
      handler: async function createGameHandler (request, reply) {
        const game = await fastify.gameService.createGame(request)
        return reply.code(201).send(game)
      }
    })

    // update game options
    fastify.patch('/games/:gameId/options', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateGameOptions')
      },
      onRequest: fastify.authenticate,
      handler: async function updateGameOptionsHandler (request, reply) {
        const updatedGame = await fastify.gameService.updateGameOptions(request)
        if (!updatedGame) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(updatedGame)
      }
    })

    // get a list of games
    fastify.get('/games/all', {
      onRequest: fastify.authenticate,
      handler: async function getGamesHandler (request, reply) {
        const games = await fastify.gameService.getGames(request)
        console.log('Games retrieved:', games) //! DELETE
        if (!games) {
          return reply.code(400).send({ error: 'Failed to retrieve games' })
        }
        return reply.send(games)
      }
    })
    
    
    // get a specific game
    fastify.get('/games/:gameId', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getSpecificGameHandler(request, reply) {
        const { gameId } = request.params
        console.log ('Retrieving game with ID:', gameId) //! DELETE
        const game = await fastify.gameService.getGameById(request, gameId)
        if (!game) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(game)
      }
    })

    
    // join a game
    fastify.patch('/games/:gameId/join', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function joinGameHandler(request, reply) {
        const { gameId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.joinGame(request, gameId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        if (result.status == 'full') {
          return reply.code(409).send({ error: 'Game is full' })
        }
        return reply.send(result)
      }
    })

    // leave a game
    fastify.delete('/games/:gameId/leave', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveGameHandler(request, reply) {
        const { gameId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.leaveGame(request, gameId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.send(result)
      }
    })
    

    // create a tournament
    fastify.post('/games/tournaments/create', {
      schema: {
        body: fastify.getSchema('schema:games:createTournament')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentHandler (request, reply) {
        const tournament = await fastify.gameService.createTournament(request)
        return reply.code(201).send(tournament)
      }
    })

    // join a tournament
    fastify.patch('/games/tournaments/:tournamentId/join', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function joinTournamentHandler (request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.joinTournament(request, tournamentId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        if (result.status == 'full') {
          return reply.code(409).send({ error: 'Tournament is full' })
        }
        return reply.send(result)
      }
    })

    // leave a tournament
    fastify.delete('/games/tournaments/:tournamentId/leave', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveTournamentHandler (request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.leaveTournament(request, tournamentId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.send(result)
      }
    })


    /*
    * get a list of tournaments
    fastify.get('/games/tournaments', {
    })

    * get a specific tournament
    fastify.get('/games/tournaments/:tournamentId', {
    })

   

   
    
    */
  }, {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks']
  }
)