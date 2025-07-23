'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports.prefixOverride = ' '
module.exports = fp(async function applicationAuth(fastify, opts) {
  fastify.post('/chat/join/dm', async (request, reply) => {
    const data = await fastify.authenticate(request, reply);

    if (reply.sent)
      return;

    const userA = data.user.id;
    const { userB } = request.body

    if (typeof userB !== 'number' || !Number.isInteger(userB))
      return reply.status(400).send({ error: 'userA and userB must be integers' });

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/join/dm`, {
        fromUserId: userA,
        toUserId: userB
      })
      reply.send(response.data)
    } catch (err) {
      console.error(`error joining direct message: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.get('/chat/can-join/room/:roomId', async (request, reply) => {
    const data = await fastify.authenticate(request, reply);
    if (reply.sent)
      return;

    const roomId = Number(request.params.roomId)
    const userId = data.user.id;
    if (typeof roomId !== 'number' || roomId <= 0 || !Number.isInteger(roomId)) {
      return reply.status(400).send({error: `Invalid field 'roomId' muste be number`})
    }

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/can-join/room/${roomId}/${userId}`)
      reply.send(response.data)
    } catch (err) {
      console.error(`error checking if user can join group: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.post('/chat/can-join/dm', async (request, reply) => {
    const data = await fastify.authenticate(request, reply);
    if (reply.sent)
      return;
    
    const fromUserId = data.user.id
    const { userId } = request.body
    const intUserId = Number(userId);
    
    if (typeof intUserId !== 'number' || intUserId <= 0 || !Number.isInteger(intUserId)) {
      return reply.status(400).send({error: `Invalid field 'userId' must be number`})
    }

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/can-join/dm`, {
        fromUserId: fromUserId,
        toUserId: intUserId
      })
      reply.send(response.data)
    } catch(err) {
      console.error(`error checking if user can join dm : ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.post('/chat/create/group', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return

    const userId = data.user.id
    const { name, type, is_game } = request.body

    if (typeof type != "string" || !["public", "private"].includes(type))
      return reply.status(400).send({error: "invalid 'type'"})

    if (name !== null && typeof name !== "string")
      return reply.status(400).send({error: "Invalid 'name'"})

    const isGameValue = typeof is_game === "boolean" ? is_game : false;

    try {
      const result = await axios.post(`http://database:${process.env.DB_PORT}/chat/create/group`, {
        userId: userId,
        name: name,
        type: type,
        isGame: isGameValue
      })
      reply.send(result.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }

  }),

  fastify.post('/chat/join/group', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const { groupId } = request.body
    const userId = data.user.id

    if (typeof groupId !== "number")
      return reply.status(400).send({error: "Bad request invalid 'groupId'"})

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/join/group`, {
        userId: userId,
        groupId: groupId
      })
      reply.send(response.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.post('/chat/invite/group', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const { toUserId, groupId } = request.body
    const fromUserId = data.user.id

    if (typeof toUserId !== "number" || typeof groupId !== "number")
      return reply.status(400).send({error: "Bad request 'userId' and 'groupId' should be number"})
    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/invite/group`, {
        fromUserId:fromUserId,
        toUserId: toUserId,
        groupId: groupId
      })
      reply.send(response.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.post('/chat/invite/accept', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id
    const { groupId } = request.body
    if (typeof groupId !== "number")
      return reply.status(400).send({error: "Bad request 'groupId' should be number"})

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/invite/accept`, {
        userId: userId,
        groupId: groupId
      })
      reply.send(response.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.post('/chat/invite/refuse', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id
    const { groupId } = request.body
    if (typeof groupId !== "number")
      return reply.status(400).send({error: "Bad request 'groupId' should be number"})

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/invite/refuse`, {
        userId: userId,
        groupId: groupId
      })
      reply.send(response.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.get('/chat/mychats', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id;

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/mychats/${userId}`)
      reply.send(response.data)
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.get('/chat/group/:id/history', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id;
    const groupId = Number(request.params.id);

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return reply.status(400).send({ error: "Invalid group id" });
    }

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/group/${groupId}/history/${userId}`)
      reply.send(response.data);
    } catch (err) {
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.get('/chat/dm/:id/history', async (request,reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id;
    const chatId = Number(request.params.id);

    if (!Number.isInteger(chatId) || chatId <= 0) {
      return reply.status(400).send({ error: "Invalid chat id" });
    }

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/dm/${chatId}/history/${userId}`)
      reply.send(response.data)
    } catch (err) {
      console.error(`error: ${err.response?.err}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({error: `${err.response?.data?.error || err.message}`})
    }
  }),

  fastify.put('/chat/block-user', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = Number(data.user.id);
    const { blockedUserId } = request.body;
    if (typeof blockedUserId !== 'number' || !Number.isInteger(blockedUserId)) {
      return reply.status(400).send({ error: "Invalid 'blockedUserId'" });
    }

    try {
      const response = await axios.put(`http://database:${process.env.DB_PORT}/chat/block-user`, {
        userId: Number(userId),
        blockedUserId: blockedUserId
      })
      
      if (response.data.success) {
        const blockedUserNotification = {
          type: 'user_blocked',
          blocked_by_user_id: userId,
          blocked_by_username: data.user.username,
          message: `You have been blocked by ${data.user.username}`
        };
        
        const blockedNotificationSent = fastify.sendMessageToUser(blockedUserId, blockedUserNotification);
        console.log(`Block notification sent to blocked user ${blockedUserId}: ${blockedNotificationSent}`);

        const blockerNotification = {
          type: 'user_blocked_by_me',
          blocked_user_id: blockedUserId,
          blocked_username: response.data.blocked_username || 'Unknown',
          message: `You have blocked this user`
        };
        
        const blockerNotificationSent = fastify.sendMessageToUser(userId, blockerNotification);
        console.log(`Block notification sent to blocker ${userId}: ${blockerNotificationSent}`);
      }
      
      reply.send(response.data);
    } catch (err) {
      console.error(`error blocking user: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.put('/chat/unblock-user', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = Number(data.user.id);
    const { blockedUserId } = request.body;
    if (typeof blockedUserId !== 'number' || !Number.isInteger(blockedUserId)) {
      return reply.status(400).send({ error: "Invalid 'blockedUserId'" });
    }

    try {
      const response = await axios.put(`http://database:${process.env.DB_PORT}/chat/unblock-user`, {
        userId: Number(userId),
        blockedUserId: blockedUserId
      })
      
      if (response.data.success) {
        const unblockedUserNotification = {
          type: 'user_unblocked',
          unblocked_by_user_id: userId,
          unblocked_by_username: data.user.username,
          message: `You have been unblocked by ${data.user.username}`
        };
        
        const unblockedNotificationSent = fastify.sendMessageToUser(blockedUserId, unblockedUserNotification);
        console.log(`Unblock notification sent to unblocked user ${blockedUserId}: ${unblockedNotificationSent}`);
        
        const unblockingUserNotification = {
          type: 'user_unblocked_by_me',
          unblocked_user_id: blockedUserId,
          unblocked_username: response.data.unblocked_username || 'Unknown',
          message: `You have unblocked this user`
        };
        
        const unblockingNotificationSent = fastify.sendMessageToUser(userId, unblockingUserNotification);
        console.log(`Unblock notification sent to unblocker ${userId}: ${unblockingNotificationSent}`);
      }
      
      reply.send(response.data);
    } catch (err) {
      console.error(`error unblocking user: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.get('/chat/blocked-users', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id;

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/blocked-users/${userId}`)
      reply.send(response.data)
    } catch (err) {
      console.error(`error fetching blocked users: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.get('/chat/isBlocked/:userId', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return;

    const userId = data.user.id;
    const blockedUserId = Number(request.params.userId);

    if (typeof blockedUserId !== 'number' || !Number.isInteger(blockedUserId)) {
      return reply.status(400).send({ error: "Invalid 'blockeduserId'" });
    }

    try {
      const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/isBlocked/${userId}/${blockedUserId}`)
      reply.send(response.data)
    } catch (err) {
      console.error(`error checking if user is blocked: ${err.message}`)
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({ error: `${err.response?.data?.error || err.message}` })
    }
  }),

  fastify.post('/internal/friend-accepted', async (request, reply) => {
    const { requesterId, accepterId, accepterName } = request.body;

    if (!requesterId || !accepterId || !accepterName) {
      return reply.status(400).send({ error: 'Missing required fields: requesterId, accepterId, accepterName' });
    }

    try {
      const notification = {
        type: 'friend_request_accepted',
        accepter_id: accepterId,
        accepter_name: accepterName,
        message: `${accepterName} accepted your friend request`
      };

      const notificationSent = fastify.sendMessageToUser(requesterId, notification);
      console.log(`Friend request accepted notification sent to user ${requesterId}: ${notificationSent}`);

      reply.send({ success: true, notificationSent });
    } catch (err) {
      console.error(`Error sending friend request accepted notification: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to send notification' });
    }
  })
})
