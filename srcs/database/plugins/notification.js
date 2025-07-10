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
      const message = `${requesterName} sent you a friend request`;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'friend.request',
        requesterId,
        requesterName,
        message
      });
      await fastify.notifications.writeNotificationToDB(
        recipientId, requesterId, 'friend.request', null, message
      );
    },

    async gameTurn(playerId, gameId) {
      console.log(`Notifying player ${playerId} for game ${gameId}`);
      const message = `It's your turn! Game ${gameId} is ready for you.`;
      await fastify.notifications.notifyUser(playerId, {
        type: 'game.turn',
        gameId,
        message
      });
      await fastify.notifications.writeNotificationToDB(
        playerId, null, 'game.turn', gameId, message
      );
    },

    async tournamentUpdate(tournamentId, message) {
      console.log(`Notifying tournament ${tournamentId} with message: ${message}`);
      await fastify.notifications.broadcast({
        type: 'tournament.update',
        tournamentId,
        message
      });
      await fastify.notifications.writeNotificationToDB(
        null, null, 'tournament.update', tournamentId, message
      );
    },

    async gameInvite(senderId, recipientId, gameId) {
      console.log(`Notifying recipient ${recipientId} of game invite from ${senderId} for game ${gameId}`);
      const message = `You have been invited to join a game by user ${senderId}`;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'game.invite',
        senderId,
        gameId,
        message
      });
      await fastify.notifications.writeNotificationToDB(
        recipientId, senderId, 'game.invite', gameId, message
      );
    },

    async tournamentInvite(senderId, recipientId, tournamentId) {
      console.log(`Notifying recipient ${recipientId} of tournament invite from ${senderId} for tournament ${tournamentId}`);
      const message = `You have been invited to join a tournament by user ${senderId}`;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'tournament.invite',
        senderId, 
        tournamentId,
        message
      });
      await fastify.notifications.writeNotificationToDB(
        recipientId, senderId, 'tournament.invite', tournamentId, message
      );
    },

    async writeNotificationToDB(userID, senderID, type, type_id, message) {
      const query = fastify.db.prepare(`
        INSERT INTO notifications (user_id, sender_id, type, type_id, content)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = query.run(userID, senderID, type, type_id, message);
      console.log(`Notification written to DB for user ${userID}: ${message}`); //! DELETE
      if (result.changes === 0) {
        throw new Error('Failed to write notification to database');
      }
      return { success: true };
    }

  });
}, {
  name: 'notificationPlugin'
});
