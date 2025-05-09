'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

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
    fastify.get('/users/me', {
      schema: {
        response: {
          200: fastify.getSchema('schema:users:userProfile')
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
  
    fastify.put('/users/me/settings/avatar', {
      schema: {
        consumes: ['multipart/form-data']
      },
      onRequest: [fastify.authenticate],
      handler: async function avatarHandler (request, reply) {
        fastify.log.info({ body: request.body }, 'multipart body debug')

        try {
          const userId = Number(request.user.id)
          if (!userId) {
            return reply.status(400).send({ error: 'UserMgmt: Invalid user ID' })
          }
          const avatarFile = request.body.avatar
          if (!avatarFile) {
            return reply.status(400).send({ error: 'UserMgmt: No avatar file provided' })
          }
          const avatarBuf = await avatarFile.toBuffer()

          const FormData = require('form-data')
          const form = new FormData()
          form.append('userId', userId)
          form.append('avatar', avatarBuf, {
            filename: avatarFile.filename,
            contentType: avatarFile.mimetype
          })
          console.log('Form data:', form)

          await fastify.usersDataSource.createAvatar(form)
          reply.send({ success: true })
        } catch (err) {
          reply.status(500).send({ error: 'UserMgmt: Failed to update avatar' })
        }
      }
    })


    // User change password
    fastify.put('/me/settings/changePassword', {
      schema: {
        body: fastify.getSchema('schema:users:changePassword')
      },
      onRequest: [fastify.authenticate],
      handler: async function changePassword (request, reply) {
        try {
          const userId = request.user.id
          const { newPassword } = request.body

          const response = await axios.put(`http://database:${process.env.AUTH_PORT}/auth/${userId}/changePassword`, { userId, newPassword })
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to change password' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error changing password: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })

    /*
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
  */

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
