'use strict';

const fp = require('fastify-plugin');
const axios = require('axios');

const notificationsApi = axios.create({
    baseURL: `http://notifications:${process.env.NOTIFICATIONS_PORT}`,
    timeout: 2_000
  });

module.exports = fp(async function notificationPlugin(fastify, opts) {
  fastify.decorate('notifications', {

    // Sends the notification for a specific user to the notification container. 
    async notifyUser(userId, notification) {
      try {
        await notificationsApi.post(`/notify/user/${userId}`, notification);
      } catch (error) {
        console.error('Failed to send notification:', error.message);
      }
    },

    // Broadcasts a notification to all users.
    async broadcast(notification) {
      try {
        await notificationsApi.post(`/notify/broadcast`, notification);
      } catch (error) {
        console.error('Failed to broadcast notification:', error.message);
      }
    },

    // Sends a friend request notification.
    async friendRequest(requesterId, recipientId, requesterName) {
      const message = `${requesterName} sent you a friend request`;
      const result = await fastify.notifications.writeNotificationToDB(
        recipientId, requesterId, 'friend.request', null, message, null
      );
      const id = result.id;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'friend.request',
        requesterId,
        requesterName,
        message,
        id
      });
    },

    // Sends a game turn notification.
    async gameTurn(playerId, gameId) {
      const message = `It's your turn! Game ${gameId} is ready for you.`;
      const result = await fastify.notifications.writeNotificationToDB(
        playerId, null, 'game.turn', gameId, message, null
      );
      const id = result.id;
      await fastify.notifications.notifyUser(playerId, {
        type: 'game.turn',
        gameId,
        message,
        id
      });
      await fastify.dbChat.notifyGameTurn({
        type: 'game.turn',
        gameId,
        playerId,
        message,
        id
      });
    },

    // Broadcast a tournament update notification
    async tournamentUpdate(tournamentId, message) {
      const result = await fastify.notifications.writeNotificationToDB(
        null, null, 'tournament.update', tournamentId, message, null
      );
      const id = result.id;
      await fastify.notifications.broadcast({
        type: 'tournament.update',
        tournamentId,
        message,
        id
      });
      
    },

    // Sends a game invite notification.
    async gameInvite(senderId, recipientId, gameId) {
      const message = `You have been invited to join a game by user ${senderId}`;
      const result = await fastify.notifications.writeNotificationToDB(
        recipientId, senderId, 'game.invite', gameId, message, null
      );
      const id = result.id;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'game.invite',
        senderId,
        gameId,
        message,
        id
      });
      return id;
    },

    // Sends a tournament invite notification.
    async tournamentInvite(senderId, recipientId, tournamentId) {
      const message = `You have been invited to join a tournament by user ${senderId}`;
      const result = await fastify.notifications.writeNotificationToDB(
        recipientId, senderId, 'tournament.invite', tournamentId, message, null
      );
      const id = result.id;
      await fastify.notifications.notifyUser(recipientId, {
        type: 'tournament.invite',
        senderId, 
        tournamentId,
        message,
        id
      });
    },

    // Sends a group chat invite notification.
    async groupChatInvite(senderId, sendedToId, groupId, groupName, message) {
      const result = await fastify.notifications.writeNotificationToDB(
        sendedToId, senderId, 'chat.invite', groupId, message, groupName
      );
      const id = result.id;
      await fastify.notifications.notifyUser(sendedToId, {
        type: 'chat.invite',
        senderId: senderId,
        groupId: groupId,
        groupName: groupName,
        message: message,
        id: id
      });
    },

    // Write notification entry to the database.
    async writeNotificationToDB(userID, senderID, type, type_id, message, name) {
      const query = fastify.db.prepare(`
        INSERT INTO notifications (user_id, sender_id, type, type_id, content, name)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = query.run(userID, senderID, type, type_id, message, name);
      if (result.changes === 0) {
        throw new Error('Failed to write notification to database');
      }
      return { success: true , id: result.lastInsertRowid };
    }

  });
}, {
  name: 'notificationPlugin'
});
