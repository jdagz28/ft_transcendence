'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.get('/users/:username', {
      schema: {
        params: fastify.getSchema('schema:users:getUser')
      },
      response: { 200: fastify.getSchema('schema:users:user')},
      handler: async function getUser (request, reply) {
        try {
          const { username } = request.params;
          console.log('Looking for:', username) //! DELETE
          let user = await fastify.dbUsers.getUserByUsername(username)
          if (!user) {
            console.log ('User not found by username, trying email')
            user = await fastify.dbUsers.getUserByEmail(username)
            if (!user){
              fastify.log.error('User not found')
              reply.code(404);
              return { error: 'User not found' }
            }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving user: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error' }
        }          
      }
    }),

    fastify.post('/users', {
      schema: {
        body: fastify.getSchema('schema:users:createUser'),
      },
      handler: async function createUser (request, reply) {
        try {
          const newUserId = await fastify.dbUsers.createUser(request.body)
          console.log('User created with ID:', newUserId) //! DELETE
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          fastify.log.error(`Error creating user: ${err.message}`)
          reply.code(500).send({ error: 'User creation failed' })
        }
      }
    })

    fastify.get('/users/me', {
      schema: { 
        querystring: fastify.getSchema('schema:users:getProfile')
      },
      response: { 
        200: fastify.getSchema('schema:users:userProfile')
      },
      handler: async function getUserProfile(request, reply) {
        try {
          const userId = request.query.id
          const userProfile = await fastify.dbUsers.getUserProfile(userId)
          if (!userProfile) {
            reply.code(404).send({ error: 'User profile not found' })
          } else {
            const baseURL = request.protocol + '://' + request.hostname + process.env.DB_PORT
            const url =  baseURL + userProfile.avatar.url
            userProfile.avatar.url = url
            reply.send(userProfile)
          }
        } catch (err) {
          fastify.log.error(`Error retrieving user profile: ${err.message}`)
          reply.code(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/users/:userId/avatar', {
      schema: {
        params: fastify.getSchema('schema:users:avatar'),
      },
      handler: async function getAvatar (request, reply) {
        try {
          const { userId } = request.params
          const query = fastify.db.prepare(`
            SELECT avatar, mime_type FROM user_avatars WHERE user_id = ?
          `)
          const row = query.get(userId)
          let avatarBuffer = row?.avatar
          let mimeType = row?.mime_type
          
          if (!avatarBuffer && fastify.defaultAssets.defaultAvatar) {
            avatarBuffer = fastify.defaultAssets.defaultAvatar
            mimeType     = fastify.defaultAssets.defaultAvatarMime
          }
      
          if (!avatarBuffer && !mimeType) {
            reply.code(404).send('Avatar not found')
            return
          }
      
          reply
            .header('Content-Type', type.mime)
            .header('Cache-Control', 'public, max-age=3600')
            .send(avatarBuffer)
        } catch (err) { 
          fastify.log.error(`Error serving avatar for user ${request.params.userId}: ${err.message}`)
          reply.code(500).send('Internal servera error')
        }
      }
    })

    fastify.put('/user/me/avatar', {
      schema: {
        consumes: ['multipart/form-data'],
        body: fastify.getSchema('schema:users:uploadAvatar')
      },
      handler: async function avatarHandler (request, reply) {
        try {
          const parts = await request.multipart()
          const buffer = await parts.file.avatar.toBuffer()
          const userId = Number(parts.fields.userId.value)
          await fastify.dbUsers.createAvatar(userId, buffer)
          reply.send({ success: true })
        } catch (err) {
          reply.status(500).send({ error: 'Failed to update avatar' })
        }
      }
    })
      

  }, {
    name: 'user',
    dependencies: [ 'userAutoHooks', 'database']
})

