'use strict'

const fp = require('fastify-plugin')
const fastifyMultipart = require('@fastify/multipart')


module.exports = fp(async function (fastify, opts) {
  fastify.register(fastifyMultipart, {
    addToBody: true,
    attachFieldsToBody: true,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  })
})
