'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports.prefixOverride = ''
module.exports = fp(
  async function userRoutes (fastify, opts) {
    const dbApi = axios.create({
      baseURL: `http://database:${process.env.DB_PORT}`,
      timeout: 2_000
    });

    const authApi = axios.create({
      baseURL: `http://authentication:${process.env.AUTH_PORT}`,
      timeout: 2_000
    });
  
    const bearer = request => {
      const authHeader = request.headers['authorization'];
      const token = authHeader && authHeader.replace(/^Bearer\s+/i, '');
      if (!token) {
        throw fastify.httpErrors.unauthorized('Missing JWT')
      }
      return token;
    }
  
    const internalHeaders = request => ({
      'x-internal-key': process.env.INTERNAL_KEY,
      Authorization: `Bearer ${bearer(request)}`
    })
    
    fastify.get('/users/me', {
      schema: {
        response: {
          200: fastify.getSchema('schema:users:userProfile')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function userProfileHandler (request, reply) {
        const user = await fastify.usersDataSource.getMeById(request, request.user.id)
        if (!user) {
          return reply.code(404).send({ error: 'User not found' })
        }
        return reply.send(user)
      }
    })
  
    fastify.put('/users/me/settings/avatar', {
      schema: {
        consumes: ['multipart/form-data']
      },
      onRequest: [fastify.authenticate],
      handler: async function avatarHandler (request, reply) {
        const userId = Number(request.user.id)
        if (!userId) {
          return reply.code(400).send({ error: 'UserMgmt: Invalid user ID' })
        }
        const avatarFile = request.body.avatar
        if (!avatarFile) {
          return reply.code(400).send({ error: 'UserMgmt: No avatar file provided' })
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
        return reply.send({ success: true })
      }
    })

    fastify.get('/users/:userId/avatar', {
      // onRequest: [fastify.authenticate],
      handler: async function avatarHandler (request, reply) {
        const userId = request.params.userId
        try {
          const { data, headers } = await dbApi.get(`/users/${encodeURIComponent(userId)}/avatar`, 
          {
            responseType: 'arraybuffer'
            // headers: internalHeaders(request),
          })
          return reply
          .type(headers['content-type'])
          .header('Content-Length', data.length)
          .send(data); 
        } catch (err) {
          if (err.response?.status === 404) {
            return reply.code(404).send({ error: 'UserMgmt: Avatar not found' })
          }
          throw err
        }
      }
    })

    fastify.put('/users/me/settings/changePassword', {
      schema: {
        body: fastify.getSchema('schema:users:changePassword')
      },
      onRequest: [fastify.authenticate],
      handler: async function changePassword (request, reply) {
        const userId = request.user.id
        const { newPassword } = request.body

        await authApi.put(`/auth/${encodeURIComponent(userId)}/changePassword`, 
          { newPassword },
          { headers: internalHeaders(request) },
        )
        return reply.send({ success: true })
      }
    })

    
    fastify.put('/users/me/settings/changeEmail', {
      schema: {
        body: fastify.getSchema('schema:users:changeEmail')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeEmail(request, reply) {
        const userId = request.user.id
        const { newEmail } = request.body

        await dbApi.put(`/users/${encodeURIComponent(userId)}/updateDetails`,
          { field: 'email', value: newEmail },
          { headers: internalHeaders(request) },
        )
        return reply.send({ success: true })
      }
    })

    fastify.put('/users/me/settings/changeUsername', {
      schema: {
        body: fastify.getSchema('schema:users:changeUsername')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeUsername(request, reply) {
        const userId = request.user.id
        const { newUsername } = request.body

        await dbApi.put(`/users/${encodeURIComponent(userId)}/updateDetails`,
          { field: 'username', value: newUsername },
          { headers: internalHeaders(request) },
        )
        return reply.send({ success: true })
      }
    })

    fastify.put('/users/me/settings/changeNickname', {
      schema: {
        body: fastify.getSchema('schema:users:changeNickname')
      },
      onRequest: [fastify.authenticate],
      handler: async function changeNickname(request, reply) {
        const userId = request.user.id
        const { newNickname } = request.body

        await dbApi.put(`/users/${encodeURIComponent(userId)}/updateDetails`,
          { field: 'nickname', value: newNickname },
          { headers: internalHeaders(request) },
        )
        return reply.send({ success: true })
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
        const username = request.params.username
        const user = await fastify.usersDataSource.getUserByUsername(request, username)
        if (!user) {
          return reply.code(404).send({ error: 'User not found' })
        }
        return reply.send(user)
      }
    })

    fastify.put('/users/:username/addFriend', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate],
      handler: async function addFriendHandler (request, reply) {
        await fastify.usersDataSource.addFriend(request)
        return reply.send({ success: true })
      }
    })

    fastify.delete('/users/me/friends', {
      schema: {
        body: fastify.getSchema('schema:users:removeFriend')
      },
      onRequest: [fastify.authenticate],
      handler: async function removeFriendHandler (request, reply) {
        await fastify.usersDataSource.removeFriend(request)
        return reply.send({ success: true })
      }
    })

    fastify.post('/users/me/friends', {
      schema: {
        body: fastify.getSchema('schema:users:respondFriendRequest')
      },
      onRequest: [fastify.authenticate],
      handler: async function addFriendHandler (request, reply) {
        await fastify.usersDataSource.respondFriendRequest(request)
        return reply.send({ success: true })
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
        const username = request.user.username
        const friends = await fastify.usersDataSource.getFriends(request, username)
        if (!friends) {
          return reply.code(404).send({ error: 'UserMgmt: No friends found' })
        }
        return reply.send(friends)
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
        const username = request.params.username
        const friends = await fastify.usersDataSource.getFriends(request, username)
        if (!friends) {
          return reply.code(404).send({ error: 'UserMgmt: No friends found' })
        }
        return reply.send(friends)
      }
    })

    fastify.get('/users/ai', {
      schema: {
        response: {
          200: { type: 'integer' }
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function getAiId (request, reply) {
         return fastify.aiUserId
      }
    })

    fastify.get('/users/id/:userId', {
      schema: {
        params: fastify.getSchema('schema:users:getUserById'),
        response: {
          200: fastify.getSchema('schema:users:userProfile')
        }
      },
      onRequest: [fastify.authenticate],
      handler: async function getUserByIdHandler (request, reply) {
        const user = await fastify.usersDataSource.getUserById(request, request.params.userId)
        if (!user) {
          return reply.code(404).send({ error: 'User not found' })
        }
        return reply.send(user)
      }
    })

    fastify.get('/users/me/matchHistory', {
      onRequest: [fastify.authenticate],
      handler: async function getMatchHistoryHandler (request, reply) {
        const userId = request.user.id
        try {
          const matches = await fastify.usersDataSource.getMatchHistory(request, userId)
          return reply.send(matches)
        } catch (err) {
          fastify.log.error(err)
          throw new Error('Failed to get match history')
        }
      }
    })
    
    fastify.get('/users/:username/matchHistory', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate],
      handler: async function getMatchHistoryByUsernameHandler (request, reply) {
        const userId = request.user.id
        try {
          const matches = await fastify.usersDataSource.getMatchHistory(request, userId)
          return reply.send(matches)
        } catch (err) {
          fastify.log.error(err)
          throw new Error('Failed to get match history')
        }
      }


    })

  }, {
    name: 'userRoutes',
    dependencies: [ 'userAutoHooks']
  }
)
