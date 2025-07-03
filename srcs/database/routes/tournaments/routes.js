'use strict'

const fp = require('fastify-plugin')

module.exports = fp(
  async function tournamentRoutes(fastify, opts) {
    fastify.post('/tournaments/createTournament', {
      schema: {
        body: fastify.getSchema('schema:tournaments:createTournament')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentHandler(request, reply) {
        try {
          const userId = request.user.id
          const { name, maxPlayers, gameMode, gameType } = request.body
          const tournament = await fastify.dbTournaments.createTournament(userId, name, maxPlayers, gameMode, gameType)
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

    fastify.patch('/tournaments/:tournamentId/join', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function joinTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.joinTournament(tournamentId, userId)
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

    fastify.post('/tournaments/:tournamentId/invite', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:inviteUser')
      },
      onRequest: fastify.authenticate,
      handler: async function inviteUserToTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const { userId, slotIndex } = request.body
          const result = await fastify.dbTournaments.inviteUserToTournament(tournamentId, userId, slotIndex)
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

    fastify.get('/tournaments/invites/:userId', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentInvitesHandler(request, reply) {
        try {
          const { userId } = request.params
          const invites = await fastify.dbTournaments.getTournamentInvites(userId)
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

    fastify.patch('/tournaments/invites/:inviteId/respond', {
      schema: {
        params: fastify.getSchema('schema:tournaments:inviteID'),
        body: fastify.getSchema('schema:tournaments:respondToInvite')
      },
      onRequest: fastify.authenticate,
      handler: async function respondToTournamentInviteHandler(request, reply) {
        try {
          const { inviteId } = request.params
          const userId = request.user.id
          const { tournamentId, response } = request.body
          const result = await fastify.dbTournaments.respondToTournamentInvite(inviteId, userId, response, tournamentId)
          if (!result) {
            reply.status(404).send({ error: 'Invite not found' })
            return
          }
          reply.status(200).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/tournaments/:tournamentId/leave', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.leaveTournament(tournamentId, userId)
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

    fastify.get('/tournaments/all', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentsHandler(request, reply) {
        try {
          const tournaments = await fastify.dbTournaments.getTournaments()
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

    fastify.get('/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getSpecificTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const tournament = await fastify.dbTournaments.getTournamentById(tournamentId)
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

    fastify.get('/tournaments/:tournamentId/settings', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentSettingsHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const settings = await fastify.dbTournaments.getTournamentSettings(tournamentId)
          if (!settings) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(settings)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
    
    fastify.get('/tournaments/:tournamentId/players', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentPlayersHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const players = await fastify.dbTournaments.getTournamentPlayers(tournamentId)
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

    fastify.delete('/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.deleteTournament(tournamentId, userId)
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

    fastify.patch('/tournaments/:tournamentId/start', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function startTournamentHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.startTournament(tournamentId, userId)
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

    fastify.patch('/tournaments/:tournamentId/options', {
      schme: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:updateTournamentOptions')
      },
      onRequest: fastify.authenticate,
      handler: async function updateTournamentOptionsHandler(request, reply) {
        try {
          const { num_games, num_matches, 
            ball_speed, death_timed, time_limit } = request.body
          const { tournamentId } = request.params
          const userId = request.user.id
          const updatedTournament = await fastify.dbTournaments.updateTournamentOptions(
            tournamentId, userId, num_games, num_matches, ball_speed, death_timed, time_limit)
          if (!updatedTournament) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(updatedTournament)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.post('/tournaments/:tournamentId/alias', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:tournamentAlias')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentAliasHandler(request, reply) {
        try {
          const { alias } = request.body
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.createTournamentAlias(tournamentId, userId, alias)
          if (!result) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(201).send(result)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.delete('/tournaments/:tournamentId/alias', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:tournamentAlias')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentAliasHandler(request, reply) {
        try {
          const { alias } = request.body
          const { tournamentId } = request.params
          const userId = request.user.id
          const result = await fastify.dbTournaments.deleteTournamentAlias(tournamentId, userId, alias)
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

    fastify.get('/tournaments/:tournamentId/aliases', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentAliasHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const aliases = await fastify.dbTournaments.getTournamentAliases(tournamentId)
          if (!aliases) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(aliases)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/tournaments/:tournamentId/brackets', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentBracketsHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const brackets = await fastify.dbTournaments.getTournamentBrackets(tournamentId)
          if (!brackets) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(brackets)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/tournaments/:tournamentId/games', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentGamesHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const userId = request.user.id
          const games = await fastify.dbTournaments.getTournamentGames(tournamentId, userId)
          if (!games) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(games)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/tournaments/:tournamentId/summary', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        // response: {
        //   200: fastify.getSchema('schema:tournaments:tournamentSummary')
        // }
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentSummaryHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const summary = await fastify.dbTournaments.getTournamentSummary(tournamentId)
          if (!summary) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(summary)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/tournaments/:tournamentId/available', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getAvailablePlayersHandler(request, reply) {
        try {
          const { tournamentId } = request.params
          const availablePlayers = await fastify.dbTournaments.getAvailablePlayers(tournamentId)
          if (!availablePlayers) {
            reply.status(404).send({ error: 'Tournament not found' })
            return
          }
          reply.status(200).send(availablePlayers)
        } catch (err) {
          fastify.log.error(err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
  },
  {
    name: 'tournamentRoutes',
    dependencies: [ 'tournamentAutoHooks']
  }
)