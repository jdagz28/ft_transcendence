'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function userRoutes (fastify, opts) {
    // General user profile
    // username
    // email
    // avatar
    // nickname
    // created
    // change avatar
    fastify.get('/me', {
      schema: {
        response: {
          200: fastify.getSchema('schema:user:userProfile')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function userProfileHandler (request, reply) {
          try {
            const user = await fastify.usersDataSource.getMeById(request.user.id)
            if (!user) {
              return reply.status(404).send({ error: 'User not found' })
            }
            return reply.send(user)
          } catch (err) {
            fastify.log.error(`Error fetching user: ${err.message}`)
            return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
          }
      }
    })
  
    /**
    // User Profile Account Settings / security
    // email, (change email)
    // password, (change password)
    // has_mfa, 
    // last password change, 
    // mfa token (or generate)
    fastify.get('/me/settings', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User Profile
    fastify.get('/:username', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
      }
    })

    // User Friends
    fastify.get('/:username/friends', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // Blocked users
    fastify.get('/:username/blocked', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User game History
    fastify.get('/:username/games', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User Stats
    fastify.get('/:username/stats', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User change password
    fastify.put('/me/settings/changePassword', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User change email
    fastify.put('/me/settings/changeEmail', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User change avatar
    fastify.post('/me/settings/changeAvatar', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User change nickname
    fastify.post('/me/settings/changeNickname', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User generate MFA
    fastify.post('/me/settings/generateMFA', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User disable MFA
    fastify.delete('/me/settings/disableMFA', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })
    
    // User enable MFA
    fastify.put('/me/settings/enableMFA', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User add friend
    fastify.post('/me/addFriend', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User remove friend
    fastify.delete('/me/removeFriend', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User block user
    fastify.post('/me/blockUser', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })

    // User unblock user
    fastify.delete('/me/unblockUser', {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {

      }
    })
    */
  }, {
    name: 'userRoutes',
    dependencies: [ 'userAutoHooks']
  }
)
