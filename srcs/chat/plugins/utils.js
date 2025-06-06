'use strict'

const fp = require('fastify-plugin')
const axios = require('axios')

module.exports = fp(async function chatHandlerRequest(fastify, opts) {
  fastify.decorate('chat', {
    async isDirectMessage(data) {
      if (data.isGroup == false)
        return true
      else
        return false
    },

    async checkFields(data) {
      if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
        console.error("Invalid data : not an object.");
        return {valid: false, reason: "Invalid data: not an object"}
      }

      if (!data.action || !['join', 'send'].includes(data.action)) {
        console.error("Field 'action' is missing or invalid. Must be 'join' or 'send'");
        return {valid: false, reason: "Field 'action' is missing or invalid. Must be 'join' or 'send'"}
      }
    
      return {valid: true};
    },

    async joinChat(data, userId) {
      if (!data.room || typeof data.room !== "number" || data.room == 0) {
        console.error("Field 'room' is missing or invalid must be a number")
        return {valid: false, reason: "Field 'room' is missing or invalid must be a number"}
      }
        try {
          const response = await axios.get(`http://database:${process.env.DB_PORT}/chat/can-join/room/${data.room}/${userId}`)
          if (response.data && response.data.Permission === true) {
            return {valid: true, canJoin: true};
          } else {
            return {valid: false, reason: "You do not have permission to join this room"};
          }
        } catch (err) {
          console.error("Error checking permission:", err.message);
          return {valid: false, reason: `${err.response.data.error}`};
        }
    },

    async sendMessage(data, fromUserId) {
      if (!data.room || typeof data.room !== "number" || data.room == 0) {
        console.error("Field 'room' is missing or invalid must be a number")
        return {valid: false, reason: "Field 'room' is missing or invalid must be a number"}
      }
      console.log('apres check room')
      console.log(`typeof fromUserId = ${typeof fromUserId}`)
      console.log(`typeof data.room = ${typeof data.room}`)
      if (!data.scope || !['dm', 'group'].includes(data.scope)) {
        console.error("Field 'scope' is missing or invalid. Must be 'dm' or 'group'");
        return {valid: false, reason: "Field 'scope' is missing or invalid. Must be 'dm' or 'group'"}
      }
      console.log('apres check dm ou group')

      if(!data.message || typeof data.message !== "string") {
        console.error("Field 'message' is invalid");
        return {valid: false, reason: "Field 'message' is invalid"}
      }
      console.log('apres check message')
      
      if (data.scope === 'dm') {
        try {
          console.log('dans le try du dm')
          const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/send/dm`, {
            fromUserId: fromUserId,
            groupId: data.room,
            message: data.message

          })
          console.log(`RESPONSE AXIOS SUCCESS: ${response.data.success}`)
          if (response.data && response.data.success === true) 
            return { valid: true, messageId: response.data.messageId }
        } catch (err) {
          return {valid: false, reason: err.response.data.error}
        }
      } else if (data.scope === 'group') {
        if (typeof data.groupId !== "number") {
          console.error("Field 'groupId' is required and must be a number when 'scope' is 'group'");
          return {valid: false, reason: "Field 'groupId' is required and must be a number when 'scope' is 'group'"}
        }
        try {
          console.log('dans le try du group')
          const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/send/group`, {
            fromUserId: fromUserId,
            groupId: data.room,
            message: data.message

          })
          if (response.data && response.data.success === true) 
            return { valid: true, messageId: response.data.messageId }
        } catch (err) {
          return {valid: false, reason: err.response.data.error}
        }
      }
      console.log('a la fin du sendMessage')
    }
  });
})
