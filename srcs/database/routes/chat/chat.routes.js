'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports.prefixOverride = ''
module.exports = fp(async function chatRoutes(fastify, opts) {

  fastify.post('/chat/join/dm', async (request, reply) => {
    const { fromUserId, toUserId } = request.body;
    try {
      const result = await fastify.dbChat.joinDirectMessage(fromUserId, toUserId);
      reply.send(result);
    } catch (error) {
      console.error('Error joining direct message:', error);
      const statusCode = error.statusCode || 500;
      reply.status(statusCode).send({ error: error.message || 'Internal Server Error' });
    }
  }),

  fastify.get('/chat/can-join/room/:roomId/:userId', async (request, reply) => {
    const roomId = Number(request.params.roomId)
    const userId = Number(request.params.userId)
    try {
      const response = await fastify.dbChat.canJoinGroup(userId, roomId)
      console.log(response)
      reply.send(response)
    } catch (err) {
      console.error(`error checking if user can join group: ${err.message}`)
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({ error: `${err.message}` })
    }
  }),

  fastify.post('/chat/can-join/dm', async (request, reply) => {
    const { fromUserId, toUserId } = request.body
    try {
      const response = await fastify.dbChat.joinDirectMessage(fromUserId, toUserId)
      reply.send(response);
    } catch(err) {
      console.error(`error checking if user can join grouop: ${err.message}`)
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({ error: `${err.message}`})
    }
  }),

  fastify.post('/chat/send/dm', async (request, reply) => {
    const { fromUserId, groupId, message} = request.body
    if (
    typeof fromUserId !== 'number' || !Number.isInteger(fromUserId) ||
    typeof groupId !== 'number' || typeof message !== 'string' || message.trim() === ''
  ) {
    return reply.status(400).send({ error: 'userA and groupId must be integers and message should not be empty' });
  }
    try {
      const response = await fastify.dbChat.sendDirectMessage(fromUserId, groupId, message)
      return reply.send(response)
    } catch (err) {
      console.error(`error joining direct message: ${err.message}`)
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({ error: `${err.message}` })
    }
  }),

  fastify.post('/chat/send/group', async (request, reply) => {
    const {fromUserId, room, message} = request.body

    try {
      const  response = await fastify.dbChat.sendGroupMessage(fromUserId, room, message)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }

  })

  fastify.post('/chat/create/group', async (request, reply) => {
    const { userId, name, type ,isGame} = request.body

    try {
      const response = await fastify.dbChat.createGroup(userId, name, type, isGame)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.post('/chat/createGroupGame', async (request, reply) => {
    const { userId, name, p1, p2, p3, p4, tournamentId } = request.body

    try {
      const response = await fastify.dbChat.createGroupGame(userId, name, p1, p2, p3, p4, tournamentId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  })

  fastify.post('/chat/join/group', async (request, reply) => {
    const { userId, groupId } = request.body

    try {
      const response = await fastify.dbChat.joinGroup(userId, groupId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.post('/chat/invite/group', async (request, reply) => {
    const { fromUserId, toUserId, groupId } = request.body

    try {
      const response = await fastify.dbChat.invitGroup(fromUserId,toUserId,groupId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.post('/chat/invite/accept', async (request, reply) => {
    const { userId, groupId } = request.body

    try {
      const response = await fastify.dbChat.acceptInvite(userId, groupId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.post('/chat/invite/refuse', async (request, reply) => {
    const { userId, groupId } = request.body

    try {
      const response = await fastify.dbChat.refuseInvite(userId, groupId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/mychats/:userId', async (request, reply) => {
    const userId = Number(request.params.userId)

    try {
      const response = await fastify.dbChat.getUserChats(userId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/getGroupGames/:userId', async (request, reply) => {
    const userId = Number(request.params.userId)
    try {
      const response = await fastify.dbChat.getTournamentGroups(userId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/group/:groupId/history/:userId', async (request, reply) => {
    const groupId = Number(request.params.groupId)
    const userId = Number(request.params.userId)

    try {
      const response = await fastify.dbChat.getGroupHistory(groupId, userId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/dm/:chatId/history/:userId', async (request, reply) => {
    const chatId = Number(request.params.chatId)
    const userId = Number(request.params.userId)

    try {
      const response = await fastify.dbChat.getDmHistory(chatId, userId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.put('/chat/block-user', async (request, reply) => {
    const { userId, blockedUserId } = request.body;

    console.log(`blocker user ${typeof userId} blocked user ${typeof blockedUserId}`)
    try {
      const response = await fastify.dbChat.blockUser(userId, blockedUserId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),
  
  fastify.put('/chat/unblock-user', async (request, reply) => {
    const { userId, blockedUserId } = request.body;

    console.log(`unblocker user ${typeof userId} unblocked user ${typeof blockedUserId}`)
    try {
      const response = await fastify.dbChat.unblockUser(userId, blockedUserId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/blocked-users/:userId', async (request, reply) => {
    const userId = Number(request.params.userId)

    try {
      const response = await fastify.dbChat.getBlockedUsers(userId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  }),

  fastify.get('/chat/isBlocked/:userId/:blockedUserId', async (request, reply) => {
    const userId = Number(request.params.userId)
    const blockedUserId = Number(request.params.blockedUserId)

    try {
      const response = await fastify.dbChat.isBlocked(userId, blockedUserId)
      return reply.send(response)
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return reply.status(statusCode).send({error: `${err.message}`})
    }
  })

  }, {
  name: 'chatRoutes',
  dependencies: ['chatAutoHooks']
})
