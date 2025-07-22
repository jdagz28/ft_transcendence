import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { chatSwitcher } from './chatSwitcher';
import { userBlocking } from './userBlocking';

// ============================================================================ //
// CHAT WEBSOCKET MANAGER                                                       //
// ============================================================================ //

export class ChatWebSocketManager {

  async joinAllAvailableRooms(): Promise<void> {
    const token = chatState.getAuthToken();
    
    if (!chatState.currentWs || chatState.currentWs.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready for joining all rooms');
      return;
    }

    try {
      await Promise.all([
        this.joinGroupRooms(token),
        this.joinDMRooms(token)
      ]);
    } catch (error) {
      console.error('Error joining all rooms:', error);
    }
  }

  private async joinGroupRooms(token: string): Promise<void> {
    const groupsResponse = await fetch('/chat/mychats', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (groupsResponse.ok) {
      const groups = await groupsResponse.json();
      for (const group of groups) {
        chatState.currentWs!.send(JSON.stringify({
          action: 'join',
          scope: 'group',
          room: group.id
        }));
      }
    }
  }

  private async joinDMRooms(token: string): Promise<void> {
    const friendsResponse = await fetch('https://localhost:4242/users/me/friends', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      const friends = friendsData.data || [];

      for (const friend of friends) {
        try {
          const isBlockedAPI = await userBlocking.isUserBlocked(friend.id);
          const isBlockedLocal = chatState.isUserBlocked(friend.username);
          
          if (isBlockedAPI && !isBlockedLocal) {
            chatState.addBlockedUser(friend.username);
          } else if (!isBlockedAPI && isBlockedLocal) {
            chatState.removeBlockedUser(friend.username);
          }
          
          if (isBlockedAPI) {
            continue;
          }
          
          const canJoinResponse = await fetch('https://localhost:4242/chat/can-join/dm', {
            method: 'POST',
            body: JSON.stringify({ userId: friend.id }),
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (canJoinResponse.ok) {
            const canJoinData = await canJoinResponse.json();
            chatState.currentWs!.send(JSON.stringify({
              action: 'join',
              scope: 'dm',
              room: canJoinData.Room,
              userId: friend.id
            }));
          }
        } catch (error) {
          console.warn(`Failed to join DM with ${friend.username}:`, error);
        }
      }
    }
  }

  initializeWebSocket(token: string): void {
    chatState.setWebSocket(new WebSocket(`wss://${window.location.host}/chat?token=${encodeURIComponent(token)}`));

    chatState.currentWs!.onopen = async () => {
      console.log('Chat WebSocket connected');
      await this.joinAllAvailableRooms();
    };

    chatState.currentWs!.onmessage = (event) => {
      this.handleWebSocketMessage(event);
    };

    chatState.currentWs!.onclose = (event) => {
      console.log('Chat WebSocket closed:', event.code, event.reason);
      chatState.setWebSocket(null);
      
      if (event.code !== 1000 && chatState.isInitialized) {
        setTimeout(() => {
          if (chatState.currentChatId && chatState.currentChatName) {
            const token = chatState.getAuthToken();
            if (token) {
              this.initializeWebSocket(token);
            }
          }
        }, 3000);
      }
    };

    chatState.currentWs!.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);

      const messageHandlers: Record<string, Function> = {
        'user_blocked': () => userBlocking.handleUserBlocked(data.blocked_by_user_id, data.blocked_by_username),
        'user_blocked_by_me': () => userBlocking.handleUserBlockedByMe(data.blocked_user_id),
        'user_unblocked': () => userBlocking.handleUserUnblocked(data.unblocked_by_user_id, data.unblocked_by_username),
        'user_unblocked_by_me': () => userBlocking.handleUserUnblockedByMe(data.unblocked_user_id),
      };
      
      const handler = messageHandlers[data.type];
      if (handler) {
        handler();

        const dropdown = document.getElementById('chatSwitcherDropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
          chatSwitcher.loadChatSwitcher();
        }
        return;
      }

      if (data.message && data.from && !data.type) {
        if (data.roomId && chatState.currentChatId && data.roomId === chatState.currentChatId) {
          const isMe = data.from === chatState.currentUser;
          chatMessages.addMessageToUI(data.from, data.message, isMe);
        } else {
          console.log(`Message filtered out - from room ${data.roomId}, currently viewing room ${chatState.currentChatId}`);
        }
      }
    } catch (error) {
      const messageText = event.data.toString();
      if (messageText.startsWith('You must join') || messageText.includes('error') || messageText.includes('Error')) {
        chatMessages.showErrorMessage(messageText);
        console.warn('Server message:', messageText);
      } else {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    }
  }

  closeWebSocket(): void {
    if (chatState.currentWs) {
      chatState.currentWs.close();
      chatState.setWebSocket(null);
    }
  }

  // Expose WebSocket for external access
  getCurrentWebSocket(): WebSocket | null {
    return chatState.currentWs;
  }

  isWebSocketConnected(): boolean {
    return chatState.currentWs !== null && chatState.currentWs.readyState === WebSocket.OPEN;
  }
}

export const chatWebSocket = new ChatWebSocketManager();
