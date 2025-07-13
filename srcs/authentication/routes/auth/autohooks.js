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
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/search/${usernameORemail}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err
      }
    },

    async readUserById(userId) {
      try {
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/search/id/${userId}`)
        return response.data
      } catch (err) {
        fastify.log.error(`readUserById error: ${err.message}`)
        throw new Error('Failed to read user by ID')
      }
    },

    async createUser(user) {
      try {
        const { username, password, salt, email } = user
        const response = await axios.post(`http://database:${process.env.DB_PORT}/users`, user)
        return response.data.userId
      } catch (err) {
        fastify.log.error(`createUser error: ${err.message}`)
        throw new Error('User creation failed')
      }
    },

    async OAuthCreateUser(user) {
      try {
        const { username, password, salt, email, provider } = user
        const response = await axios.post(`http://database:${process.env.DB_PORT}/users/oauth`, user)
        return response.data.userId
      } catch (err) {
        fastify.log.error(`OAuthCreateUser error: ${err.message}`)
        throw new Error('OAuth user creation failed')
      }
    },

    async OAuthReadUser(usernameORemail) {
      try {
        console.log('Looking for:', usernameORemail)
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/oauth/search/${usernameORemail}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err
      }
    },

    async setMfaSecret(userId, secret, request, mfaType) {
      try {
        const rawAuth = request.headers.authorization
        const response =  axios.put(`http://database:${process.env.DB_PORT}/users/${userId}/mfa`,
          { mfa_secret: secret, mfa_type: mfaType },
          {
            headers: {
              Authorization: rawAuth,                
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        );
        return response.data
      } catch (err) {
        fastify.log.error(`getUser error: ${err.message}`)
        throw new Error('Failed to set mfa')
      }
    },

    async readUserMfa(userId, request) {
      try {
        const rawAuth = request.headers.authorization
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/${userId}/mfa`,
          {
            headers: {
              Authorization: rawAuth,                
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
        return response.data
      } catch (err) {
        fastify.log.error(`readUserMfa error: ${err.message}`)
        throw new Error('Failed to read user MFA')
      }
    },

     async disableMfa(userId, request) {
      try {
        const rawAuth = request.headers.authorization
        await axios.put(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/disable`, {},
          {
            headers: {
              Authorization: rawAuth,                
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
        return ({success: true})
      } catch (err) {
        fastify.log.error(`Disable MFA error: ${err.message}`)
        throw new Error('Failed to disable MFA')
      }
    },

    async enableMfa(userId, request) {
      try {
        const rawAuth = request.headers.authorization
        await axios.put(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/enable`, {},
          {
            headers: {
              Authorization: rawAuth,
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
        return ({ success: true })
      } catch (err) {
        fastify.log.error(`Enable MFA error: ${err.message}`)
        throw new Error('Failed to enable MFA')
      }
    },

    async getMfaDetails(userId, request) {
      try {
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/details`, {
            headers: {
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
        return response.data
      } catch (err) {
        fastify.log.error(`getMfaDetails error: ${err.message}`)
        throw new Error('Failed to get MFA details')
      }
    },

    async setMfaQrCode(userId, qrCode, request) {
      try {
        const rawAuth = request.headers.authorization
        await axios.put(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/qr`,
          { qr_code: qrCode },
          {
            headers: {
              Authorization: rawAuth,
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
      } catch (err) {
        fastify.log.error(`setMfaQrCode error: ${err.message}`)
        throw new Error('Failed to set MFA QR code')
      }
    },

    async setMfaType(userId, mfaType, request) {
      try {
        const rawAuth = request.headers.authorization
        await axios.patch(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/type`,
          { mfa_type: mfaType },
          {
            headers: {
              Authorization: rawAuth,
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
      } catch (err) {
        fastify.log.error(`setMfaType error: ${err.message}`)
        throw new Error('Failed to set MFA type')
      }
    },

    async setMfaToken(userId, mfaToken) {
      try {
        const response = await axios.patch(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/token`,
          { mfa_token: mfaToken },
          {
            headers: {
              'x-internal-key': process.env.INTERNAL_KEY
            }
          }
        )
        return response.data
      } catch (err) {
        fastify.log.error(`setMfaToken error: ${err.message}`)
        throw new Error('Failed to set MFA token')
      }
    },

    async getMfaToken(userId) {
      try {
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/${userId}/mfa/token`, {
          headers: {
            'x-internal-key': process.env.INTERNAL_KEY
          }
        })
        return response.data
      } catch (err) {
        fastify.log.error(`getMfaToken error: ${err.message}`)
        throw new Error('Failed to get MFA token')
      }
    },

    async getUserById(userId, request) {
      try {
        const rawAuth = request.headers.authorization
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/search/id/${userId}`, {
          headers: {
            Authorization: rawAuth,
            'x-internal-key': process.env.INTERNAL_KEY
          }
        })
        return response.data
      } catch (err) {
        fastify.log.error(`getUserById error: ${err.message}`)
        throw new Error('Failed to get user by ID')
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
