'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async getMeById(id) {
      try {
        console.log('Getting all data for: ', id)
        const response = await axios.get('http://database:1919/me', { params: { id } })
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err 
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
