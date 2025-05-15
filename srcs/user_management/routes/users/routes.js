'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports.prefixOverride = ''
module.exports = fp(
  async function userRoutes (fastify, opts) {

    fastify.get('/users/me', {
      schema: {
        response: {
          200: fastify.getSchema('schema:users:userProfile')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function userProfileHandler (request, reply) {
        try {
          const user = await fastify.usersDataSource.getMeById(request, request.user.id)
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

          await fastify.usersDataSource.createAvatar(request, form)
          reply.send({ success: true })
        } catch (err) {
          reply.status(500).send({ error: 'UserMgmt: Failed to update avatar' })
        }
      }
    })

    fastify.get('/users/:userId/avatar', {
      onRequest: [fastify.authenticate],
      handler: async function avatarHandler (request, reply) {
        try {
          const userId = request.params.userId
          fastify.log.info(`Fetching avatar for user ID: ${userId}`)
          const response = await axios.get(`${request.protocol}://database:${process.env.DB_PORT}/users/${userId}/avatar`, {
            responseType: 'arraybuffer'
          })
          if (response.status !== 200) {
            return reply.status(404).send({ error: 'UserMgmt: Avatar not found' })
          }
          reply.type(response.headers['content-type'])
          return reply.send(response.data)
        } catch (err) {
          fastify.log.error(`Error fetching avatar: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })

    fastify.put('/users/me/settings/changePassword', {
      schema: {
        body: fastify.getSchema('schema:users:changePassword')
      },
      onRequest: [fastify.authenticate],
      handler: async function changePassword (request, reply) {
        try {
          const userId = request.user.id
          const { newPassword } = request.body
          const rawAuth = request.headers.authorization

          const response = await axios.put(`${request.protocol}://authentication:${process.env.AUTH_PORT}/auth/${userId}/changePassword`, 
            { newPassword },
            {
              headers: {
                Authorization: rawAuth,                
                'x-internal-key': process.env.INTERNAL_KEY
              }
          })
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

    
    fastify.put('/users/me/settings/changeEmail', {
      schema: {
        body: fastify.getSchema('schema:users:changeEmail')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeEmail(request, reply) {
        try {
          const userId = request.user.id
          const { newEmail } = request.body
          const rawAuth = request.headers.authorization

          const response = await axios.put(`${request.protocol}://database:${process.env.DB_PORT}/users/${userId}/updateDetails`,
            { field: 'email', value: newEmail },
            {
              headers: {
                Authorization: rawAuth,
                'x-internal-key': process.env.INTERNAL_KEY
              }
            })
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to change email' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error changing email: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })

    fastify.put('/users/me/settings/changeUsername', {
      schema: {
        body: fastify.getSchema('schema:users:changeUsername')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeUsername(request, reply) {
        try {
          const userId = request.user.id
          const { newUsername } = request.body
          const rawAuth = request.headers.authorization

          const response = await axios.put(`${request.protocol}://database:${process.env.DB_PORT}/users/${userId}/updateDetails`,
            { field: 'username', value: newUsername },
            {
              headers: {
                Authorization: rawAuth,
                'x-internal-key': process.env.INTERNAL_KEY
              }
            })
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to change username' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error changing username: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }

      }
    })

    fastify.put('/users/me/settings/changeNickname', {
      schema: {
        body: fastify.getSchema('schema:users:changeNickname')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeNickname(request, reply) {
        try {
          const userId = request.user.id
          const { newNickname } = request.body
          const rawAuth = request.headers.authorization

          const response = await axios.put(`${request.protocol}://database:${process.env.DB_PORT}/users/${userId}/updateDetails`,
            { field: 'nickname', value: newNickname },
            {
              headers: {
                Authorization: rawAuth,
                'x-internal-key': process.env.INTERNAL_KEY
              }
            })
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to change nickname' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error changing nickname: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }

      }
    })

    fastify.get('/users/:username', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        response: {
          200: fastify.getSchema('schema:users:userProfile')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function userProfileHandler (request, reply) {
        try {
          const user = await fastify.usersDataSource.getUserByUsername(request, request.params.username)
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

    fastify.put('/users/:username/addFriend', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate],
      handler: async function addFriendHandler (request, reply) {
        try {
          console.log('current user:', request.user.username) //! DELETE
          const response = await fastify.usersDataSource.addFriend(request)
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to add friend' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error adding friend: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })

    fastify.delete('/users/me/friends', {
      schema: {
        body: fastify.getSchema('schema:users:removeFriend')
      },
      onRequest: [fastify.authenticate],
      handler: async function removeFriendHandler (request, reply) {
        try {
          console.log('Removing friend:', request.body) //! DELETE
          const response = await fastify.usersDataSource.removeFriend(request)
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to remove friend' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error removing friend: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }

      }
    })

    fastify.post('/users/me/friends', {
      schema: {
        body: fastify.getSchema('schema:users:respondFriendRequest')
      },
      onRequest: [fastify.authenticate],
      handler: async function addFriendHandler (request, reply) {
        try {
          const response = await fastify.usersDataSource.respondFriendRequest(request)
          if (response.status !== 200) {
            return reply.status(500).send({ error: 'UserMgmt: Failed to add friend' })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error adding friend: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })

    fastify.get('/users/me/friends', {
      schema: {
        response: {
          200: fastify.getSchema('schema:users:userFriends')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function getMeFriendsHandler (request, reply) {
        try {
          const username = request.user.username
          const friends = await fastify.usersDataSource.getFriends(request, username)
          if (!friends) {
            return reply.status(404).send({ error: 'UserMgmt: No friends found' })
          }
          return reply.send(friends)
        } catch (err) {
          fastify.log.error(`Error fetching friends: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }
      }
    })


    fastify.get('/users/:username/friends', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        response: {
          200: fastify.getSchema('schema:users:userFriends')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function getFriendsHandler (request, reply) {
        try {
          const username = request.params.username
          const friends = await fastify.usersDataSource.getFriends(request, username)
          if (!friends) {
            return reply.status(404).send({ error: 'UserMgmt: No friends found' })
          }
          return reply.send(friends)
        } catch (err) {
          fastify.log.error(`Error fetching friends: ${err.message}`)
          return reply.status(500).send({ error: 'UserMgmt: Internal Server Error' })
        }

      }
    })


    /*
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

/*
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

    
    */
  }, {
    name: 'userRoutes',
    dependencies: [ 'userAutoHooks']
  }
)
