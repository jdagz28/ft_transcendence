'use strict'

const fp = require('fastify-plugin')

const generateHash = require('./generate-hash')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/signup', {
      schema: {
        body: fastify.getSchema('schema:auth:signup')
      },
      handler: signup
    })
  }
)

async function signup (request, reply) {
  const existingUser = await this.db.readUser(request.body.username)
  if (existingUser) {
    const err = new Error('Username already exists')
    err.statusCode = 409
    throw err
  }
  
  const emailExists = await this.db.readUser(request.body.email)
  if (emailExists) {
    const err = new Error('Email already exists')
    err.statusCode = 409
    throw err
  }

  const { hash, salt } = await generateHash(request.body.password)

  try {
    const newUserId = await this.db.createUser({
      username: request.body.username,
      password: hash,
      salt,
      email: request.body.email,
    })
    console.log('User created with ID:', newUserId)
    reply.status(201).send({ userId: newUserId })
  } catch (err) {
    console.error('Failed to create user:', err)
    reply.status(500).send({ error: 'Internal Server Error' })
  }
}