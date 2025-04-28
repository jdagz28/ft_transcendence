'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async getMe(username) {
      try {
        console.log('Getting all data for: ', username)
        const response = await axios.get(`http://database:1919/profile/${username}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err 
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
