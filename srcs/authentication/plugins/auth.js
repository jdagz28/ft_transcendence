'use strict'

const fp = require('fastify-plugin')
const jwt = require('@fastify/jwt')

module.exports = fp(async function authenticationPlugin (fastify, opts) {
  const revokedTokens = new Map()

  fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    trusted: function isTrusted(request, decodedToken) {
      return !revokedTokens.has(decodedToken.jti)
    }
  })

  fastify.decorate('authenticate', async function authenticate (request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  fastify.decorateRequest('revokeToken', function() {
    revokedTokens.set(this.user.jti, true)
  })

  fastify.decorateRequest('generateToken', async function() {
    const token = await fastify.jwt.sign({
      id: String(this.user._id),
      username: this.user.username
    }, {
      jti: String(Date.now()),
      expiresIn: process.env.JWT_EXPIRE_IN
    })

    return token
  })
}), {
  name: 'authentication-plugin'
}