'use strict'

const fp = require('fastify-plugin')
const bcrypt = require('bcrypt')

const generateHash = require('./generate-hash')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/register', {
      schema: {
        body: fastify.getSchema('schema:auth:register')
      },
      handler: async function register (request, reply) {        
        try {
          console.log('Attempting to read user by username:', request.body.username)
          const existingUser = await fastify.usersDataSource.readUser(request.body.username)
          if (existingUser) {
            const err = new Error('Username already exists')
            err.statusCode = 409
            throw err
          }

          console.log('Attempting to read user by email:', request.body.email)
          const emailExists = await fastify.usersDataSource.readUser(request.body.email)
          if (emailExists) {
            const err = new Error('Email already exists')
            err.statusCode = 409
            throw err
          }
        
          const { hash, salt } = await generateHash(request.body.password)
          console.log('Password hashed successfully.')

          const newUserId = await fastify.usersDataSource.createUser({
            username: request.body.username,
            password: hash,
            salt,
            email: request.body.email,
          })
          console.log('User created with ID:', newUserId)
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          console.error('Failed to create user:', err)
          const status = err.statusCode || 500;
          reply.status(status).send({ error: err.message });
        }
      }
    })

    fastify.get('/getUser', {
      schema: {
        querystring: { $ref: 'schema:user:getUser' },
        },
        response: { 
          200: fastify.getSchema('schema:auth:user')
      },
      handler: async function  getUser (request, reply) {
        try {
          const { username, email } = request.query;
          let user;

          if (username) {
            console.log('Reading user by username:', username);
            user = await fastify.usersDataSource.readUser(username);
          } else if (email) {
            console.log('Reading user by email:', email);
            user = await fastify.usersDataSource.readUser(email); 
          }
          if (!user) {
            const err = new Error('User do not exist')
            err.statusCode = 404
            throw err
          }
          return {
            username: user.username,
            password: user.password,
            email: user.email
          }
        } catch (err) {
          console.error('Failed to get user:', err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.post('/authenticate', {
      schema: {
        body: fastify.getSchema('schema:auth:login'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: async function authenticateHandler(request, reply) {
        console.log('Checking user details in database')

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
        console.log('User authenticated successfully')
        console.log('User details:', user)
        // request.user = user
        request.user = {
          id: user.id,
          username: user.username,
        }
        console.log('User ID:', request.user.id)
        console.log('Authenticated User: ' + user)
        return refreshHandler(request, reply)
      }
    })

    fastify.post('/logout', {
      onRequest: fastify.authenticate,
      handler: async function logoutHandler (request, reply) {
        request.revokeToken()
        reply.code(204)
      }
    })

    fastify.post('/refresh', {
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
          const existingUser = await fastify.usersDataSource.readUser(username)
          const existingEmail = await fastify.usersDataSource.readUser(email)
          if (existingUser || existingEmail) {
            console.log(`User ${username} or email ${email} already exists`)
            request.user = username
            return refreshHandler(request, reply)
          }
          
          //! TEMPORARY PASSWORD
          const { hash, salt } = await generateHash(process.env.REMOTE_TEMP_PASSWORD)
          const newUserId = await fastify.usersDataSource.createUser({
            username,
            password: hash,
            salt,
            email
          })
          if (!newUserId) {
            const err = new Error('Failed to create user')
            err.statusCode = 500
            throw err
          }
          console.log('Remote user created with ID:', newUserId)
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
        console.error('Error during 42 authentication:', err)
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
        console.log('Google callback received')
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
          const existingUser = await fastify.usersDataSource.readUser(username)
          const existingEmail = await fastify.usersDataSource.readUser(email)
          if (existingUser || existingEmail) {
            console.log(`User ${username} or email ${email} already exists`)
            request.user = username
            return refreshHandler(request, reply)
          }
          
          //! TEMPORARY PASSWORD
          const { hash, salt } = await generateHash(process.env.REMOTE_TEMP_PASSWORD)
          const newUserId = await fastify.usersDataSource.createUser({
            username,
            password: hash,
            salt,
            email
          })
          if (!newUserId) {
            const err = new Error('Failed to create user')
            err.statusCode = 500
            throw err
          }
          console.log('Remote user created with ID:', newUserId)
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
        console.error('Error during Google authentication:', err)
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
          console.log('Verifying token:', cleanToken)
          const user = await fastify.jwt.verify(cleanToken)
          console.log('Token verified, user:', user)
          return { valid: true, user }
        } catch (err) {
          return { valid: false, user: null }
        }
      }
    })
  }, {
    name: 'auth-routes',
    dependencies: [ 'authAutoHooks' ]
})

