'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async getMeById(id) {
      try {
        console.log('Getting all data for: ', id)
        const response = await axios.get('http://database:1919/me', { params: { id } })
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err 
      }
    },

    async createAvatar(userId, avatar) {
      try {
        const response = await axios.post('http://database:1919/avatars/upload', { userId, avatar })
        console.log('Avatar uploaded successfully:', response.data) //! DELETE
        return response.data
      } catch (err) {
        throw err
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
