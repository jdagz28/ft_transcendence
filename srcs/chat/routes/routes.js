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
      return reply.status(500).send({ error: `${err.message}` })
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
      return reply.status(500).send({ error: `${err.response.data.error}` })
    }
  }),

  fastify.post('/chat/can-join/dm', async (request, reply) => {
    const data = await fastify.authenticate(request, reply);
    if (reply.sent)
      return;

    const fromUserId = data.user.id
    const { userId } = request.body
    if (typeof userId !== 'number' || userId <= 0 || !Number.isInteger(userId)) {
      return reply.status(400).send({error: `Invalid field 'userId' must be number`})
    }

    try {
      const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/can-join/dm`, {
        fromUserId: fromUserId,
        toUserId: userId
      })
      reply.send(response.data)
    } catch(err) {
      console.error(`error checking if user can join dm : ${err.message}`)
      console.error(`BIG ERROOORR: ${err.response.data.error}`)
      return reply.status(500).send({error: `${err.response.data.error}`})
    }
  }),

  fastify.post('/chat/create/group', async (request, reply) => {
    const data = await fastify.authenticate(request, reply)
    if (reply.sent)
      return

    const userId = data.user.id
    const { name, type } = request.body

    if (typeof type != "string" || !["public", "private"].includes(type))
      return reply.status(500).send({error: "invalid 'type'"})

    if (name !== null && typeof name !== "string")
      return reply.status(500).send({error: "Invalid 'name'"})

    try {
      const result = await axios.post(`http://database:${process.env.DB_PORT}/chat/create/group`, {
        userId: userId,
        name: name,
        type: type
      })
      reply.send(result.data)
    } catch (err) {
      return reply.status(500).send({error: `${err.response.data.error}`})
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
      return reply.status(500).send({error: `${err.response.data.error}`})
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
      return reply.status(500).send({error: `${err.response.data.error}`})
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
      return reply.status(500).send({error: `${err.response.data.error}`})
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
      return reply.status(500).send({error: `${err.response.data.error}`})
    }
  })
})
