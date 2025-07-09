'use strict';

const fp = require('fastify-plugin');
const axios = require('axios');

const notificationsApi = axios.create({
    baseURL: `http://notifications:${process.env.NOTIFICATIONS_PORT}`,
    timeout: 2_000
  });

module.exports = fp(async function notificationPlugin(fastify, opts) {
  fastify.decorate('notifications', {
    async notifyUser(userId, notification) {
      try {
        await notificationsApi.post(`/notify/user/${userId}`, notification);
      } catch (error) {
        console.error('Failed to send notification:', error.message);
      }
    },

    async broadcast(notification) {
      try {
        await notificationsApi.post(`/notify/broadcast`, notification);
      } catch (error) {
        console.error('Failed to broadcast notification:', error.message);
      }
    },

    async friendRequest(requesterId, recipientId, requesterName) {
      await fastify.notifications.notifyUser(recipientId, {
        type: 'friend.request',
        requesterId,
        requesterName,
        message: `${requesterName} sent you a friend request`
      });
    },

    async gameTurn(playerId, gameId) {
      console.log(`Notifying player ${playerId} for game ${gameId}`);
      await fastify.notifications.notifyUser(playerId, {
        type: 'game.turn',
        gameId,
        message: 'It\'s your turn!'
      });
    },

    async tournamentUpdate(tournamentId, message) {
      console.log(`Notifying tournament ${tournamentId} with message: ${message}`);
      await fastify.notifications.broadcast({
        type: 'tournament.update',
        tournamentId,
        message
      });
    },

    async gameInvite(senderId, recipientId, gameId) {
      console.log(`Notifying recipient ${recipientId} of game invite from ${senderId} for game ${gameId}`);
      await fastify.notifications.notifyUser(recipientId, {
        type: 'game.invite',
        senderId,
        gameId,
        message: `You have been invited to join a game by user ${senderId}`
      });
    },

    async tournamentInvite(senderId, recipientId, tournamentId) {
      console.log(`Notifying recipient ${recipientId} of tournament invite from ${senderId} for tournament ${tournamentId}`);
      await fastify.notifications.notifyUser(recipientId, {
        type: 'tournament.invite',
        senderId,
        tournamentId,
        message: `You have been invited to join a tournament by user ${senderId}`
      });
    }

  });
}, {
  name: 'notificationPlugin'
});
