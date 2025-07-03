'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function chatAutoHooks (fastify, opts) {
  fastify.decorate('dbChat', {
    
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
          throw new Error('Cannot create conversation with self')
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
        throw new Error('Failed to create conversation')
      }
    },

    async joinDirectMessage(userIdA, userIdB) {
      if (!(await this.userExist(userIdA))) {
        throw new Error(`User ${userIdA} does not exist`);
      }
      if (!(await this.userExist(userIdB))) {
        throw new Error(`User ${userIdB} does not exist`);
      }
      if (userIdA === userIdB) {
        throw new Error('Cannot join a conversation with self');
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
        throw new Error(`User ${fromUserId} does not exist`);
      }

      const conversationQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'direct'
        LIMIT 1
      `);
      const conversation = conversationQuery.get(groupId);
      if (!conversation) {
        throw new Error('No direct conversation found with this id');
      }

      const memberQuery = fastify.db.prepare(`
        SELECT 1 FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const isMember = memberQuery.get(groupId, fromUserId);
      if (!isMember) {
        throw new Error('Sender is not a member of this conversation');
      }

      if (typeof message !== 'string' || message.trim() === '') {
        throw new Error('Message must be a non-empty string');
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
          throw new Error('Message cannot be sent: one user has blocked the other');
        }
      }

      const insertQuery = fastify.db.prepare(`
        INSERT INTO messages (sender_id, conversation_id, content)
        VALUES (?, ?, ?)
      `);
      const result = insertQuery.run(fromUserId, groupId, message);
      console.log(`success in sendDirectMessage`)
      return { success: true, messageId: result.lastInsertRowid }
    },

    async sendGroupMessage(fromUserId, room, message) {
      if (!(await this.userExist(fromUserId))) {
        throw new Error(`User ${fromUserId} does not exist`);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(room);
      if (!group) {
        throw new Error('Group not found');
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at, kicked_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(room, fromUserId);
      if (!member) {
        throw new Error('User is not a member of this group');
      }
      if (member.banned_at !== null) {
        throw new Error('User is banned from this group');
      }
      if (member.kicked_at !== null) {
        throw new Error('User has been kicked from this group');
      }

      if (typeof message !== 'string' || message.trim() === '') {
        throw new Error('Message must be a non-empty string');
      }

      const insertQuery = fastify.db.prepare(`
        INSERT INTO messages (sender_id, conversation_id, content)
        VALUES (?, ?, ?)
      `);
      const result = insertQuery.run(fromUserId, room, message);

      return { success: true, messageId: result.lastInsertRowid };
    },

    async canJoinGroup(userId, roomId) {
      if (!(await this.userExist(userId))) {
        throw new Error(`User ${userId} does not exist`);
      }

      const convoQuery = fastify.db.prepare(`
        SELECT id, type, group_type, is_game FROM conversations
        WHERE id = ?
        LIMIT 1
      `);
      const convo = convoQuery.get(roomId);
      if (!convo) {
        throw new Error('Conversation not found');
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
          throw new Error('User is banned from this group');
        }
        return { Permission: true, reason: 'Can join user is member', Chat: `${roomId}` };
      }

      if (convo.group_type === 'public') {
        return { Permission: true, reason: 'Can join public group', Chat: `${roomId}` };
      }

      if (convo.group_type === 'private' && convo.is_game === 1) {
        return { Permission: true, reason: 'Can join private game group', Chat: `${roomId}` };
      }

      throw new Error('User cannot join this group');
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
        throw new Error('Failed to create group')
      }
    },

    async joinGroup(userId, groupId) {
      if (!(await this.userExist(userId))) {
        throw new Error(`User ${userId} does not exist`);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type, is_game FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(groupId, userId);
      if (member) {
        if (member.banned_at !== null) {
          throw new Error('User is banned from this group');
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
        throw new Error('Group not found');
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
      const canInvite = await this.canInvitGroup(fromUserId, groupId);
      if (!canInvite.canInvite) {
        throw new Error(canInvite.reason || 'Not allowed to invite');
      }

      if (!(await this.userExist(toUserId))) {
        throw new Error(`User ${toUserId} does not exist`);
      }

      if (!(await this.userExist(fromUserId))) {
        throw new Error(`User ${fromUserId} does not exist`);
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

      return { invited: true, groupId, toUserId };
    },

    async acceptInvite(userId, groupId) {
      if (!(await this.userExist(userId))) {
        throw new Error(`User ${userId} does not exist`);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const memberQuery = fastify.db.prepare(`
        SELECT banned_at FROM convo_members
        WHERE conversation_id = ? AND user_id = ?
        LIMIT 1
      `);
      const member = memberQuery.get(groupId, userId);
      if (member) {
        if (member.banned_at !== null) {
          throw new Error('User is banned from this group');
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
        throw new Error(`User ${userId} does not exist`);
      }

      const groupQuery = fastify.db.prepare(`
        SELECT id, group_type FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `);
      const group = groupQuery.get(groupId);
      if (!group) {
        throw new Error('Group not found');
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

    async getUserChats(userId) {
      if (!(await this.userExist(userId))) {
        throw new Error(`User ${userId} does not exist`)
      }

      const memberGroupsQuery = fastify.db.prepare(`
        SELECT c.id, c.name, c.group_type
        FROM conversations c
        JOIN convo_members m ON c.id = m.conversation_id
        WHERE m.user_id = ?
          AND c.type = 'group'
          AND m.banned_at IS NULL
          AND m.kicked_at IS NULL
      `);
      const memberGroups = memberGroupsQuery.all(userId);

      const publicGroupsQuery = fastify.db.prepare(`
        SELECT c.id, c.name, c.group_type
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
        throw new Error('Group not found');
      }

      const groupTypeRow = fastify.db.prepare(`
        SELECT group_type FROM conversations
        WHERE id = ? AND type = 'group'
        LIMIT 1
      `).get(groupId);

      if (groupTypeRow.group_type === 'private') {
        const memberQuery = fastify.db.prepare(`
          SELECT banned_at, kicked_at FROM convo_members
          WHERE conversation_id = ? AND user_id = ?
          LIMIT 1
        `);
        const member = memberQuery.get(groupId, userId);
        if (!member) {
          throw new Error('User is not a member of this private group');
        }
        if (member.banned_at !== null) {
          throw new Error('User is banned from this group');
        }
      }
      
      const messagesQuery = fastify.db.prepare(`
        SELECT m.id, m.sender_id, u.username, m.content, m.created
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created ASC
      `);
      const messages = messagesQuery.all(groupId);

      return messages;
    }
    
  })
  }, {
  name: 'chatAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
