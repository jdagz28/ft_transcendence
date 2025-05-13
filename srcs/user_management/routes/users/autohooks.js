'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async getMeById(request, id) {
      try {
        console.log('Getting all data for: ', id) //! DELETE
        const response = await axios.get(`${request.protocol}://database:${process.env.DB_PORT}/users/me`, { params: { id } })
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          fastify.log.error(`User with ID ${id} not found`)
          return null
        }
        throw err 
      }
    },

    async getUserByUsername(request, username) {
      try {
        console.log('Getting all data for: ', username) //! DELETE
        const response = await axios.get(`${request.protocol}://database:${process.env.DB_PORT}` +
                `/users/${encodeURIComponent(username)}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          fastify.log.error(`User with username ${username} not found`)
          return null
        }
        throw err 
      }
    },

    async createAvatar(request, form) {
      try {
        const authHeader = request.headers['authorization'];
        const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
        if (!token) {
          throw new Error('Missing token')
        }

        const response = await axios.put(`${request.protocol}://database:${process.env.DB_PORT}/users/me/avatar`, 
          form,
          { headers: {
            ...form.getHeaders(),
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
           })
        console.log('Avatar uploaded successfully:', response.data) //! DELETE
        return response.data
      } catch (err) {
        console.error('DB service error:', { //! change to fastify.log.error
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });              
        throw err
      }
    },

    async addFriend(request, requester, friend) {
      try {
        const authHeader = request.headers['authorization'];
          const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
          if (!token) {
            throw new Error('Missing token')
          }
        const response = await axios.put(`${request.protocol}://database:${process.env.DB_PORT}/users/${requester}/friends`, 
          { friend },
          { headers: {
            'x-internal-key': process.env.INTERNAL_KEY,
            'Authorization': `Bearer ${token}`,
          }})
        console.log('Friend added successfully:', response.data) //! DELETE
      } catch (err) {
        console.error('DB service error:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });              
        throw err
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
