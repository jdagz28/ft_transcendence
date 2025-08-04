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
        if (updatedGame.error) {
          return reply.code(updatedGame.status || 400).send({ error: updatedGame.error })
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
        if (gameOptions.error) {
          return reply.code(gameOptions.status || 400).send({ error: gameOptions.error })
        }
        return reply.code(200).send(gameOptions)
      }
    })

    // get a list of games
    fastify.get('/games/all', {
      onRequest: fastify.authenticate,
      handler: async function getGamesHandler (request, reply) {
        const games = await fastify.gameService.getGames(request)

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
        const game = await fastify.gameService.getGameById(request, gameId)
        if (game.error) {
          return reply.code(game.status || 404).send({ error: game.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (players.error) {
          return reply.code(players.status || 404).send({ error: players.error })
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
        if (result.error) {
          return reply.code(result.status || 404).send({ error: result.error })
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
        if (gameDetails.error) {
          return reply.code(gameDetails.status || 404).send({ error: gameDetails.error })
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
        if (updatedGame.error) {
          return reply.code(updatedGame.status || 404).send({ error: updatedGame.error })
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
        if (summary.error) {
          return reply.code(summary.status || 404).send({ error: summary.error })
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
        if (isAdmin.error) {
          return reply.code(isAdmin.status || 404).send({ error: isAdmin.error })
        }
        return reply.code(200).send({ isAdmin })
      }
    })

    fastify.get('/games/leaderboard', {
      onRequest: fastify.authenticate,
      handler: async function getLeaderboardHandler(request, reply) {
        const leaderboard = await fastify.gameService.getLeaderboard(request)
        
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
        }
        if (response === "accept" ) {
          fastify.gameBroadcast(gameId, { type: "player-joined" })
        } else if (response === "decline" && result.slot ) {
          fastify.gameBroadcast(gameId, { type: "invite-declined", slot: result.slot })
        }
        return reply.send(result)
      }
    })

    fastify.get('/games/invites', {
      onRequest: fastify.authenticate,
      handler: async function getGameInvitesHandler(request, reply) {
        const invites = await fastify.gameService.getGameInvites(request)
        if (invites.error) {
          return reply.code(invites.status || 404).send({ error: invites.error })
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
        if (result.error) {
          return reply.code(result.status || 400).send({ error: result.error })
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
        if (tournamentId.error) {
          return reply.code(tournamentId.status || 404).send({ error: tournamentId.error })
        }
        return reply.send({ tournamentId })
      }
    })

  }, {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks', 'wsBroadcast']
  }
)