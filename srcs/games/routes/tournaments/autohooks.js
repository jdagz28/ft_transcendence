const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function tournamentAutoHooks (fastify, opts) {
  const dbApi = axios.create({
    baseURL: `http://database:${process.env.DB_PORT}`,
    timeout: 2_000
  });

  function bearer (request) {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw fastify.httpErrors.unauthorized('Missing JWT')
    }
    return token;
  }

  function internalHeaders (request) {
    return {
      'x-internal-key': process.env.INTERNAL_KEY,
      Authorization: `Bearer ${bearer(request)}`
    }
  }
  
  fastify.register(schemas)

  fastify.decorate('tournamentService', {
    async createTournament(request) {
      const userId = request.user.id
      const { name, maxPlayers, gameMode, gameType } = request.body
      const { data } = await dbApi.post('/tournaments/createTournament', 
        { userId, name, maxPlayers, gameMode, gameType },
        { headers: internalHeaders(request) },
      )
      console.log('Tournament created:', data)
      return data
    },

    async joinTournament(request, tournamentId, userId) {
      try {
        const { data } = await dbApi.patch(`/tournaments/${tournamentId}/join`, 
          { userId },
          { headers: internalHeaders(request) },
        )
        console.log('Joined tournament:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 409) {
          throw fastify.httpErrors.conflict(error.response.data?.error || 'Tournament conflict')
        }
        throw error
      }
    },

    async inviteUserToTournament(request, tournamentId, userId) {
      try {
        const { data } = await dbApi.post(`/tournaments/${tournamentId}/invite`, 
          { userId },
          { headers: internalHeaders(request) },
        )
        console.log('User invited to tournament:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'Tournament not found')
        }
        if (error.response?.status === 409) {
          throw fastify.httpErrors.conflict(error.response.data?.error || 'User already invited')
        }
        throw error
      }
    },

    async getTournamentInvites(request, userId) {
      try {
        const { data } = await dbApi.get(`/tournaments/invites/${userId}`, 
          { headers: internalHeaders(request) },
        )
        console.log('Tournament invites retrieved:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'No invites found')
        }
        throw error
      }
    },  

    async respondToTournamentInvite(request, tournamentId, response, inviteId) {
      try {
        const { data } = await dbApi.patch(`/tournaments/invites/${inviteId}/response`, 
          { response, tournamentId },
          { headers: internalHeaders(request) },
        )
        console.log('Tournament invite response:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'Tournament not found')
        }
        if (error.response?.status === 409) {
          throw fastify.httpErrors.conflict(error.response.data?.error || 'Invite already responded')
        }
        throw error
      }
    },

    async getTournamentSettings(request, tournamentId) {
      try {
        const { data } = await dbApi.get(`/tournaments/${tournamentId}/settings`, 
          { headers: internalHeaders(request) },
        )
        console.log('Tournament settings retrieved:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'Tournament not found')
        }
        throw error
      }
    },

    async leaveTournament(request, tournamentId, userId) {
      try {
        const { data } = await dbApi.delete(`/tournaments/${tournamentId}/leave`, 
          { data: { userId }, headers: internalHeaders(request) },
        )
        console.log('Left tournament:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'Tournament not found')
        }
        throw error
      }
    },

    async getTournaments(request) {
      const { data } = await dbApi.get('/tournaments/all', 
        { headers: internalHeaders(request) },
      )
      console.log('Tournaments retrieved:', data) //! DELETE
      return data
    },

    async getTournamentById(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament retrieved:', data) //! DELETE
      return data
    },

    async getTournamentPlayers(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/players`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament players retrieved:', data) //! DELETE
      return data
    },


    async deleteTournament(request, tournamentId) {
      const { data } = await dbApi.delete(`/tournaments/${tournamentId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament deleted:', data) //! DELETE
      return data
    },

    async startTournament(request, tournamentId) {
      const { data } = await dbApi.patch(`/tournaments/${tournamentId}/start`, 
        {}, { headers: internalHeaders(request) },
      )
      console.log('Tournament started:', data) //! DELETE
      return data
    },

    async updateTournamentOptions(request, tournamentId) {
      const { num_games, num_matches, 
        ball_speed, death_timed, time_limit } = request.body
      const userId = request.user.id
      const { data } = await dbApi.patch(`/tournaments/${tournamentId}/options`, 
        { userId, num_games, num_matches, ball_speed, death_timed, time_limit },
        { headers: internalHeaders(request) },
      )
      console.log('Tournament options updated:', data) //! DELETE
      return data
    },

    async createTournamentAlias(request, tournamentId) {
      const { alias } = request.body
      const userId = request.user.id
      const { data } = await dbApi.post(`/tournaments/${tournamentId}/alias`, 
        { alias }, { headers: internalHeaders(request) },
      )
      console.log('Tournament alias created:', data) //! DELETE
      return data
    },

    async deleteTournamentAlias(request, tournamentId) {
      const { alias } = request.body
      const userId = request.user.id
      const { data } = await dbApi.delete(`/tournaments/${tournamentId}/alias`, 
        { alias }, { headers: internalHeaders(request) },
      )
      console.log('Tournament alias deleted:', data) //! DELETE
      return data
    },

    async getTournamentAlias(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/alias`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament alias retrieved:', data) //! DELETE
      return data
    },

    async getTournamentBrackets(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/brackets`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament brackets retrieved:', data) //! DELETE
      return data
    },

    async getTournamentGames(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/games`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament games retrieved:', data) //! DELETE
      return data
    },

    async getTournamentSummary(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/summary`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament summary retrieved:', data) //! DELETE
      return data
    },

    async getAvailablePlayers(request, tournamentId) {
      const { data } = await dbApi.get(`/tournaments/${tournamentId}/available`, 
        { headers: internalHeaders(request) },
      )
      console.log('Available players retrieved:', data) //! DELETE
      return data
    }
  })
}, {
  name: 'tournamentAutoHooks'
})