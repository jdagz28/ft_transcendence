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
      if (!data.scope || !['dm', 'group'].includes(data.scope)) {
        console.error("Field 'scope' is missing or invalid. Must be 'dm' or 'group'");
        return {valid: false, reason: "Field 'scope' is missing or invalid. Must be 'dm' or 'group'"}
      }
      if (data.scope === 'group') {
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
      }

      if (data.scope === 'dm') {
        if (!data.userId || typeof data.userId !== "number" || data.userId == 0) {
          console.error("Field 'userId' is missing or invalid must be a number")
          return {valid: false, reason: "Field 'userId' is missing or invalid must be a number"}
        }
        try{
          const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/can-join/dm`, {
            fromUserId: userId,
            toUserId: data.userId
          })
          if (response.data && response.data.Permission === true) {
            data.room = response.data.Room;
            return {valid: true, canJjoin: true}
          } else {
            return {valid:false, reason: `${err.response.data.error}`}
          }
        } catch (err) {
          console.error("Erorr checking permission:", err.message)
          return {valid: false, reason: `${err.response.data.error}`}
        }
      }
    },

    async sendMessage(data, fromUserId) {
      if (!data.room || typeof data.room !== "number" || data.room == 0) {
        console.error("Field 'room' is missing or invalid must be a number")
        return {valid: false, reason: "Field 'room' is missing or invalid must be a number"}
      }
      if (!data.scope || !['dm', 'group'].includes(data.scope)) {
        console.error("Field 'scope' is missing or invalid. Must be 'dm' or 'group'");
        return {valid: false, reason: "Field 'scope' is missing or invalid. Must be 'dm' or 'group'"}
      }

      if(!data.message || typeof data.message !== "string") {
        console.error("Field 'message' is invalid");
        return {valid: false, reason: "Field 'message' is invalid"}
      }
      
      if (data.scope === 'dm') {
        try {
          const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/send/dm`, {
            fromUserId: fromUserId,
            groupId: data.room,
            message: data.message

          })
          if (response.data && response.data.success === true) 
            return { 
              valid: true, 
              messageId: response.data.messageId,
              fromUserId: response.data.fromUserId,
              fromUsername: response.data.fromUsername
            }
        } catch (err) {
          return {valid: false, reason: err.response.data.error}
        }
      } else if (data.scope === 'group') {
        try {
          const response = await axios.post(`http://database:${process.env.DB_PORT}/chat/send/group`, {
            fromUserId: fromUserId,
            room: data.room,
            message: data.message

          })
          if (response.data && response.data.success === true) 
            return { 
              valid: true, 
              messageId: response.data.messageId,
              fromUserId: response.data.fromUserId,
              fromUsername: response.data.fromUsername
            }
        } catch (err) {
          return {valid: false, reason: err.response.data.error}
        }
      }
    }
  });
})
