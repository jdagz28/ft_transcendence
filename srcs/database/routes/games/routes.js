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
          const gameId = await fastify.dbGames.createGame(user, mode, maxPlayers, gameType, gameMode)
          
          reply.status(201).send(gameId) 
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
          const updatedGame = await fastify.dbGames.updateGameOptions(gameId, userId, num_games, num_matches, ball_speed, death_timed, time_limit)
          if (updatedGame.error) {
            if (updatedGame.status) {
              return reply.status(updatedGame.status).send({ error: updatedGame.error })
            }
            return reply.status(400).send({ error: updatedGame.error })
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
          if (gameOptions.error) {
            if (gameOptions.status) {
               return reply.status(gameOptions.status).send({ error: gameOptions.error })
            }
            return reply.status(400).send({ error: gameOptions.error })
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
          if (game.error) {
             return reply.status(game.status).send({ error: game.error })
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
          const game = await fastify.dbGames.joinGame(gameId, user, null)
          if (game.error) {
            if (game.status) {
              return reply.status(game.status).send({ error: game.error })
            }
            return reply.status(400).send({ error: game.error })
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
          const { userId } = request.body
          const result = await fastify.dbGames.leaveGame(gameId, userId)
          if (result.error) {
            if (result.status) {
              return reply.status(result.status).send({ error: result.error })
            }
            return reply.status(404).send({ error: result.error })
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
          if (result.error) {
            return reply.status(404).send({ error: result.error })
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
          if (players.error) {
            return reply.status(404).send({ error: players.error })
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
          if (result.error) {
            if (fastify.db.inTransaction) {
              fastify.db.exec('ROLLBACK')
            }
            if (result.status) {
              return reply.status(result.status).send({ error: result.error })
            }
            return reply.status(400).send({ error: result.error })
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
          if (gameDetails.error) {
            if (gameDetails.status) {
              return reply.status(gameDetails.status).send({ error: gameDetails.error })
            }
            return reply.status(400).send({ error: gameDetails.error })
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
          if (updatedGame.error) {
            if (fastify.db.inTransaction) {
              fastify.db.exec('ROLLBACK')
            }
            if (updatedGame.status) {
              return reply.status(updatedGame.status).send({ error: updatedGame.error })
            }
            return reply.status(400).send({ error: updatedGame.error })
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
        params: fastify.getSchema('schema:games:gameID')
      },
      onRequest: fastify.authenticate,
      handler: async function getGameSummaryHandler(request, reply) {
        try {
          const { gameId } = request.params
          const summary = await fastify.dbGames.getGameSummary(gameId)
          if (summary.error) {
            return reply.status(404).send({ error: summary.error })
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
          if (isAdmin.error) {
            if (isAdmin.status) {
              return reply.status(isAdmin.status).send({ error: isAdmin.error })
            }
            return reply.status(400).send({ error: isAdmin.error })
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
          const { username, slot } = request.body
          const inviter = request.user.id
          const userId = await fastify.getUserId(username)
          if (!userId) {
            return reply.status(404).send({ error: 'User not found' })
          }
          const result = await fastify.dbGames.inviteToGame(gameId, userId, inviter, slot)

          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/games/:gameId/invite', {
      schema: {
        params: fastify.getSchema('schema:games:gameID'),
      },
      onRequest: fastify.authenticate,
      handler: async function cancelInviteHandler(request, reply) {
        try {
          const { gameId } = request.params
          const { slot } = request.body
          const userId = request.user.id
          const result = await fastify.dbGames.cancelInvite(gameId, userId, slot)
          if (result.error) {
            if (result.status) {
              return reply.status(result.status).send({ error: result.error })
            }
            return reply.status(400).send({ error: result.error })
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
          
          const result = await fastify.dbGames.respondToInvite(gameId, userId, response)
          if (result.error) {
            if (result.status) {
              return reply.status(result.status).send({ error: result.error })
            }
            return reply.status(400).send({ error: result.error })
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
          const invites = await fastify.dbGames.getGameInvites(userId)

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
          const result = await fastify.dbGames.updateInGameStatus(userId, gameId, status)
          if (result.error) {
            if (result.status) {
              return reply.status(result.status).send({ error: result.error })
            }
            return reply.status(400).send({ error: result.error })
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
            reply.status(404).send({ error: 'Game not a tournament game' })
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