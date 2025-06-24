const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function gameAutoHooks (fastify, opts) {
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

  fastify.decorate('gameService', {
    async createGame(request) {
      const userId = request.user.id
      const { mode, maxPlayers, gameType, gameMode } = request.body
      const { data } = await dbApi.post('/games/createGame', 
        { userId, mode, maxPlayers, gameType, gameMode}, 
        { headers: internalHeaders(request) },
      )
      console.log('Game created:', data) //! DELETE
      return data
    },

    async updateGameOptions(request) {
      const { gameId } = request.params
      const { num_games, num_matches, ball_speed, death_timed, time_limit } = request.body
      const userId = request.user.id
      
      const { data } = await dbApi.patch(`/games/${gameId}/options`, 
        { userId, num_games, num_matches, ball_speed, death_timed, time_limit }, 
        { headers: internalHeaders(request) },
      )
      console.log('Game options updated:', data) //! DELETE
      return data
    },

    async getGames(request) {
      const { data } = await dbApi.get('/games/all', 
        { headers: internalHeaders(request) },
      )
      console.log('Games retrieved:', data) //! DELETE
      return data
    },

    async getGameById(request, gameId) {
      const { data } = await dbApi.get(`/games/${gameId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Game retrieved:', data) //! DELETE
      return data
    },

    async joinGame(request, gameId, userId) {
      try {
        const { data } = await dbApi.patch(`/games/${gameId}`, 
          { userId },
          { headers: internalHeaders(request) },
        )
        console.log('Game Data:', data) //! DELETE
        return data
      } catch (error) {
        if (error.respnse?.status === 409) {
          throw fastify.httpErrors.conflict(error.response.data?.error || 'Game conflict')
        }
        throw error
      }  
    },

    async leaveGame(request, gameId, userId) {
      try {
        const { data } = await dbApi.delete(`/games/${gameId}/leave`, 
          { data: { userId }, headers: internalHeaders(request) },
        )
        console.log('Left game:', data) //! DELETE
        return data
      } catch (error) {
        if (error.response?.status === 404) {
          throw fastify.httpErrors.notFound(error.response.data?.error || 'Game not found')
        }
        throw error
      }
    },

    async createTournament(request) {
      const userId = request.user.id
      const { name, maxPlayers, gameMode, gameType } = request.body
      const { data } = await dbApi.post('/games/tournaments/createTournament', 
        { userId, name, maxPlayers, gameMode, gameType },
        { headers: internalHeaders(request) },
      )
      console.log('Tournament created:', data)
      return data
    },

    async joinTournament(request, tournamentId, userId) {
      try {
        const { data } = await dbApi.patch(`/games/tournaments/${tournamentId}/join`, 
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

    async leaveTournament(request, tournamentId, userId) {
      try {
        const { data } = await dbApi.delete(`/games/tournaments/${tournamentId}/leave`, 
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
      const { data } = await dbApi.get('/games/tournaments/all', 
        { headers: internalHeaders(request) },
      )
      console.log('Tournaments retrieved:', data) //! DELETE
      return data
    },

    async getTournamentById(request, tournamentId) {
      const { data } = await dbApi.get(`/games/tournaments/${tournamentId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament retrieved:', data) //! DELETE
      return data
    },

    async getTournamentPlayers(request, tournamentId) {
      const { data } = await dbApi.get(`/games/tournaments/${tournamentId}/players`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament players retrieved:', data) //! DELETE
      return data
    },


    async deleteTournament(request, tournamentId) {
      const { data } = await dbApi.delete(`/games/tournaments/${tournamentId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Tournament deleted:', data) //! DELETE
      return data
    },
    
    async deleteGame(request, gameId) {
      const { data } = await dbApi.delete(`/games/${gameId}`, 
        { headers: internalHeaders(request) },
      )
      console.log('Game deleted:', data) //! DELETE
      return data
    },

    async getGamePlayers(request, gameId) {
      const { data } = await dbApi.get(`/games/${gameId}/players`, 
        { headers: internalHeaders(request) },
      )
      console.log('Game players retrieved:', data) //! DELETE
      return data
    },

    async startGame(request, gameId) {
      const options = request.body
      const { data } = await dbApi.patch(`/games/${gameId}/start`, 
        options, { headers: internalHeaders(request) },
      )
      console.log('Game started:', data) //! DELETE
      return data
    },

    async getGameDetails(request, gameId) {
      const { data } = await dbApi.get(`/games/${gameId}/details`, 
        { headers: internalHeaders(request) },
      )
      console.log('Game details retrieved:', data) //! DELETE
      return data
    },

    async updateGameStatus(request, gameId) {
      const { status, matchId, stats } = request.body
      const userId = request.user.id
      const { data } = await dbApi.patch(`/games/${gameId}/status`, 
        { userId, status, matchId, stats }, 
        { headers: internalHeaders(request) },
      )
      console.log('Game status updated:', data) //! DELETE
      return data
    },

    async getGameSummary(request, gameId) {
      const { data } = await dbApi.get(`/games/${gameId}/summary`, 
        { headers: internalHeaders(request) },
      )
      console.log('Game summary retrieved:', data) //! DELETE
      return data
    },

    async getAllGameHistory(request) {
      const userId = request.user.id
      const { data } = await dbApi.get('/games/history',
        { headers: internalHeaders(request), params: { userId } },
      )
      console.log('All game history retrieved:', data) //! DELETE
      return data
    },

    async startTournament(request, tournamentId) {
      const { data } = await dbApi.patch(`/games/tournaments/${tournamentId}/start`, 
        {}, { headers: internalHeaders(request) },
      )
      console.log('Tournament started:', data) //! DELETE
      return data
    }
    


  })
}, {
  name: 'gameAutoHooks'
  
})