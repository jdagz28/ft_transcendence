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
      throw new Error('Missing token');
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
      try {
        const userId = request.user.id
       
        console.log ('Creating game with userId:', userId, 'and mode:', mode, 'and max players:', maxPlayers) //! DELETE
        const response = await dbApi.post('/games/createGame', 
          { userId, mode, maxPlayers}, 
          { headers: internalHeaders(request) },
        )
        console.log('Game created:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async getGames(request) {
      try {
        const response = await dbApi.get('/games/all', 
          { headers: internalHeaders(request) },
        )
        console.log('Games retrieved:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async getGameById(request, gameId) {
      try {
        const response = await dbApi.get(`/games/${gameId}`, 
          { headers: internalHeaders(request) },
        )
        console.log('Game retrieved:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async joinGame(request, gameId, userId) {
      try {
        const response = await dbApi.patch(`/games/${gameId}`, 
          { userId },
          { headers: internalHeaders(request) },
        )
        console.log('Game Data:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async createTournament(request, name, mode, maxPlayers) {
      try {
        const userId = request.user.id
       
        console.log ('Creating tournament with userId:', userId, 'and mode:', mode, 'and max players:', maxPlayers) //! DELETE
        const response = await dbApi.post('/games/tournaments/createTournament', 
          { userId, name, mode, maxPlayers },
          { headers: internalHeaders(request) },
        )
        console.log('Tournament created:', response.data)
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    }
  })
}, {
  name: 'gameAutoHooks'
  
})