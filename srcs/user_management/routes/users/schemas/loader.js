'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./userProfile.json'))
  fastify.addSchema(require('./avatar.json'))
  fastify.addSchema(require('./changePassword.json'))
  fastify.addSchema(require('./changeEmail.json'))
  fastify.addSchema(require('./changeNickname.json'))
  fastify.addSchema(require('./changeUsername.json'))
  fastify.addSchema(require('./getUserByUsername.json'))
  fastify.addSchema(require('./addFriend.json'))
  fastify.addSchema(require('./removeFriend.json'))
  fastify.addSchema(require('./respondFriendRequest.json'))
})