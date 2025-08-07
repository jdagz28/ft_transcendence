'use strict'

const fp = require('fastify-plugin')

class HttpError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

module.exports = fp(async function chatAutoHooks (fastify, opts) {
  fastify.decorate('dbChat', {
    
    async notifyGameTurn(notification, gameId) {
      try {
        const axios = require('axios');
        await axios.post(`http://chat:${process.env.CHAT_PORT}/internal/game-turn`, notification)
      } catch (error) {
        console.error('Error sending notification to chat', error.message);
      }

      const gameInfo = await fastify.dbChat.getGameTournament(gameId);
      console.log(`[GAME_INFO] Game ${gameId} tournament data: ${JSON.stringify(gameInfo)}`);
      if (gameInfo.isPartOfTournament) {
        await fastify.dbChat.addMessageToTournamentChat(gameInfo.tournament.chat_room_id, notification.message, notification.playerId);
        console.log(`Message added to tournament chat for game ${gameId}: ${notification.message}`);
      }
    },

    async addMessageToTournamentChat(chatId, message, userId) {
      try {
        const chatQuery = fastify.db.prepare(`
          SELECT id, type, is_game FROM conversations
          WHERE id = ? AND type = 'group' AND is_game = 1
          LIMIT 1
        `);
        const chat = chatQuery.get(chatId);
        
        if (!chat) {
          return { success: false, reason: 'Tournament chat not found' };
        }

        const senderId = fastify.aiUserId;
        
        const insertQuery = fastify.db.prepare(`
          INSERT INTO messages (sender_id, conversation_id, content, for)
          VALUES (?, ?, ?, ?)
        `);
        const result = insertQuery.run(senderId, chatId, message, userId);
        
        return { 
          success: true, 
          messageId: result.lastInsertRowid,
          chatId: chatId,
          message: message
        };
      } catch (error) {
        fastify.log.error(`Error adding message to tournament chat: ${error.message}`);
        return { success: false, reason: 'Failed to add message to tournament chat' };
      }
    },

    async deleteChatRoom(tournamentId) {
      try {
        const tournament = await fastify.dbTournaments.getTournamentById(tournamentId);
        const roomId = tournament.chat_room_id;

        const tournamentPlayers = await fastify.dbTournaments.getTournamentPlayers(tournamentId)
        const p1Id = tournamentPlayers[0]?.id || null;
        const p2Id = tournamentPlayers[1]?.id || null;
        const p3Id = tournamentPlayers[2]?.id || null;
        const p4Id = tournamentPlayers[3]?.id || null;
        console.log(`[DELETE_CHAT_ROOM] Deleting chat room for tournament ${tournamentId}, room ID: ${roomId}, players: ${p1Id}, ${p2Id}, ${p3Id}, ${p4Id}`);
        if (!roomId) {
          return { success: false, reason: 'No chat room found for this tournament' };
        }

        const deleteConversationQuery = fastify.db.prepare(`
          DELETE FROM conversations WHERE id = ?
        `);
        const result = deleteConversationQuery.run(roomId);
        console.log(`[DELETE_CHAT_ROOM] Result of delete operation: ${JSON.stringify(result)}`);
        if (result.changes === 0) {
          return { success: false, reason: 'Failed to delete chat room' };
        }
        console.log(`[DELETE_CHAT_ROOM] Chat room ${roomId} deleted successfully`);
        const axios = require('axios');
        await axios.post(`http://chat:${process.env.CHAT_PORT}/internal/groupDeleted`, {
          type: 'groupDeleted',
          u1: p1Id,
          u2: p2Id,
          u3: p3Id,
          u4: p4Id,
        });
        console.log(`[DELETE_CHAT_ROOM] Chat room ${roomId} deleted and notification sent successfully`);
        return { 
          success: true, 
          deletedRoomId: roomId,
          message: 'Tournament chat room deleted successfully' 
        };
      } catch (error) {
        fastify.log.error(`Error deleting chat room: ${error.message}`);
        return { success: false, reason: 'Failed to delete chat room' };
      }
    },

    async userExist(userId) {
      const userQuery = fastify.db.prepare(`
        SELECT id FROM users WHERE id = ? LIMIT 1
      `);
      const user = userQuery.get(userId);
      if (user) {
        return true;
      }
      return false;
    },

    async getUsernameById(userId) {
      const userQuery = fastify.db.prepare(`
        SELECT username FROM users WHERE id = ? LIMIT 1
      `);
      const user = userQuery.get(userId);
      return user ? user.username : null;
    },

    async groupExist(groupId) {
      const groupQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (group && group.id) {
        return true;
      }
      return false;
    },

    async createDirectMessage(userIdA, userIdB) {
      try {
        if (userIdA === userIdB) {
          fastify.log.error(`User ${userIdA} cannot create a conversation with themselves`)
          throw new HttpError('Cannot create conversation with self', 400)
        }

        const existingConversationQuery = fastify.db.prepare(`
          SELECT c.id
          FROM conversations c
          JOIN convo_members cm1 ON c.id = cm1.conversation_id
          JOIN convo_members cm2 ON c.id = cm2.conversation_id
          WHERE cm1.user_id = ? AND cm2.user_id = ?
            AND c.type = 'direct'
          LIMIT 1
        `)
        const existingConversation = existingConversationQuery.get(userIdA, userIdB)

        if (existingConversation) {
          fastify.log.debug(`Conversation already exists between ${userIdA} and ${userIdB}`)
          return existingConversation.id
        }

        const createConversationQuery = fastify.db.prepare(`
          INSERT INTO conversations (is_group, name, type, group_type, message_id)
          VALUES (0, NULL, 'direct', 'private', NULL)
        `)

        const result = createConversationQuery.run()
        const conversationId = result.lastInsertRowid;

        const addMembersQuery = fastify.db.prepare(`
          INSERT INTO convo_members (conversation_id, user_id, role)
          VALUES (?, ?, ?)
        `)
        addMembersQuery.run(conversationId, userIdA, 'member')
        addMembersQuery.run(conversationId, userIdB, 'member')

        fastify.log.debug(`Conversation create with ID ${conversationId} between User ${userIdA} and User ${userIdB}`);
        return conversationId;
      } catch (err) {
        fastify.log.error(`createConversation error: ${err.message}`)
        throw new HttpError('Failed to create conversation', 500)
      }
    },

    async joinDirectMessage(userIdA, userIdB) {
      if (!(await this.userExist(userIdA))) {
        throw new HttpError(`User ${userIdA} does not exist`, 404);
      }
      if (!(await this.userExist(userIdB))) {
        throw new HttpError(`User ${userIdB} does not exist`, 404);
      }
      if (userIdA === userIdB) {
        throw new HttpError('Cannot join a conversation with self', 400);
      }

      const blockQuery = fastify.db.prepare(`
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = ? AND blocked_user_id = ?)
          OR (blocker_id = ? AND blocked_user_id = ?)
        LIMIT 1
      `);
      const isBlocked = blockQuery.get(userIdA, userIdB, userIdB, userIdA);
      if (isBlocked) {
        return { Permission: false, reason: 'One user has blocked the other' };
      }

      const existingConversationQuery = fastify.db.prepare(`
        SELECT c.id
        FROM conversations c
        JOIN convo_members cm1 ON c.id = cm1.conversation_id
        JOIN convo_members cm2 ON c.id = cm2.conversation_id
        WHERE cm1.user_id = ? AND cm2.user_id = ?
          AND c.type = 'direct'
        LIMIT 1
      `);
      const existingConversation = existingConversationQuery.get(userIdA, userIdB);

      let conversationId;
      if (!existingConversation) {
        conversationId = await this.createDirectMessage(userIdA, userIdB);
      } else {
        conversationId = existingConversation.id;
      }

      return {Permission: true, Room: conversationId};
    },

    async sendDirectMessage(fromUserId, groupId, message) {
      if (!(await this.userExist(fromUserId))) {
        throw new HttpError(`User ${fromUserId} does not exist`, 404);
      }

      const conversationQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'direct'
        LIMIT 1
      `);
      const conversation = conversationQuery.get(groupId);
      if (!conversation) {
        throw new HttpError('No direct conversation found with this id', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT 1 FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const isMember = memberQuery.get(groupId, fromUserId);
      if (!isMember) {
        throw new HttpError('Sender is not a member of this conversation', 403);
      }

      if (typeof message !== 'string' || message.trim() === '') {
        throw new HttpError('Message must be a non-empty string', 400);
      }

      const otherMemberQuery = fastify.db.prepare(`
        SELECT user_id FROM convo_members
        WHERE conversation_id = ? AND user_id != ?
        LIMIT 1
      `);
      const otherMember = otherMemberQuery.get(groupId, fromUserId);
      if (otherMember) {
        const blockQuery = fastify.db.prepare(`
          SELECT 1 FROM user_blocks
          WHERE (blocker_id = ? AND blocked_user_id = ?)
            OR (blocker_id = ? AND blocked_user_id = ?)
          LIMIT 1
        `);
        const isBlocked = blockQuery.get(fromUserId, otherMember.user_id, otherMember.user_id, fromUserId);
        if (isBlocked) {
          throw new HttpError('Message cannot be sent: one user has blocked the other', 403);
        }
      }

      const insertQuery = fastify.db.prepare(`
        INSERT INTO messages (sender_id, conversation_id, content)
        VALUES (?, ?, ?)
      `);
      const result = insertQuery.run(fromUserId, groupId, message);

      const username = await this.getUsernameById(fromUserId);
      
      console.log(`success in sendDirectMessage`)
      return { 
        success: true, 
        messageId: result.lastInsertRowid,
        fromUserId: fromUserId,
        fromUsername: username || `User${fromUserId}`
      }
    },

    async sendGroupMessage(fromUserId, room, message) {
      if (!(await this.userExist(fromUserId))) {
        throw new HttpError(`User ${fromUserId} does not exist`, 404);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(room);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at, kicked_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(room, fromUserId);
      if (!member) {
        throw new HttpError('User is not a member of this group', 403);
      }
      if (member.banned_at !== null) {
        throw new HttpError('User is banned from this group', 403);
      }
      if (member.kicked_at !== null) {
        throw new HttpError('User has been kicked from this group', 403);
      }

      if (typeof message !== 'string' || message.trim() === '') {
        throw new HttpError('Message must be a non-empty string', 400);
      }

      const insertQuery = fastify.db.prepare(`
        INSERT INTO messages (sender_id, conversation_id, content)
        VALUES (?, ?, ?)
      `);
      const result = insertQuery.run(fromUserId, room, message);

      const username = await this.getUsernameById(fromUserId);

      return { 
        success: true, 
        messageId: result.lastInsertRowid,
        fromUserId: fromUserId,
        fromUsername: username || `User${fromUserId}`
      };
    },

    async canJoinGroup(userId, roomId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const convoQuery = fastify.db.prepare(`
        SELECT id, type, group_type, is_game FROM conversations
        WHERE id = ?
        LIMIT 1
      `);
      const convo = convoQuery.get(roomId);
      if (!convo) {
        throw new HttpError('Conversation not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(roomId, userId);

      if (convo.type === 'direct') {
        if (!member) {
          return { Permission: false, reason: 'Not a member of this DM' };
        }
        return { Permission: true, reason: 'Can join DM', Chat: `${roomId}` };
      }

      if (member) {
        if (member.banned_at !== null) {
          throw new HttpError('User is banned from this group', 403);
        }
        return { Permission: true, reason: 'Can join user is member', Chat: `${roomId}` };
      }

      if (convo.group_type === 'public') {
        return { Permission: true, reason: 'Can join public group', Chat: `${roomId}` };
      }

      if (convo.group_type === 'private' && convo.is_game === 1) {
        return { Permission: true, reason: 'Can join private game group', Chat: `${roomId}` };
      }

      throw new HttpError('User cannot join this group', 403);
    },

    async createGroup(userId, name, groupType, isGame) {
      try {
        const isGameValue = isGame ? 1 : 0;

        const insertGroup = fastify.db.prepare(`
          INSERT INTO conversations (is_group, name, type, group_type, is_game, message_id)
          VALUES (?, ?, 'group', ?, ?, NULL)
        `)
        const result = insertGroup.run(1, name, groupType, isGameValue)
        const conversationId = result.lastInsertRowid

        const insertMember = fastify.db.prepare(`
          INSERT INTO convo_members (conversation_id, user_id, role)
          VALUES (?, ?, 'admin')  
        `)
        insertMember.run(conversationId, userId)
        return {created: true, conversationId: conversationId}
      } catch (err) {
        console.error(`createGroup error: ${err.message}`)
        throw new HttpError('Failed to create group', 500)
      }
    },

    async joinGroup(userId, groupId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type, is_game FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(groupId, userId);
      if (member) {
        if (member.banned_at !== null) {
          throw new HttpError('User is banned from this group', 403);
        }
        return { joined: false, reason: 'Already a member' };
      }

      if (group.group_type === 'public') {
        const insertMember = fastify.db.prepare(`
          INSERT INTO convo_members (conversation_id, user_id, role)
          VALUES (?, ?, 'member')
        `);
        insertMember.run(groupId, userId);
        return { joined: true, groupId, via: 'public' };
      }

      if (group.group_type === 'private' && group.is_game === 1) {
        const insertMember = fastify.db.prepare(`
          INSERT INTO convo_members (conversation_id, user_id, role)
          VALUES (?, ?, 'member')
        `);
        insertMember.run(groupId, userId);
        return { joined: true, groupId, via: 'private_game' };
      }

      const invitationQuery = fastify.db.prepare(`
        SELECT id, status FROM group_invitations
        WHERE group_id = ? AND invited_user_id = ?
        LIMIT 1
      `);
      const invitation = invitationQuery.get(groupId, userId);

      if (!invitation || invitation.status === 'declined') {
        return { joined: false, reason: 'No invitation found for this private group' };
      }
      if (invitation.status !== 'accepted') {
        return { joined: false, reason: 'You have a pending invitation for this private group' };
      }
    },

    async canInvitGroup(userId, groupId) {
      const groupQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT role FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(groupId, userId);
      if (!member) {
        return { canInvite: false, reason: 'Not a member of the group' };
      }
      if (member.role !== 'admin') {
        return { canInvite: false, reason: 'Not an admin of the group' };
      }

      return { canInvite: true };
    },
    
    async invitGroup(fromUserId, toUserId, groupId) {
      await this.canInvitGroup(fromUserId, groupId);

      if (!(await this.userExist(toUserId))) {
        throw new HttpError(`User ${toUserId} does not exist`, 404);
      }

      if (!(await this.userExist(fromUserId))) {
        throw new HttpError(`User ${fromUserId} does not exist`, 404);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT name FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT 1 FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const isMember = memberQuery.get(groupId, toUserId);
      if (isMember) {
        throw new HttpError('User is already a member of this group', 409);
      }

      console.log("BEFORE EXISTINGINVITATION")
      const existingInvitationQuery = fastify.db.prepare(`
        SELECT id FROM group_invitations
        WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
        LIMIT 1
      `);
      const existingInvitation = existingInvitationQuery.get(groupId, toUserId);
      if (existingInvitation) {
        return { invited: false, reason: 'Invitation already pending' };
      }
      console.log('BEFORE INSERTINVITATION')
      const insertInvitation = fastify.db.prepare(`
        INSERT INTO group_invitations (group_id, invited_user_id, invited_by_user_id, status)
        VALUES (?, ?, ?, 'pending')
      `);
      insertInvitation.run(groupId, toUserId, fromUserId);

      await fastify.notifications.groupChatInvite(fromUserId, toUserId, groupId, group.name, `You have been invited to join the group ${group.name}`);
      return { invited: true, groupId, toUserId };
    },

    async acceptInvite(userId, groupId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(groupId, userId);
      if (member) {
        if (member.banned_at !== null) {
          throw new HttpError('User is banned from this group', 403);
        }
        return { accepted: false, reason: 'Already a member' };
      }

      const invitationQuery = fastify.db.prepare(`
        SELECT id, status FROM group_invitations
        WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
        LIMIT 1
      `);
      const invitation = invitationQuery.get(groupId, userId);
      if (!invitation) {
        return { accepted: false, reason: 'No pending invitation found for this group' };
      }

      const insertMember = fastify.db.prepare(`
        INSERT INTO convo_members (conversation_id, user_id, role)
        VALUES (?, ?, 'member')
      `);
      insertMember.run(groupId, userId);

      const updateInvitation = fastify.db.prepare(`
        UPDATE group_invitations
        SET status = 'accepted', responded = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateInvitation.run(invitation.id);

      return { accepted: true, groupId };
    },

    async refuseInvite(userId, groupId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new HttpError('Group not found', 404);
      }

      const invitationQuery = fastify.db.prepare(`
        SELECT id, status FROM group_invitations
        WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
        LIMIT 1
      `);
      const invitation = invitationQuery.get(groupId, userId);
      if (!invitation) {
        return { refused: false, reason: 'No pending invitation found for this group' };
      }

      const updateInvitation = fastify.db.prepare(`
        UPDATE group_invitations
        SET status = 'declined', responded = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateInvitation.run(invitation.id);

      return { refused: true, groupId };
    },

    async getTournamentGroups(userId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const tournamentGroupsQuery = fastify.db.prepare(`
        SELECT c.id, c.name, c.group_type, c.created, c.updated
        FROM conversations c
        JOIN convo_members m ON c.id = m.conversation_id
        WHERE m.user_id = ?
          AND c.type = 'group'
          AND c.is_game = 1
          AND m.banned_at IS NULL
          AND m.kicked_at IS NULL
        ORDER BY c.created DESC
      `);
      
      const tournamentGroups = tournamentGroupsQuery.all(userId);
      
      return {
        success: true,
        user_id: userId,
        tournament_groups_count: tournamentGroups.length,
        tournament_groups: tournamentGroups
      };
    },

    async getUserChats(userId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404)
      }

      const memberGroupsQuery = fastify.db.prepare(`
        SELECT c.id, c.name, c.group_type, c.is_game
        FROM conversations c
        JOIN convo_members m ON c.id = m.conversation_id
        WHERE m.user_id = ?
          AND c.type = 'group'
          AND m.banned_at IS NULL
          AND m.kicked_at IS NULL
      `);
      const memberGroups = memberGroupsQuery.all(userId);

      const publicGroupsQuery = fastify.db.prepare(`
        SELECT c.id, c.name, c.group_type, c.is_game
        FROM conversations c
        WHERE c.type = 'group'
          AND c.group_type = 'public'
          AND c.id NOT IN (
            SELECT conversation_id FROM convo_members WHERE user_id = ?
          )
      `);
      const publicGroups = publicGroupsQuery.all(userId);

      const allGroups = [...memberGroups, ...publicGroups];

      return allGroups;
    },

    async getGroupHistory(groupId, userId) {
      if (!(await this.groupExist(groupId))) {
        throw new HttpError('Group not found', 404);
      }

      const groupTypeRow = fastify.db.prepare(`
        SELECT group_type, is_game FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `).get(groupId);

      if (groupTypeRow.group_type === 'private' && groupTypeRow.is_game === 0) {
        const memberQuery = fastify.db.prepare(`
          SELECT banned_at, kicked_at FROM convo_members
          WHERE conversation_id = ? AND user_id = ?
          LIMIT 1
        `);
        const member = memberQuery.get(groupId, userId);
        if (!member) {
          throw new HttpError('User is not a member of this private group', 403);
        }
        if (member.banned_at !== null) {
          throw new HttpError('User is banned from this group', 403);
        }
      }

      const messagesQuery = fastify.db.prepare(`
        SELECT m.id, m.sender_id, u.username, m.content, m.created, m.for
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created ASC
      `);
      const messages = messagesQuery.all(groupId);

      return messages;
    },

    async getDmHistory(chatId, userId) {
      console.log(`in dmHistory chatId and typeof = ${chatId} ${typeof chatId}/ userId and typeof = ${userId} ${typeof userId}`)
      const chatQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'direct'
        LIMIT 1
      `);
      const chat = chatQuery.get(chatId);
      if (!chat || !chat.id) {
        throw new HttpError(`DM ${chatId} not found`, 404);
      }

      const memberQuery = fastify.db.prepare(`
        SELECT 1 FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const isMember = memberQuery.get(chatId, userId);
      if (!isMember) {
        throw new HttpError('User is not a member of this DM', 403);
      }
 
      const messagesQuery = fastify.db.prepare(`
        SELECT m.id, m.sender_id, u.username, u.id as user_id, u.email, m.content, m.created, m.for
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created ASC
      `);
      const messages = messagesQuery.all(chatId);

      return messages;
    },

    async blockUser(userId, blockedUserId) {
      if (!(await this.userExist(blockedUserId))) {
        throw new HttpError(`Blocked user ${blockedUserId} does not exist`, 404);
      }

      if (userId === blockedUserId) {
        throw new HttpError('Cannot block yourself', 400);
      }

      const existingBlockQuery = fastify.db.prepare(`
        SELECT 1 FROM user_blocks
        WHERE blocker_id = ? AND blocked_user_id = ?
        LIMIT 1
      `);
      const existingBlock = existingBlockQuery.get(userId, blockedUserId);
      if (existingBlock) {
        return { success: false, reason: 'User already blocked' };
      }

      const insertBlockQuery = fastify.db.prepare(`
        INSERT INTO user_blocks (blocker_id, blocked_user_id)
        VALUES (?, ?)
      `);
      insertBlockQuery.run(userId, blockedUserId);

      return { success: true, blocker: userId, blocked: blockedUserId };
    },

    async unblockUser(userId, blockedUserId) {
      if (!(await this.userExist(blockedUserId))) {
        throw new HttpError(`Blocked user ${blockedUserId} does not exist`, 404);
      }

      if (userId === blockedUserId) {
        throw new HttpError('Cannot unblock yourself', 400);
      }

      const existingBlockQuery = fastify.db.prepare(`
        SELECT 1 FROM user_blocks
        WHERE blocker_id = ? AND blocked_user_id = ?
        LIMIT 1
      `);
      const existingBlock = existingBlockQuery.get(userId, blockedUserId);
      if (!existingBlock) {
        return { success: false, reason: 'User is not blocked' };
      }

      const deleteBlockQuery = fastify.db.prepare(`
        DELETE FROM user_blocks
        WHERE blocker_id = ? AND blocked_user_id = ?
      `);
      const result = deleteBlockQuery.run(userId, blockedUserId);

      if (result.changes === 0) {
        return { success: false, reason: 'Failed to unblock user' };
      }

      return { success: true, blocker: userId, unblocked: blockedUserId };
    },

    async getBlockedUsers(userId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      const blockedUsersQuery = fastify.db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.nickname,
          ub.created as blocked_at
        FROM user_blocks ub
        JOIN users u ON ub.blocked_user_id = u.id
        WHERE ub.blocker_id = ?
        ORDER BY ub.created DESC
      `);
      
      const blockedUsers = blockedUsersQuery.all(userId);
      
      return {
        success: true,
        blocker_id: userId,
        blocked_count: blockedUsers.length,
        blocked_users: blockedUsers
      };
    },

    async isBlocked(userId, targetUserId) {
      if (!(await this.userExist(userId))) {
        throw new HttpError(`User ${userId} does not exist`, 404);
      }

      if (!(await this.userExist(targetUserId))) {
        throw new HttpError(`Target user ${targetUserId} does not exist`, 404);
      }

      if (userId === targetUserId) {
        return { 
          isBlocked: false, 
          reason: 'Cannot check block status with yourself',
          blocker_id: userId,
          target_id: targetUserId
        };
      }

      const blockQuery = fastify.db.prepare(`
        SELECT 
          id,
          blocker_id,
          blocked_user_id,
          created as blocked_at
        FROM user_blocks
        WHERE (blocker_id = ? AND blocked_user_id = ?)
           OR (blocker_id = ? AND blocked_user_id = ?)
        LIMIT 1
      `);
      
      const blockRecord = blockQuery.get(userId, targetUserId, targetUserId, userId);
      
      if (blockRecord) {
        return {
          isBlocked: true,
          blocker_id: blockRecord.blocker_id,
          blocked_user_id: blockRecord.blocked_user_id,
          blocked_at: blockRecord.blocked_at,
          block_id: blockRecord.id,
          user_is_blocker: blockRecord.blocker_id === userId,
          user_is_blocked: blockRecord.blocked_user_id === userId
        };
      }

      return {
        isBlocked: false,
        blocker_id: userId,
        target_id: targetUserId
      };
    },

    async getGameTournament(gameId) {
      if (!gameId) {
        throw new HttpError('Invalid game ID provided', 400);
      }

      const numericGameId = typeof gameId === 'string' ? parseInt(gameId) : gameId;
      
      if (isNaN(numericGameId)) {
        console.log('gameId is not a valid number');
        throw new HttpError('Invalid game ID provided', 400);
      }

      const tournamentQuery = fastify.db.prepare(`
        SELECT 
          t.id as tournament_id,
          t.name as tournament_name,
          t.status as tournament_status,
          t.created_by,
          t.chat_room_id,
          t.created as tournament_created,
          tg.round,
          tg.slot,
          tg.status as game_status
        FROM tournaments t
        JOIN tournament_games tg ON t.id = tg.tournament_id
        WHERE tg.game_id = ?
        LIMIT 1
      `);
      
      const tournament = tournamentQuery.get(numericGameId);
      
      if (tournament) {
        return {
          isPartOfTournament: true,
          tournament: {
            id: tournament.tournament_id,
            name: tournament.tournament_name,
            status: tournament.tournament_status,
            created_by: tournament.created_by,
            chat_room_id: tournament.chat_room_id,
            created: tournament.tournament_created,
            game_round: tournament.round,
            game_slot: tournament.slot,
            game_status: tournament.game_status
          }
        };
      }

      return {
        isPartOfTournament: false,
        game_id: numericGameId
      };
    },

    async createGroupGame(userId, name, p1, p2, p3, p4, tournamentId) {
      try {
        const createGroupQuery = fastify.db.prepare(`
          INSERT INTO conversations (is_group, name, type, group_type, is_game, message_id)
          VALUES (1, ?, 'group', 'private', 1, NULL)
        `);
        const result = createGroupQuery.run(name);
        const conversationId = result.lastInsertRowid;

        const addMemberQuery = fastify.db.prepare(`
          INSERT INTO convo_members (conversation_id, user_id, role)
          VALUES (?, ?, ?)
        `);

        addMemberQuery.run(conversationId, userId, 'admin');

        const players = [p2, p3, p4].filter(playerId => 
          playerId && 
          playerId !== userId && 
          typeof playerId === 'number'
        );

        for (const playerId of players) {
          if (await this.userExist(playerId)) {
            const existingMember = fastify.db.prepare(`
              SELECT 1 FROM convo_members 
              WHERE conversation_id = ? AND user_id = ?
            `).get(conversationId, playerId);
            
            if (!existingMember) {
              addMemberQuery.run(conversationId, playerId, 'member');
            }
          }
        }

        const axios = require('axios');
        await axios.post(`http://chat:${process.env.CHAT_PORT}/internal/chatGameCreated`, {
          p1: p1,
          p2: p2,
          p3: p3,
          p4: p4,
          type: 'chatGameCreated',
          roomId: conversationId
        });

        if (tournamentId) {
          const updateTournamentQuery = fastify.db.prepare(`
            UPDATE tournaments 
            SET chat_room_id = ? 
            WHERE id = ?
          `);
          updateTournamentQuery.run(conversationId, tournamentId);
        }
        
        return { 
          success: true, 
          conversationId, 
          name,
          players: players.length + 1
        };
      } catch (error) {
        fastify.log.error(`Error creating game group: ${error.message}`);
        throw new HttpError('Failed to create game group', 500);
      }
    }

  })
  }, {
  name: 'chatAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
