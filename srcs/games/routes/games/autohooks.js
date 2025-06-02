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
    }
  })
}, {
  name: 'gameAutoHooks'
  
})