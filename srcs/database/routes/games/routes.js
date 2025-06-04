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

    fastify.post('/games/tournaments/createTournament', {
      schema: {
        body: fastify.getSchema('schema:games:createTournament')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentHandler(request, reply) {
        try {
          const userId = request.user.id
          const { name, maxPlayers, gameMode, gameType } = request.body
          const tournament = await fastify.dbGames.createTournament(userId, name, maxPlayers, gameMode, gameType)
          if (!tournament) {
            reply.status(400).send({ error: 'Failed to create tournament' })
            return
          }
          reply.status(201).send(tournament)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.patch('/games/tournaments/:tournamentId/join', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function joinTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbGames.joinTournament(tournamentId, userId)
          if (!result) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/games/tournaments/:tournamentId/leave', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbGames.leaveTournament(tournamentId, userId)
          if (!result) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/tournaments/all', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentsHandler(request, reply) {
        try {
          const tournaments = await fastify.dbGames.getTournaments()
          if (!tournaments) {
            reply.status(400).send({ error: 'Failed to retrieve tournaments' })
            return
          }
          reply.status(200).send(tournaments)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getSpecificTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const tournament = await fastify.dbGames.getTournamentById(tournamentId)
          if (!tournament) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(tournament)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/games/tournaments/:tournamentId/players', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentPlayersHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const players = await fastify.dbGames.getTournamentPlayers(tournamentId)
          if (!players) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(players)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/games/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:games:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbGames.deleteTournament(tournamentId, userId)
          if (!result) {
            reply.status(404).send({ error: 'Tournament not found' })
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

  },
  {
    name: 'gameRoutes',
    dependencies: [ 'gameAutoHooks' ]
  }
)