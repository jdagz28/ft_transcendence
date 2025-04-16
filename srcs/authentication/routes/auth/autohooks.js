'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async readUser(usernameORemail) {
      try {
        console.log('Looking for:', usernameORemail)
        const response = await axios.get(`http://database:1919/users/${usernameORemail}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err
      }
    },

    async createUser(user) {
      try {
        const { username, password, salt, email } = user
        const response = await axios.post('http://database:1919/users', user)
        return response.data.userId
      } catch (err) {
        fastify.log.error(`createUser error: ${err.message}`)
        throw new Error('User creation failed')
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
