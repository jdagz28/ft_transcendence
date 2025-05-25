'use strict'

const staticPlugin = require('@fastify/static')
const path = require('path')
const fp = require('fastify-plugin')


module.exports = fp(async function (fastify, opts) {
  fastify.register(staticPlugin, {
    root: path.join(__dirname, '..', 'dist'),
    prefix: '/',
    wildcard: true
  })

  fastify.setNotFoundHandler((_, reply) => {
    reply.type('text/html').sendFile('index.html')
  })
})


