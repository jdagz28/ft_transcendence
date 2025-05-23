const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('gameService', {
    async createGame(request, mode, maxPlayers) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        } 
        const userId = request.user.id
       
        console.log ('Creating game with userId:', userId, 'and mode:', mode, 'and max players:', maxPlayers) //! DELETE
        const response = await axios.post(`${request.protocol}://database:${process.env.DB_PORT}/games`, {
          userId, mode, maxPlayers}, 
          { headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
        }})
        console.log('Game created:', response.data)
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async getGames(request) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        } 
        const response = await axios.get(`${request.protocol}://database:${process.env.DB_PORT}/games`, {
          headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
        }})
        console.log('Games retrieved:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async getGameById(request, gameId) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        } 
        const response = await axios.get(`${request.protocol}://database:${process.env.DB_PORT}/games/${gameId}`, {
          headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
        }})
        console.log('Game retrieved:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async joinGame(request, gameId, userId) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        } 
        const response = await axios.patch(`${request.protocol}://database:${process.env.DB_PORT}/games/${gameId}`, {
          userId},
          { headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
        }})
        console.log('Game Data:', response.data) //! DELETE
        return response.data
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Internal Server Error')
      }
    },

    async createTournament(request, name, mode, maxPlayers) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        } 
        const userId = request.user.id
       
        console.log ('Creating tournament with userId:', userId, 'and mode:', mode, 'and max players:', maxPlayers) //! DELETE
        const response = await axios.post(`${request.protocol}://database:${process.env.DB_PORT}/tournaments`, {
          userId, name, mode, maxPlayers}, 
          { headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
        }})
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