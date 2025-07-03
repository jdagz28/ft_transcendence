'use strict'

const fp = require('fastify-plugin')
const amqplib = require('amqplib')

module.exports = fp(async function amqpPublisher (fastify, opts) {
  const {
    url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@rabbitmq:5672`,
    exchange = 'games.events',
    type = 'topic'
  } = opts

  let connection
  let channel
  let reconnectT
  let shuttingDown = false

  connect()

  fastify.decorate('publishEvent', (rk, msg) => {
    if (!channel)
      return fastify.log.warn(`AMQP not ready, skipping ${rk}`)
    channel.publish(
      exchange,
      rk,
      Buffer.from(JSON.stringify(msg)),
      { persistent: true }
    )
  })

  fastify.addHook('onClose', async () => {
    shuttingDown = true
    clearTimeout(reconnectT)
    if (channel)    await channel.close().catch(() => {})
    if (connection) await connection.close().catch(() => {})
    fastify.log.info('AMQP connection closed')
  })

  async function connect (attempt = 1) {
    try {
      connection = await amqplib.connect(url)
      connection.on('error',  handleConnClose)
      connection.on('close',  handleConnClose)

      channel = await connection.createChannel()
      await channel.assertExchange(exchange, type, { durable: true })

      fastify.log.info('AMQP connected')
    } catch (err) {
      fastify.log.warn(`AMQP connect attempt ${attempt} failed - retrying in 3 s`)
      scheduleReconnect(attempt + 1)
    }
  }

  function handleConnClose (err) {
    if (shuttingDown) return
    fastify.log.warn('AMQP connection lost - reconnecting')
    channel = null
    connection = null
    scheduleReconnect(1)
  }

  function scheduleReconnect (nextAttempt) {
    if (reconnectT || shuttingDown) return
    reconnectT = setTimeout(() => {
      reconnectT = null
      connect(nextAttempt)
    }, 3000)
  }
}, {
  name: 'amqpPublisher'
})