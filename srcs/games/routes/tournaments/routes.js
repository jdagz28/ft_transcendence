'use strict'

const fp = require('fastify-plugin')

module.exports = fp(
  async function tournamentRoutes (fastify, opts) {
    // create a tournament
    fastify.post('/tournaments/create', {
      schema: {
        body: fastify.getSchema('schema:tournaments:createTournament')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentHandler (request, reply) {
        const tournament = await fastify.tournamentService.createTournament(request)
        return reply.code(201).send(tournament)
      }
    })

    // join a tournament
    fastify.patch('/tournaments/:tournamentId/join', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function joinTournamentHandler (request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const { slotIndex } = request.body || {}
        const result = await fastify.tournamentService.joinTournament(request, tournamentId, userId, slotIndex)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        if (result.status == 'full') {
          return reply.code(409).send({ error: 'Tournament is full' })
        }

        fastify.tournamentBroadcast(tournamentId, {
          type: 'player-joined',
          player: userId
        });

        return reply.send(result)
      }
    })

    //invite someone to a tournament
    fastify.post('/tournaments/:tournamentId/invite', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:inviteUser')
      },
      onRequest: fastify.authenticate,
      handler: async function inviteUserToTournamentHandler (request, reply) {
        const { tournamentId } = request.params
        const { userId, slotIndex } = request.body
        const inviter = request.user.id
        const tournament = await fastify.tournamentService.getTournamentById(request, tournamentId)
        if (!tournament) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        fastify.log.info(tournament) //! DELETE
        const admin = tournament.created_by

        if (!admin || admin != inviter) {
          return reply.code(403).send({ error: 'You are not authorized to invite users to this tournament' })
        }
        const result = await fastify.tournamentService.inviteUserToTournament(request, tournamentId, userId, slotIndex)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.send(result)
      }
    })

    //get tournament invites
    fastify.get('/tournaments/invites', {
      onRequest: fastify.authenticate,
      handler: async function tournamentInvitesHandler (reuqest, reply) {
        const result = await fastify.tournamentService.getTournamentInvites(request, userId)
        if (!result) {
          return reply.code(404).send({ error: 'No tournament invites for user' })
        }
        return reply.send(result)
      }
    })

    //respond to invite
    fastify.patch('/tournaments/invites/:inviteId/respond', {
      schema: {
        params: fastify.getSchema('schema:tournaments:inviteID'),
        body: fastify.getSchema('schema:tournaments:respondToInvite')
      },
      onRequest: fastify.authenticate,
      handler: async function respondToInviteHandler (request, reply) {
        const { inviteId } = request.params
        const { response, tournamentId } = request.body
        const userId = request.user.id
        const result = await fastify.tournamentService.respondToTournamentInvite(request, tournamentId, response, inviteId)
        if (!result) {
          return reply.code(404).send({ error: 'Invite not found' })
        }
        return reply.send(result)
      }
    })

    // leave a tournament
    fastify.delete('/tournaments/:tournamentId/leave', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function leaveTournamentHandler (request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const result = await fastify.tournamentService.leaveTournament(request, tournamentId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        
        fastify.tournamentBroadcast(tournamentId, {
          type: 'player-joined',
          player: userId
        });

        return reply.send(result)
      }
    })
   
    // get tournament settings
    fastify.get('/tournaments/:tournamentId/settings', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentSettingsHandler (request, reply) {
        const { tournamentId } = request.params
        const settings = await fastify.tournamentService.getTournamentSettings(request, tournamentId)
        if (!settings) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(settings)
      }
    })


    //  get a list of tournaments
    fastify.get('/tournaments', {
      onRequest: fastify.authenticate,
      handler: async function getTournamentHandler (request, reply) {
        const tournaments = await fastify.tournamentService.getTournaments(request)
        if (!tournaments) {
          return reply.code(400).send({ error: 'Failed to retrieve tournaments' })
        }
        return reply.send(tournaments)
      }
    })

    // * get a specific tournament
    fastify.get('/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getSpecificTournamentHandler(request, reply) {
        const { tournamentId } = request.params
        const tournament = await fastify.tournamentService.getTournamentById(request, tournamentId)
        if (!tournament) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(tournament)
      }
    })

    // * Get a specific tournament players
    fastify.get('/tournaments/:tournamentId/players', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentPlayersHandler(request, reply) {
        const { tournamentId } = request.params
        const players = await fastify.tournamentService.getTournamentPlayers(request, tournamentId)
        if (!players) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(players)
      }
    })

    // * Delete a tournament by creator
    fastify.delete('/tournaments/:tournamentId', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentHandler(request, reply) {
        const { tournamentId } = request.params
        const userId = request.user.id
        const result = await fastify.tournamentService.deleteTournament(request, tournamentId, userId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(result)
      }
    })

    // * Start a tournament - update tournament status
    fastify.patch('/tournaments/:tournamentId/start', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function startTournamentHandler(request, reply) {
        const { tournamentId } = request.params
        const result = await fastify.tournamentService.startTournament(request, tournamentId)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(result)
      }
    })

    fastify.patch('/tournaments/:tournamentId/options', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:updateTournamentOptions')
      },
      onRequest: fastify.authenticate,
      handler: async function updateTournamentOptionsHandler(request, reply) {
        const { tournamentId } = request.params
        const updatedTournament = await fastify.tournamentService.updateTournamentOptions(request, tournamentId)
        if (!updatedTournament) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(updatedTournament)
      }
    })

    fastify.post('/tournaments/:tournamentId/alias', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:tournamentAlias')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentAliasHandler(request, reply) {
        const { tournamentId } = request.params
        const alias = await fastify.tournamentService.createTournamentAlias(request, tournamentId)
        if (alias.error) {
          if (alias.status) {
            return reply.code(alias.status).send({ error: alias.error })
          }
          return reply.code(400).send({ error: 'Failed to create tournament alias' })
        }

        return reply.code(201).send(alias)
      }
    })

    fastify.delete('/tournaments/:tournamentId/alias', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:tournamentAlias')
      },
      onRequest: fastify.authenticate,
      handler: async function deleteTournamentAliasHandler(request, reply) {
        const { tournamentId } = request.params
        const alias = await fastify.tournamentService.deleteTournamentAlias(request, tournamentId)
        if (!alias) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(alias)
      }
    })

    fastify.get('/tournaments/:tournamentId/aliases', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentAliasHandler(request, reply) {
        const { tournamentId } = request.params
        const alias = await fastify.tournamentService.getTournamentAlias(request, tournamentId)
        if (!alias) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(alias)
      }
    })

    fastify.get('/tournaments/:tournamentId/brackets', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentBracketsHandler(request, reply) {
        const { tournamentId } = request.params
        const brackets = await fastify.tournamentService.getTournamentBrackets(request, tournamentId)
        if (!brackets) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(brackets)
      }
    })

    fastify.get('/tournaments/:tournamentId/games', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentGamesHandler(request, reply) {
        const { tournamentId } = request.params
        const games = await fastify.tournamentService.getTournamentGames(request, tournamentId)
        if (!games) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(games)
      }
    })

    fastify.get('/tournaments/:tournamentId/summary', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentSummaryHandler(request, reply) {
        const { tournamentId } = request.params
        const summary = await fastify.tournamentService.getTournamentSummary(request, tournamentId)
        if (!summary) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(summary)
      }
    })

    fastify.get('/tournaments/:tournamentId/available', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getAvailablePlayersHandler(request, reply) {
        const { tournamentId } = request.params
        const availablePlayers = await fastify.tournamentService.getAvailablePlayers(request, tournamentId)
        if (!availablePlayers) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(availablePlayers)
      }
    })

    fastify.get('/tournaments/:tournamentId/chat', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID')
      },
      onRequest: fastify.authenticate,
      handler: async function getTournamentChatHandler(request, reply) {
        const { tournamentId } = request.params
        const chat = await fastify.tournamentService.getTournamentChat(request, tournamentId)
        if (!chat) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(200).send(chat)
      }
    })

    fastify.patch('/tournaments/:tournamentId/ai', {
      schema: {
        params: fastify.getSchema('schema:tournaments:tournamentID'),
        body: fastify.getSchema('schema:tournaments:createTournamentAI')
      },
      onRequest: fastify.authenticate,
      handler: async function createTournamentAIHandler(request, reply) {
        const { tournamentId } = request.params
        const { slotIndex }  = request.body
        const result = await fastify.tournamentService.createTournamentAI(request, tournamentId, slotIndex)
        if (!result) {
          return reply.code(404).send({ error: 'Tournament not found' })
        }
        return reply.code(201).send(result)
      }
    })

  }, {
    name: 'tournamentRoutes',
    dependencies: [ 'tournamentAutoHooks', 'wsBroadcast']
  }
)
