'use strict'

const fp = require('fastify-plugin')
const jwt = require('@fastify/jwt')
const bcrypt = require('bcrypt')
const QRCode = require('qrcode')

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
      id: String(this.user.id),
      username: this.user.username
    }, {
      jti: String(Date.now()),
      expiresIn: process.env.JWT_EXPIRE_IN
    })

    return token
  })


  fastify.decorate('generateHash', async function generateHash (password) {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
  
    return { salt, hash }
  })

  fastify.decorate('generateQRCode', async function generateQRCode (data) {
    try {
      const qrCode = await QRCode.toDataURL(data.otpauth_url, { errorCorrectionLevel: 'H' })
      return qrCode
    } catch (err) {
      throw new Error('Failed to generate QR code')
    }
  })

}), {
  name: 'authentication-plugin'
}