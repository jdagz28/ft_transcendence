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
   
    //  get a list of tournaments
    fastify.get('/games/tournaments', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentHandler (request, reply) {
        const tournaments = await fastify.gameService.getTournaments(request)
        if (!tournaments) {
          return reply.code(400).send({ error: 'Failed to retrieve tournaments' })
        }
        return reply.send(tournaments)
      }
    })

    // * get a specific tournament
    fastify.get('/games/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getSpecificTournamentHandler(request, reply) {
        const { tournamentId } = request.params
        const tournament = await fastify.gameService.getTournamentById(request, tournamentId)
        if (!tournament) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(tournament)
      }
    })

    // * Get a specific tournament players
    fastify.get('/games/tournaments/:tournamentId/players', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentPlayersHandler(request, reply) {
        const { tournamentId } = request.params
        const players = await fastify.gameService.getTournamentPlayers(request, tournamentId)
        if (!players) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(players)
      }
    })

    // * Delete a tournament by creator
    fastify.delete('/games/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentHandler(request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.deleteTournament(request, tournamentId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(result)
      }
    })

    // *  Delete a game by creator
    fastify.delete('/games/:gameId', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteGameHandler(request, reply) {
        const { gameId } = request.params
        const userId = request.user.id
        const result = await fastify.gameService.deleteGame(request, gameId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(result)
      }
    })

    // * Get a specifc game's players
    fastify.get('/games/:gameId/players', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGamePlayersHandler(request, reply) {
        const { gameId } = request.params
        const players = await fastify.gameService.getGamePlayers(request, gameId)
        if (!players) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(players)
      }
    })

    // * Start a game - update game status 
    fastify.patch('/games/:gameId/start', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function startGameHandler(request, reply) {
        const { gameId } = request.params
        const result = await fastify.gameService.startGame(request, gameId)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(result)
      }
    })


    //! ============ MATCHMAKING ============
    //! Draw randomlly to bracket players --- generate the games table
    //! Start a tournament - update tournament status

    //! Get all tournaments games

    //! Get a specific tournament's games

    
    

    

  

  }, {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks']
  }
)