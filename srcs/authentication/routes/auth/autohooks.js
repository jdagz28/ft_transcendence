'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')
const qs = require('querystring') 

module.exports = fp(async function authAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async readUser(usernameORemail) {
      try {
        console.log('Looking for:', usernameORemail)
        const response = await axios.get(`http://database:1919/users/search/${usernameORemail}`)
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
    },

    async OAuthCreateUser(user) {
      try {
        const { username, password, salt, email, provider } = user
        const response = await axios.post('http://database:1919/users/oauth', user)
        return response.data.userId
      } catch (err) {
        fastify.log.error(`OAuthCreateUser error: ${err.message}`)
        throw new Error('OAuth user creation failed')
      }
    },

    async OAuthReadUser(usernameORemail) {
      try {
        console.log('Looking for:', usernameORemail)
        const response = await axios.get(`http://database:1919/users/oauth/search/${usernameORemail}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err
      }
    },

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

  }),

  fastify.decorate('remoteAuthGoogle', {
    async auth(code) {
      try {
        const params = {
          code,
          client_id: process.env.CLIENT_ID_GOOGLE,
          client_secret: process.env.CLIENT_SECRET_GOOGLE,
          redirect_uri: process.env.CLIENT_REDIRECT_URI_GOOGLE,
          grant_type: 'authorization_code'
        }

        const response = await axios.post('https://oauth2.googleapis.com/token',
          qs.stringify(params),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
        if (response.status !== 200) {
          throw new Error('Failed to authenticate with Google')
        }
        return response
      } catch (err) {
        fastify.log.error(`authGoogle error: ${err.message}`)
        throw new Error('Authorization failed')
      }
    },

    async getUser(accessToken) {
      try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
        return response.data
      } catch (err) {
        fastify.log.error(`getUser error: ${err.message}`)
        throw new Error('Failed to get user data')
      }
    }
  })
}, {
  name: 'authAutoHooks'
})
