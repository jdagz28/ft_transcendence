import type { BlockedUsersResponse, IsBlockedResponse } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { refreshDMsList } from '../chat';

// ============================================================================ //
// USER BLOCKING MANAGER                                                        //
// ============================================================================ //

export class UserBlockingManager {

  async loadBlockedUsers(): Promise<void> {
    const token = chatState.getAuthToken();
    try {
      const blockedResponse = await fetch('/chat/blocked-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (blockedResponse.ok) {
        const data: BlockedUsersResponse = await blockedResponse.json();
        chatState.clearBlockedUsers();
        if (data.success && data.blocked_users) {
          data.blocked_users.forEach(user => {
            chatState.addBlockedUser(user.username);
          });
        }
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  }

  async blockUser(userId: number): Promise<boolean> {
    const token = chatState.getAuthToken();
    try {
      const response = await fetch('/chat/block-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockedUserId: userId }),
      });
      
      if (response.ok) {
        await this.loadBlockedUsers();
        refreshDMsList();
        
        if (chatState.currentChatType === 'dm' && chatState.currentUserId === userId) {
          chatState.setCurrentChat(null, '', 'group', null);
          chatMessages.clearMessages();
          const messagesDiv = document.getElementById('sidebar-chat-messages');
          if (messagesDiv) {
            messagesDiv.innerHTML = '<div class="text-gray-400 text-center">Sélectionnez un chat pour commencer</div>';
          }
        }
        
        return true;
      } else {
        console.error('Failed to block user, response:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }

  async unblockUser(userId: number): Promise<boolean> {
    const token = chatState.getAuthToken();
    try {
      const response = await fetch('/chat/unblock-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockedUserId: userId }),
      });
      
      if (response.ok) {
        await this.loadBlockedUsers();
        refreshDMsList();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  }

  async isUserBlocked(userId: number): Promise<boolean> {
    const token = chatState.getAuthToken();
    try {
      const response = await fetch(`/chat/isBlocked/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data: IsBlockedResponse = await response.json();
        return data.isBlocked;
      }
      return false;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  async getBlockingInfo(userId: number): Promise<IsBlockedResponse | null> {
    const token = chatState.getAuthToken();
    try {
      const response = await fetch(`/chat/isBlocked/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting blocking info:', error);
      return null;
    }
  }

  async handleUserBlocked(blockedByUserId: number, blockedByUsername: string): Promise<void> {
    if (chatState.currentChatType === 'dm' && chatState.currentUserId === blockedByUserId) {
      chatMessages.showErrorMessage(`You have been blocked by ${blockedByUsername}`);
      
      setTimeout(async () => {
        const { openDefaultMainGroup } = await import('../sidebarChat');
        await openDefaultMainGroup();
      }, 2000);
    }

    refreshDMsList();
  }

  handleUserUnblocked(_unblockedByUserId: number, unblockedByUsername: string): void {
    chatState.removeBlockedUser(unblockedByUsername);
    refreshDMsList();
  }

  async handleUserBlockedByMe(blockedUserId: number): Promise<void> {
    await this.loadBlockedUsers();
    
    if (chatState.currentChatType === 'dm' && chatState.currentUserId === blockedUserId) {
      chatMessages.clearMessages();
      if (chatState.currentChatId && chatState.currentChatType) {
        await chatMessages.loadChatHistory(chatState.currentChatId, chatState.currentChatType);
      }
    } else {
      chatMessages.clearMessages();
      if (chatState.currentChatId && chatState.currentChatType) {
        await chatMessages.loadChatHistory(chatState.currentChatId, chatState.currentChatType);
      }
    }
  }

  async handleUserUnblockedByMe(unblockedUserId: number): Promise<void> {
    await this.loadBlockedUsers();
    
    if (chatState.currentChatType === 'dm' && chatState.currentUserId === unblockedUserId) {
      chatMessages.clearMessages();
      if (chatState.currentChatId && chatState.currentChatType) {
        await chatMessages.loadChatHistory(chatState.currentChatId, chatState.currentChatType);
      }
    } else {
      chatMessages.clearMessages();
      if (chatState.currentChatId && chatState.currentChatType) {
        await chatMessages.loadChatHistory(chatState.currentChatId, chatState.currentChatType);
      }
    }
  }
}

export const userBlocking = new UserBlockingManager();
