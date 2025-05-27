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
    async createGame(request, mode, maxPlayers) {
      const userId = request.user.id
      const { data } = await dbApi.post('/games/createGame', 
        { userId, mode, maxPlayers}, 
        { headers: internalHeaders(request) },
      )
      console.log('Game created:', data) //! DELETE
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

    async createTournament(request, name, mode, maxPlayers) {
      const userId = request.user.id
      
      const { data } = await dbApi.post('/games/tournaments/createTournament', 
        { userId, name, mode, maxPlayers },
        { headers: internalHeaders(request) },
      )
      console.log('Tournament created:', data)
      return data
    }
  })
}, {
  name: 'gameAutoHooks'
  
})