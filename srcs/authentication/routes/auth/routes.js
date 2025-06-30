'use strict'

const fp = require('fastify-plugin')
const bcrypt = require('bcrypt')
const axios = require('axios')
const speakeasy = require('speakeasy')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/auth/register', {
      schema: {
        body: fastify.getSchema('schema:auth:register')
      },
      handler: async function register (request, reply) {        
        try {
          const existingUser = await fastify.usersDataSource.readUser(request.body.username)
          if (existingUser) {
            const err = new Error('Username already exists')
            err.statusCode = 409
            throw err
          }

          const emailExists = await fastify.usersDataSource.readUser(request.body.email)
          if (emailExists) {
            const err = new Error('Email already exists')
            err.statusCode = 409
            throw err
          }
        
          const { hash, salt } = await fastify.generateHash(request.body.password)

          const newUserId = await fastify.usersDataSource.createUser({
            username: request.body.username,
            password: hash,
            salt,
            email: request.body.email,
          })
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          console.error('Failed to create user:', err) //! DELETE
          const status = err.statusCode || 500;
          reply.status(status).send({ error: err.message });
        }
      }
    })

    fastify.post('/auth/authenticate', {
      schema: {
        body: fastify.getSchema('schema:auth:login'),
        response: {
          200:  {
            oneOf: [
              fastify.getSchema('schema:auth:token'),
              fastify.getSchema('schema:auth:mfaRequired')    
            ]
          }
        }
      },
      handler: async function authenticateHandler(request, reply) {

        const user = await this.usersDataSource.readUser(request.body.username)
        if (!user) {
          const err = new Error('User do not exist')
          err.statusCode = 401
          throw err
        }

        const passWordMatch  = await bcrypt.compare(request.body.password, user.password)
        if (!passWordMatch) {
          const err = new Error('Invalid password')
          err.statusCode = 401
          throw err
        }

        const userId = user.id
        const checkMfa = await axios.get(`http://database:${process.env.DB_PORT}/users/${userId}/mfa`, {
            headers: { 'x-internal-key': process.env.INTERNAL_KEY }
        })

        const { mfa_enabled } = checkMfa.data
        if (mfa_enabled) {
           return reply.code(200).send({
            mfaRequired: true,
            userId: userId
           })
        }

        request.user = {
          id: user.id,
          username: user.username,
        }
        return refreshHandler(request, reply)
      }
    })

    fastify.post('/auth/logout', {
      onRequest: fastify.authenticate,
      handler: async function logoutHandler (request, reply) {
        request.revokeToken()
        reply.code(204)
      }
    })

    fastify.post('/auth/refresh', {
      onRequest: fastify.authenticate,
      schema: {
        headers: fastify.getSchema('schema:auth:token-header'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: refreshHandler
    })

    async function refreshHandler(request, reply) {
      const token = await request.generateToken()
      return { token }
    }

    async function OAuthRedirect(reply, token, username, provider) {
      const front = process.env.FRONTEND_BASE;
      const dest = `${front}/#/main?${new URLSearchParams({
                 token, user: username, provider }).toString()}`;
      console.log('Redirecting to:', dest); //! DELETE
      return reply.redirect(dest);
    }

    fastify.get('/auth/42', {
      handler: async function handler42 (request, reply) {
        const authorizeURL = 'https://api.intra.42.fr/oauth/authorize'
        const params = new URLSearchParams({
          client_id: process.env.CLIENT_UID_42,
          redirect_uri: process.env.CLIENT_REDIRECT_URI_42,
          response_type: 'code',
        })
        reply.redirect(`${authorizeURL}?${params.toString()}`)
      }
    })

    fastify.get('/auth/42/callback', {
      schema: {
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: async function handler42Callback (request, reply) {
        const code = request.query.code
        if (!code) {
          const err = new Error('No code provided')
          err.statusCode = 400
          throw err
        }

        try {
          const tokenResponse = await fastify.remoteAuth42.auth(code)
          if (!tokenResponse) {
            const err = new Error('Failed to authenticate with 42')
            err.statusCode = 401
            throw err
          }

          const accessToken = tokenResponse.data.access_token
          const userResponse = await fastify.remoteAuth42.getUser(accessToken)
          if (!userResponse) {
            const err = new Error('Failed to get user data from 42')
            err.statusCode = 401
            throw err
          }

          const { login: username, email } = userResponse
          const existingUser = await fastify.usersDataSource.OAuthReadUser(username)
          const existingEmail = await fastify.usersDataSource.OAuthReadUser(email)
          if (existingUser || existingEmail) {
            console.log(`User ${username} or email ${email} already exists`) //! DELETE
            if (existingUser) {
              request.user = {
                id: existingUser.id,
                username: existingUser.username,
              }
            } else {
              request.user = {
                id: existingEmail.id,
                username: existingEmail.username,
              }
            }
            const token = await request.generateToken();
            return OAuthRedirect(reply, token, username, "42");
          }
          
          //! TEMPORARY PASSWORD
          const { hash, salt } = await fastify.generateHash(process.env.REMOTE_TEMP_PASSWORD) 
          const newUserId = await fastify.usersDataSource.OAuthCreateUser({
            username,
            password: hash,
            salt,
            email,
            provider: '42'
          })
          if (!newUserId) {
            const err = new Error('Failed to create user')
            err.statusCode = 500
            throw err
          }
          request.user = { id: newUserId, username };
          const token = await request.generateToken();
          return OAuthRedirect(reply, token, username, "42");
        } catch (err) {
        console.error('Error during 42 authentication:', err) //! DELETE
        reply.status(err.statusCode || 500).send({ error: err.message })
        }
      }
    }),

    fastify.get('/auth/google', {
      handler: async function handlerGoogle (request, reply) {
        const authorizeURL = 'https://accounts.google.com/o/oauth2/v2/auth'
        const params = new URLSearchParams({
          client_id: process.env.CLIENT_ID_GOOGLE,
          redirect_uri: process.env.CLIENT_REDIRECT_URI_GOOGLE,
          response_type: 'code',
          scope: 'email profile',
          access_type: 'offline',
          prompt: 'consent'
        })
        reply.redirect(`${authorizeURL}?${params}`)
      }
    })

    fastify.get('/auth/google/callback', {
      schema: {
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: async function handlerGoogleCallback (request, reply) {
        console.log('Google callback received') //! DELETE
        const code = request.query.code
        if (!code) {
          const err = new Error('No code provided')
          err.statusCode = 400
          throw err
        }

        try {
          const tokenResponse = await fastify.remoteAuthGoogle.auth(code)
          if (!tokenResponse) {
            const err = new Error('Failed to authenticate with Google')
            err.statusCode = 401
            throw err
          }

          const accessToken = tokenResponse.data.access_token
          const userResponse = await fastify.remoteAuthGoogle.getUser(accessToken)
          if (!userResponse) {
            const err = new Error('Failed to get user data from Google')
            err.statusCode = 401
            throw err
          }

          const { email } = userResponse
          const username = email.split('@')[0]
          const existingUser = await fastify.usersDataSource.OAuthReadUser(username)
          const existingEmail = await fastify.usersDataSource.OAuthReadUser(email)
          if (existingUser || existingEmail) {
            console.log(`User ${username} or email ${email} already exists`) //! DELETE
            if (existingUser) {
              request.user = {
                id: existingUser.id,
                username: existingUser.username,
              }
            } else {
              request.user = {
                id: existingEmail.id,
                username: existingEmail.username,
              }
            }
            const token = await request.generateToken();
            return OAuthRedirect(reply, token, username, "Google");
          }
          
          //! TEMPORARY PASSWORD
          const { hash, salt } = await fastify.generateHash(process.env.REMOTE_TEMP_PASSWORD)
          const newUserId = await fastify.usersDataSource.OAuthCreateUser({
            username,
            password: hash,
            salt,
            email,
            provider: 'Google'
          })
          if (!newUserId) {
            const err = new Error('Failed to create user')
            err.statusCode = 500
            throw err
          }

          request.user = { id: newUserId, username };
          const token = await request.generateToken();
          return OAuthRedirect(reply, token, username, "Google");
        } catch (err) {
        console.error('Error during Google authentication:', err) //! DELETE
        reply.status(err.statusCode || 500).send({ error: err.message })
        }
      }
    })

    fastify.get('/auth/verify', {
      schema: fastify.getSchema('schema:auth:verify'),
      response: {
        200: fastify.getSchema('schema:auth:verify-response')
      },
      handler: async function tokenVerificationHandler(request) {
        try {
          const cleanToken =  request.query.token.replace(/^"|"$/g, '')
          console.log('Verifying token:', cleanToken)   //! DELETE
          const user = await fastify.jwt.verify(cleanToken)
          console.log('Token verified, user:', user) //! DELETE
          return { valid: true, user }
        } catch (err) {
          return { valid: false, user: null }
        }
      }
    })

    fastify.put('/auth/:userId/changePassword', {
      schema: {
        body: fastify.getSchema('schema:auth:changePassword'),
      },
      onRequest: [fastify.authenticate], 
      handler: async function changePasswordHandler(request, reply) {
        const { newPassword } = request.body
        const userId = request.params.userId
        const rawAuth = request.headers.authorization

        try {
          const { salt, hash } = await fastify.generateHash(newPassword)
          console.log ('Generated hash and salt:', { hash, salt }) //! DELETE
          const response = await axios.put(`http://database:${process.env.DB_PORT}/users/${userId}/password`, { 
            password: hash,
            salt: salt
          },{
            headers: {
              Authorization: rawAuth,                
              'x-internal-key': process.env.INTERNAL_KEY
            }
          })
        } catch (err) {
          fastify.log.error(`Auth: password change failed for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to change password' })
        }
      }
    })

    fastify.post('/auth/:userId/mfa/generate', {
      onRequest: [fastify.authenticate],
      handler: async function generateMFAsecret(request, reply) {
        const userId = request.user.id
        const username = request.user.username
        try {
          const secret = speakeasy.generateSecret({
            name: `ft_transcendence (${username})`
          })
          await fastify.usersDataSource.setMfaSecret(userId, secret.base32, request);
          const QRCode = await fastify.generateQRCode(secret)
          if (!QRCode) {
            throw new Error('Failed to generate QR code')
          }
          return reply.send({
            otpauth_url: secret.otpauth_url,
            qr_code: QRCode
          })
        } catch (err) {
          fastify.log.error(`Auth: failed to generate mfa token for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to enable mfa' })
        }
      }
    })

    fastify.put('/auth/:userId/mfa/disable', {
      onRequest: [ fastify.authenticate ],
      handler: async function disableMFAhandler(request, reply) {
        const userId = request.user.id
        try {
          await fastify.usersDataSource.disableMfa(userId, request);
          return reply.send({ success: true, message: 'MFA disabled successfully' })
        } catch (err) {
          fastify.log.error(`Auth: failed to disable mfa for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to disable mfa' })
        }
      }
    })
    
    fastify.put('/auth/:userId/mfa/enable', {
      onRequest: fastify.authenticate, 
      handler: async function enableMFAhandler(request, reply) {
        const userId = request.user.id
        try {
          await fastify.usersDataSource.enableMfa(userId, request);
          return reply.send({ success: true, message: 'MFA enabled successfully' })
        } catch (err) {
          fastify.log.error(`Auth: failed to enable mfa for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to enable mfa' })
        }
      }
    })
    
    fastify.post('/auth/:userId/mfa/verify', {
      schema: {
        body: fastify.getSchema('schema:auth:mfaVerify')
      },
      handler: async function verifyMFAhandler(request, reply) {
        const { userId } = request.params
        const { token } = request.body
        try {
          const response = await axios.get(`http://database:${process.env.DB_PORT}/users/${userId}/mfa`, {
            headers: { 'x-internal-key': process.env.INTERNAL_KEY }
          })
          const { mfa_secret, mfa_enabled } = response.data
          if (!mfa_enabled) {
            return reply.status(403).send({ error: 'MFA is not enabled for this user' })
          }
          const isValid = speakeasy.totp.verify({
            secret: mfa_secret,
            encoding: 'base32',
            token,
            window: 1
          })
          if (!isValid) {
            return reply.status(401).send({ error: 'Invalid MFA token' })
          }
          
          const user = await this.usersDataSource.readUserById(userId)
          if (!user) {
            const err = new Error('User do not exist')
            err.statusCode = 401
            throw err
          }

          request.user = {
            id: user.id,
            username: user.username,
          }
          return refreshHandler(request, reply)
        } catch (err) {
          fastify.log.error(`Auth: failed to verify mfa for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to verify mfa' })
        }
      }
    })
    

  }, {
    name: 'auth-routes',
    dependencies: [ 'authAutoHooks']
})
