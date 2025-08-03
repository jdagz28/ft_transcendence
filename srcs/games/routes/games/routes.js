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

    fastify.get('/games/:gameId/options', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGameOptionsHandler (request, reply) {
        const { gameId } = request.params
        const gameOptions = await fastify.gameService.getGameOptions(request, gameId)
        if (!gameOptions) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(gameOptions)
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
        const userId = request.body.userId || request.user.id 
        const result = await fastify.gameService.leaveGame(request, gameId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.send(result)
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

    fastify.get('/games/:gameId/details', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        response: {
          200: fastify.getSchema('schema:games:gameDetails')
        }
      },
      onRequest: fastify.authenticate,
      handler: async function getGameDetailsHandler(request, reply) {
        const { gameId } = request.params
        const gameDetails = await fastify.gameService.getGameDetails(request, gameId)
        if (!gameDetails) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(gameDetails)
      }
    })


    fastify.patch('/games/:gameId/status', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateGameStatus')
      },
      onRequest: fastify.authenticate,
      handler: async function updateGameStatusHandler(request, reply) {
        const { gameId } = request.params
        const updatedGame = await fastify.gameService.updateGameStatus(request, gameId)
        if (!updatedGame) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(updatedGame)
      }
    })

    // * game summary
    fastify.get('/games/:gameId/summary', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGameSummaryHandler(request, reply) {
        const { gameId } = request.params
        const summary = await fastify.gameService.getGameSummary(request, gameId)
        if (!summary) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.code(200).send(summary)
      }
    })

    fastify.get('/games/:gameId/isTourAdmin', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function isTourAdminHandler(request, reply) {
        const { gameId } = request.params
        const isAdmin = await fastify.gameService.isTourAdmin(request, gameId)
        if (isAdmin === null) {
          return reply.code(200).send({ error: 'Game not found' })
        }
        return reply.code(200).send({ isAdmin })
      }
    })

    fastify.get('/games/leaderboard', {
      onRequest: fastify.authenticate,
      handler: async function getLeaderboardHandler(request, reply) {
        const leaderboard = await fastify.gameService.getLeaderboard(request)
        if (!leaderboard) {
          return reply.code(400).send({ error: 'Failed to retrieve leaderboard' })
        }
        return reply.send(leaderboard)
      }
    })

    fastify.post('/games/:gameId/invite', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:inviteUser')
      },
      onRequest: fastify.authenticate,
      handler: async function inviteToGameHandler(request, reply) {
        const { gameId } = request.params
        const { username, slot } = request.body
        const result = await fastify.gameService.inviteToGame(request, gameId, username, slot)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.send(result)
      }
    })

    fastify.delete('/games/:gameId/invite', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:cancelInvite')
      },
      onRequest: fastify.authenticate,
      handler: async function cancelInviteHandler(request, reply) {
        const { gameId } = request.params
        const { slot } = request.body
        const result = await fastify.gameService.cancelInvite(request, gameId, slot)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.send(result)
      }
    })

    fastify.patch('/games/invites/respond', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:respondToInvite')
      },
      onRequest: fastify.authenticate,
      handler: async function respondToInviteHandler(request, reply) {
        const { gameId, response } = request.body
        const result = await fastify.gameService.respondToInvite(request, gameId, response)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        if (response === "accept" ) {
          fastify.gameBroadcast(gameId, { type: "player-joined" })
        }
        return reply.send(result)
      }
    })

    fastify.get('/games/invites', {
      onRequest: fastify.authenticate,
      handler: async function getGameInvitesHandler(request, reply) {
        const invites = await fastify.gameService.getGameInvites(request)
        if (!invites) {
          return reply.code(404).send({ error: 'No invites found' })
        }
        return reply.send(invites)
      }
    })

    fastify.patch('/games/:gameId/in-game', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateInGameStatus')
      },
      onRequest: fastify.authenticate,
      handler: async function updateInGameStatusHandler(request, reply) {
        const { gameId } = request.params
        const { status } = request.body
        const result = await fastify.gameService.updateInGameStatus(request, gameId, status)
        if (!result) {
          return reply.code(404).send({ error: 'Game not found' })
        }
        return reply.send(result)
      }
    })

    fastify.get('/games/:gameId/tournament', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentHandler(request, reply) {
        const { gameId } = request.params
        const tournamentId = await fastify.gameService.getTournamentId(request, gameId)
        if (tournamentId === -1) {
          return reply.code(404).send({ error: 'No tournament associated with this game' })
        }
        return reply.send({ tournamentId })
      }
    })

  }, {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks', 'wsBroadcast']
  }
)