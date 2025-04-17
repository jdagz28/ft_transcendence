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
  }),


  fastify.decorate('remoteAuth42', {
    async auth(code) {
      try {
        const response = await axios.post('http://api.intra.42.fr/oauth/token', null, {
          params: {
            grant_type: 'authorization_code',
            client_id: process.env.CLIENT_UID_42,
            client_secret: process.env.CLIENT_SECRET_42,
            redirect_uri: process.env.CLIENT_REDIRECT_URI_42,
            code: code
          }
        })
        return response
      } catch (err) {
        fastify.log.error(`auth42 error: ${err.message}`)
        throw new Error('Authorization failed')
      }
    },

    async getUser(accessToken) {
      try {
        const response = await axios.get('https://api.intra.42.fr/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
        return response.data
      }
      catch (err) {
        fastify.log.error(`getUser error: ${err.message}`)
        throw new Error('Failed to get user data')
      }
    }

  })
}, {
  name: 'userAutoHooks'
})
