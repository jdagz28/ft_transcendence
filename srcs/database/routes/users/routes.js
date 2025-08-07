'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    //! Separate email search? 
    fastify.get('/users/search/:username', {
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

    fastify.get('/users/search/id/:userId', {
      response: { 200: fastify.getSchema('schema:users:getUser')},
      handler: async function userId (request, reply) {
        try {
          const { userId } = request.params
          console.log('Looking for user ID:', userId) //! DELETE
          const user = await fastify.dbUsers.getUserById(userId)
          if (!user) {
            fastify.log.error('User not found')
            reply.code(404);
            return { error: 'User not found' }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving user by ID: ${err.message}`)
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

    fastify.post('/users/oauth', {
      schema: {
        body: fastify.getSchema('schema:users:createOAuthUser'),
      },
      handler: async function createOAuthUser (request, reply) {
        try {
          const newUserId = await fastify.dbUsers.OAuthCreateUser(request.body)
          console.log('OAuth User created with ID:', newUserId) //! DELETE
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          fastify.log.error(`Error creating OAuth user: ${err.message}`)
          reply.code(500).send({ error: 'OAuth user creation failed' })
        }
      }
    })

    fastify.get('/users/oauth/search/:username', {
      schema: {
        params: fastify.getSchema('schema:users:getUser')
      },
      response: { 200: fastify.getSchema('schema:users:OAuthGetUser')},
      handler: async function getOAuthUser (request, reply) {
        try {
          const { username } = request.params;
          console.log('Looking for OAuth user:', username) //! DELETE
          const user = await fastify.dbUsers.OAuthReadUser(username)
          if (!user) {
            fastify.log.error('OAuth User not found')
            reply.code(404);
            return { error: 'User not found' }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving OAuth user: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error' }
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
        const userId = Number(request.params.userId)
        console.log('Fetching avatar for user ID:', userId) //! DELETE
        const query = fastify.db.prepare(`
          SELECT avatar, mime_type FROM user_avatars WHERE user_id = ?
        `)
        const row = query.get(userId)
        console.log('Row:', row) //! DELETE
        let avatarBuffer = row?.avatar
        let mimeType = row?.mime_type
        
        if (!avatarBuffer && fastify.defaultAvatar) {
          avatarBuffer = fastify.defaultAvatar;
          mimeType = fastify.defaultAvatarMime;
        }
    
        if (!avatarBuffer && !mimeType) {
          return reply.code(404).send('Avatar not found')
        }
    
        reply
          .type(mimeType)
          .header('Cache-Control', 'public, max-age=3600')
          .send(avatarBuffer);
      }
    })

    fastify.put('/users/me/avatar', {
      schema: {
        consumes: ['multipart/form-data'],
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey], 
      handler: async function avatarHandler (request, reply) {
        try {
          const { avatar } = request.body;
          if (!avatar)
            return reply.badRequest('No avatar file provided');
          const uid = Number(request.user.id)
          if (!uid) 
            return reply.badRequest('Missing user ID');
          const response = await fastify.dbUsers.createAvatar(uid, await avatar.toBuffer());
          if (response.error) {
            if (response.status === 415) {
              return reply.code(response.status).send({ error: response.error })
            }
            return reply.code(400).send({ error: response.error })
          }
          reply.send({ success: true });
        } catch (err) {
          reply.status(500).send({ error: 'Failed to update avatar' })
        }
      }
    })

    fastify.put('/users/:userId/updateDetails', {
      schema: {
        body: fastify.getSchema('schema:users:updateUser'),
      },
      onRequest: [fastify.checkInternalKey],
      handler: async function updateUserDetailsHandler(request, reply) {
        const { userId } = request.params
        const { field, value } = request.body
        

        try {
          const response = await fastify.dbUsers.updateUserDetails(userId, field, value)
          if (response.error) {
            if (response.status === 409) {
              return reply.code(response.status).send({ error: response.error })
            }
            return reply.code(400).send({ error: response.error })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error updating user details: ${err.message}`)
          reply.code(500).send({ error: 'Failed to update user details' })
        }
      }
    })

    fastify.put('/users/:userId/password', {
      schema: {
        body: fastify.getSchema('schema:users:updatePassword'),
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function updatePasswordHandler(request, reply) {
        try {
          await fastify.dbUsers.updatePassword(request.user.id, request.body.password, request.body.salt)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error updating password: ${err.message}`)
          reply.code(500).send({ error: 'Failed to update password' })
        }
      }
    })
      
    fastify.get('/users/:username', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      response: { 200: fastify.getSchema('schema:users:userProfile')},
      handler: async function getUserByUsername (request, reply) {
        try {
          const { username } = request.params
          console.log('Looking for:', username) //! DELETE
          const userId = await fastify.getUserId(username)
          const user = await fastify.dbUsers.getUserProfile(userId)
          if (!user) {
            fastify.log.error('User not found')
            reply.code(404);
            return { error: 'User not found' }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving user by username: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error' }
        }          
      }
    })

    fastify.put('/users/:username/friends', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        body: fastify.getSchema('schema:users:addFriend')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function addFriendHandler(request, reply) {
        try {
          const userId = request.user.id
          const { friend } = request.body
          console.log(request.headers.authorization) //! DELETE
          console.log('User ID:', userId) //! DELETE
          console.log('Adding friend:', friend) //! DELETE  
          await fastify.dbUsers.sendFriendRequest(userId, friend)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error adding friend: ${err.message}`)
          reply.code(500).send({ error: 'Failed to add friend' })
        }
      }
    })

    fastify.delete('/users/:username/friends', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        body: fastify.getSchema('schema:users:removeFriend')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function removeFriendHandler(request, reply) {
        try {
          console.log(request.headers.authorization) //! DELETE
          const userId = request.user.id
          const { friend } = request.body
          console.log('User ID:', userId) //! DELETE
          console.log('Removing friend:', friend) //! DELETE
          await fastify.dbUsers.removeFriend(userId, friend)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error removing friend: ${err.message}`)
          reply.code(500).send({ error: 'Failed to remove friend' })
        }
      }
    })

    fastify.get('/users/:username/friends', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        response: { 200: fastify.getSchema('schema:users:userFriends')},
      },
      handler: async function getFriendsHandler(request, reply) {
        try {
          const { username } = request.params
          const response = await fastify.dbUsers.getUserFriends(username, request)
          fastify.log.info({ response }, 'Response payload'); //! DELETE
          return reply.send(response)
        } catch (err) {
          fastify.log.error(`Error retrieving friends: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve friends' })
        }
      }
    })

    fastify.post('/users/:username/friendrequests', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername'),
        body: fastify.getSchema('schema:users:respondFriendRequest')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function respondFriendRequestHandler(request, reply) {
        try {
          const userId = request.user.id
          const { friend, action } = request.body
          await fastify.dbUsers.respondFriendRequest(userId, friend, action)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error responding to friend request: ${err.message}`)
          reply.code(500).send({ error: 'Failed to respond to friend request' })
        }
      }
    })

    fastify.put('/users/:userId/mfa', {
      schema: {
        body: fastify.getSchema('schema:users:setMfa')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function setMfaSecretHandler(request, reply) {
        try {
          const userId = request.user.id
          const { mfa_secret, mfa_type } = request.body
          await fastify.dbUsers.setMfaSecret(userId, mfa_secret, mfa_type)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error setting MFA secret: ${err.message}`)
          reply.code(500).send({ error: 'Failed to set MFA secret' })
        }
      }
    })
    
    fastify.get('/users/:userId/mfa', {
      onRequest: [fastify.checkInternalKey],
      handler: async function getMfaHandler(request, reply) {
        const { userId } = request.params
        const mfaData = await fastify.dbUsers.getUserMfa(userId)
        return reply.send(mfaData)
      }
    })

    fastify.put('/users/:userId/mfa/disable', {
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function disableMfaHandler(request, reply) {
        try {
          const userId = request.user.id
          console.log('Disabling MFA for user ID:', userId) //! DELETE
          await fastify.dbUsers.disableMfa(userId)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error disabling MFA: ${err.message}`)
          reply.code(500).send({ error: 'Failed to disable MFA' })
        }
      }
    })

    fastify.put('/users/:userId/mfa/enable', {
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function enableMfaHandler(request, reply) {
        const userId = request.user.id
        try {
          await fastify.dbUsers.enableMfa(userId, request);
          return reply.send({ success: true, message: 'MFA enabled successfully' })
        } catch (err) {
          fastify.log.error(`Auth: failed to enable mfa for user ${userId}: ${err.message}`)
          return reply.status(500).send({ error: 'Auth: Failed to enable mfa' })
        }
      }
    })

    fastify.put('/users/:userId/mfa/qr', {
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function setMfaQrCodeHandler(request, reply) {
        const userId = request.user.id
        try {
          const { qr_code } = request.body
          const QRCode = await fastify.dbUsers.setMfaQrCode(userId, qr_code)
          return reply.send({ success: true, qr_code: QRCode })
        } catch (err) {
          fastify.log.error(`Error setting MFA QR code: ${err.message}`)
          reply.code(500).send({ error: 'Failed to set MFA QR code' })
        }
      }
    }
    )

    fastify.get('/users/:userId/mfa/details', {
      onRequest: [fastify.checkInternalKey],
      handler: async function getMfaDetailsHandler(request, reply) {
        try {
          const userId = request.params.userId
          console.log('Fetching MFA details for user ID:', userId) //! DELETE
          const mfaDetails = await fastify.dbUsers.getMfaDetails(userId)
          return reply.send(mfaDetails)
        } catch (err) {
          fastify.log.error(`Error retrieving MFA details: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve MFA details' })
        }
      }
    })

    fastify.patch('/users/:userId/mfa/type', {
      schema: {
        body: fastify.getSchema('schema:users:mfaType'),
        params: fastify.getSchema('schema:users:userId')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function setMfaTypeHandler(request, reply) {
        try {
          const userId = request.user.id
          const { mfa_type } = request.body
          console.log('Setting MFA type for user ID:', userId, 'to', mfa_type) //! DELETE
          await fastify.dbUsers.setMfaType(userId, mfa_type)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error setting MFA type: ${err.message}`)
          reply.code(500).send({ error: 'Failed to set MFA type' })
        }
      }
    })

    fastify.patch('/users/:userId/mfa/token', {
      schema: {
        body: fastify.getSchema('schema:users:mfaToken'),
        params: fastify.getSchema('schema:users:userId')
      },
      onRequest: [fastify.checkInternalKey],
      handler: async function setMfaTokenHandler(request, reply) {
        try {
          const userId = request.params.userId
          const { mfa_token } = request.body
          console.log('Setting MFA token for user ID:', userId, 'to', mfa_token) //! DELETE
          await fastify.dbUsers.setMfaToken(userId, mfa_token)
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error setting MFA token: ${err.message}`)
          reply.code(500).send({ error: 'Failed to set MFA token' })
        }
      }
    })

    fastify.get('/users/:userId/mfa/token', {
      schema: {
        params: fastify.getSchema('schema:users:userId')
      },
      onRequest: [fastify.checkInternalKey],
      handler: async function getMfaTokenHandler (request, reply) {
        const userId = request.params.userId
        try {
          const mfaToken = await fastify.dbUsers.getMfaToken(userId)
          return reply.send(mfaToken)
        } catch (err) {
          fastify.log.error(`Error retrieving MFA token for user ${userId}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve MFA token' })
        }
      }
    })

    fastify.get('/users/:userId/mfa/secret', {
      schema: {
        params: fastify.getSchema('schema:users:userId')
      },
      onRequest: [fastify.checkInternalKey],
      handler: async function getMfaSecretHandler (request, reply) {
        const userId = request.params.userId
        try {
          const mfaSecret = await fastify.dbUsers.getMfaSecret(userId)
          return reply.send(mfaSecret)
        } catch (err) {
          fastify.log.error(`Error retrieving MFA secret for user ${userId}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve MFA secret' })
        }
      }
    }
    )

    fastify.get('/users/:username/matches', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function getMatchHistoryByUsernameHandler (request, reply) {
        const username = request.params.username
        const userId = await fastify.getUserId(username)
        try {
          const matches = await fastify.dbUsers.getMatchHistory(userId)
          return reply.send(matches)
        } catch (err) {
          fastify.log.error(`Error retrieving match history for user ${username}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve match history' })
        }
      }
    })

    fastify.get('/users/:username/friend-requests', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function getFriendRequestsHandler (request, reply) {
        const username = request.params.username
        const userId = await fastify.getUserId(username)
        try {
          const friendRequests = await fastify.dbUsers.getFriendRequests(userId)
          return reply.send(friendRequests)
        } catch (err) {
          fastify.log.error(`Error retrieving friend requests for user ${username}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve friend requests' })
        }
      }
    })

    fastify.get('/users/:userId/remote', {
      schema: {
        params: fastify.getSchema('schema:users:userId')
      },
      onRequest: [fastify.checkInternalKey],
      handler: async function getRemoteUserHandler (request, reply) {
        const userId = request.params.userId
        try {
          const remoteUser = await fastify.dbUsers.getRemoteUser(userId)
          if (remoteUser.error) {
            return reply.code(404).send({ error: remoteUser.error })
          }
          return reply.send(remoteUser)
        } catch (err) {
          fastify.log.error(`Error retrieving remote user for ID ${userId}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to retrieve remote user' })
        }
      }
    })

    fastify.delete('/users/:username', {
      schema: {
        params: fastify.getSchema('schema:users:getUserByUsername')
      },
      onRequest: [fastify.authenticate, fastify.checkInternalKey],
      handler: async function deleteUserHandler (request, reply) {
        try {
          const userId = request.user.id
          console.log('Deleting user with ID:', userId) //! DELETE
          const response = await fastify.dbUsers.deleteUser(userId)
          if (response.error) {
            return reply.code(400).send({ error: response.error })
          }
          return reply.send({ success: true })
        } catch (err) {
          fastify.log.error(`Error deleting user ${username}: ${err.message}`)
          reply.code(500).send({ error: 'Failed to delete user' })
        }
      }
    }
    )

  }, {
    name: 'user',
    dependencies: [ 'userAutoHooks', 'database', 'defaultAssets']
})

