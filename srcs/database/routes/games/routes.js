'use strict'

const fp = require('fastify-plugin')

module.exports = fp(
  async function gameRoutes (fastify, opts) {
    fastify.post('/games/createGame', {
      schema: {
        body: fastify.getSchema('schema:games:createGame')
      },
      onRequest: fastify.authenticate,
      handler: async function createGameHandler (request, reply) {
        try {
          const user = request.user.id 
          const { mode, maxPlayers, gameType, gameMode } = request.body
          console.log('Creating game with mode:', mode, 'and max players:', maxPlayers) //! DELETE
          const game = await fastify.dbGames.createGame(user, mode, maxPlayers, gameType, gameMode)
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

    fastify.patch('/games/:gameId/options', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateGameOptions')
      },
      onRequest: fastify.authenticate,
      handler: async function updateGameOptionsHandler (request, reply) {
        try {
          const { gameId } = request.params
          const { userId, num_games, num_matches, ball_speed, death_timed, time_limit } = request.body
          console.log('Updating game options for gameId:', gameId, 'by userId:', userId) //! DELETE
          console.log('Options:', { num_games, num_matches, ball_speed, death_timed, time_limit }) //! DELETE
          const updatedGame = await fastify.dbGames.updateGameOptions(gameId, userId, num_games, num_matches, ball_speed, death_timed, time_limit)
          if (!updatedGame) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(updatedGame)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
    
    fastify.get('/games/:gameId/options', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGameOptionsHandler (request, reply) {
        try {
          const { gameId } = request.params
          const gameOptions = await fastify.dbGames.getGameOptions(gameId)
          if (!gameOptions) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(gameOptions)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/all', {
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
    })

    fastify.patch('/games/:gameId', {
      onRequest:fastify.authenticate,
      handler: async function joinGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const user = request.user.id
          const game = await fastify.dbGames.joinGame(gameId, user)
          if (!game) {
            reply.status(400).send({ error: 'Failed to join game' })
            return
          }
          if (game.error == 'Game is not joinable') {
            reply.status(409).send({ error: 'Game is not joinable' })
            return
          }
          if (game.error == 'Game is full') {
            reply.status(409).send({ error: 'Game is full' })
            return
          }

          reply.status(200).send(game)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/games/:gameId/leave', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const userId = request.user.id
          const result = await fastify.dbGames.leaveGame(gameId, userId)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/games/:gameId', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const userId = request.user.id
          const result = await fastify.dbGames.deleteGame(gameId, userId)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/:gameId/players', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGamePlayersHandler(request, reply) {
        try {
          const { gameId } = request.params
          const players = await fastify.dbGames.getGamePlayers(gameId)
          if (!players) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(players)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.patch('/games/:gameId/start', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function startGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const userId = request.user.id
          const players = request.body.options
          const result = await fastify.dbGames.startGame(gameId, userId, players)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
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
        try {
          const { gameId } = request.params
          const userId  = request.user.id
          const gameDetails = await fastify.dbGames.getGameDetails(gameId, userId)
          console.log('Game details retrieved:', gameDetails) //! DELETE
          if (!gameDetails) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(gameDetails)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.patch('/games/:gameId/status', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateGameStatus')
      },
      onRequest: fastify.authenticate,
      handler: async function updateGameStatusHandler(request, reply) {
        try {
          const { gameId } = request.params
          const { status, matchId, stats } = request.body
          const userId = request.user.id
          const updatedGame = await fastify.dbGames.updateGameStatus(gameId, matchId, status, stats, userId)
          if (!updatedGame) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(updatedGame)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/:gameId/summary', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        // response: {
        //   200: fastify.getSchema('schema:games:gameHistory')
        // }
      },
      onRequest: fastify.authenticate,
      handler: async function getGameSummaryHandler(request, reply) {
        try {
          const { gameId } = request.params
          const summary = await fastify.dbGames.getGameSummary(gameId)
          if (!summary) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(summary)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/:gameId/isTourAdmin', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function isTourAdminHandler(request, reply) {
        try {
          const { gameId } = request.params
          const userId = request.user.id
          const isAdmin = await fastify.dbGames.isTourAdmin(gameId, userId)
          if (isAdmin === null) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send({ isAdmin })
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/leaderboard', {
      onRequest: fastify.authenticate,
      handler: async function getLeaderboardHandler(request, reply) {
        try {
          const leaderboard = await fastify.dbGames.getLeaderboardStats()
          if (!leaderboard) {
            reply.status(400).send({ error: 'Failed to retrieve leaderboard' })
            return
          }
          console.log('Leaderboard retrieved:', leaderboard) //! DELETE
          reply.status(200).send(leaderboard)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.post('/games/:gameId/invite', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:inviteUser')
      },
      onRequest: fastify.authenticate,
      handler: async function inviteToGameHandler(request, reply) {
        try {
          const { gameId } = request.params
          const { username } = request.body
          const inviter = request.user.id
          const userId = await fastify.getUserId(username)
          if (!userId) {
            reply.status(404).send({ error: 'User not found' })
            return
          }
          const result = await fastify.dbGames.inviteToGame(gameId, userId, inviter)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.patch('/games/invites/respond', {
      schema: {
        body: fastify.getSchema('schema:games:respondToInvite')
      },
      onRequest: fastify.authenticate,
      handler: async function respondToInviteHandler(request, reply) {
        try {
          const { gameId, response } = request.body
          const userId = request.user.id
          console.log('Responding to invite for gameId:', gameId, 'by userId:', userId, 'with response:', response) //! DELETE
          const result = await fastify.dbGames.respondToInvite(gameId, userId, response)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/invites', {
      onRequest: fastify.authenticate,
      handler: async function getGameInvitesHandler(request, reply) {
        try {
          const userId = request.user.id
          console.log('Fetching invites for userId:', userId) //! DELETE
          const invites = await fastify.dbGames.getGameInvites(userId)
          if (!invites) {
            reply.status(404).send({ error: 'No invites found' })
            return
          }
          reply.status(200).send(invites)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.patch('/games/:gameId/in-game', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
        body: fastify.getSchema('schema:games:updateInGameStatus')
      },
      onRequest: fastify.authenticate,
      handler: async function updateInGameStatusHandler(request, reply) {
        try {
          const { gameId } = request.params
          const { status } = request.body
          const userId = request.user.id
          console.log('Updating in-game status for gameId:', gameId, 'to status:', status) //! DELETE
          const result = await fastify.dbGames.updateInGameStatus(userId, gameId, status)
          if (!result) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/:gameId/tournament', {
      schema: {
        params: fastify.getSchema('schema:games:gameID')
      },
      handler: async function getTournamentIdHandler(request, reply) {
        try {
          const { gameId } = request.params
          const tournamentId = await fastify.dbGames.getTournamentId(gameId)
          if (!tournamentId) {
            reply.status(404).send({ error: 'Game not found' })
            return
          }
          reply.status(200).send(tournamentId)
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