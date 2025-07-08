'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
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

  fastify.decorate('usersDataSource', {
    async getMeById(request, id) {
      console.log('Getting all data for: ', id) //! DELETE
      const { data } = await dbApi.get('/users/me', 
        { 
          params: { id } ,
          headers: internalHeaders(request),
        }
      )
      return data
    },

    async getUserByUsername(request, username) {
      console.log('Getting all data for: ', username) //! DELETE
      const { data } = await dbApi.get(`/users/${encodeURIComponent(username)}`,
        { headers: internalHeaders(request) },
      )
      return data
    },

    async createAvatar(request, form) {
      const { data } = await dbApi.put('/users/me/avatar', form,
        { headers: {
            ...internalHeaders(request),
            ...(form.getHeaders?.() || {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      )
      console.log('Avatar uploaded successfully:', data) //! DELETE
      return data
    },

    async addFriend(request) {
      const username = request.user.username
      const friend = request.params.username
      const { data } = await dbApi.put(`/users/${username}/friends`,
        { friend }, 
        { headers: internalHeaders(request) }
      )
      console.log('Friend added successfully:', data) //! DELETE
      return data
    },

    async removeFriend(request) {
      const username = request.user.username
      const friend = request.body.friend
      const { data } = await dbApi.delete(`/users/${username}/friends`, 
        { friend }, 
        { headers: internalHeaders(request) }
      )
      console.log('Friend removed successfully:', data) //! DELETE
      return data
    },

    async respondFriendRequest(request) {
        const username = request.user.username
        const { friend, action } = request.body

        if (!['accept', 'decline'].includes(action)) { 
          throw fastify.httpErrors.badRequest('Invalid friend request action')
        }

        const { data } = await dbApi.post(`/users/${encodeURIComponent(username)}/friendrequests`, 
          { friend, action },
          { headers: internalHeaders(request) },
        )
        console.log('Friend request responded successfully:', data) //! DELETE
        return data
    },

    async getFriends(request, username) {
      const data = await dbApi.get(`/users/${encodeURIComponent(username)}/friends`,
        { headers: internalHeaders(request) },
      )
      console.log('Friends retrieved successfully:', data) //! DELETE
      return data
    },

    async getUserById(request, userId) {
      const { data } = await dbApi.get(`/users/search/id/${encodeURIComponent(userId)}`,
        { headers: internalHeaders(request) },
      )
      console.log('User retrieved successfully:', data) //! DELETE
      return data
    },

    async getMatchHistory(request, userId) {
      const { data } = await dbApi.get(`/users/${encodeURIComponent(userId)}/matches`,
        { headers: internalHeaders(request) },
      )
      console.log('Match history retrieved successfully:', data) //! DELETE
      return data
    }

  })
}, {
  name: 'userAutoHooks'
})
