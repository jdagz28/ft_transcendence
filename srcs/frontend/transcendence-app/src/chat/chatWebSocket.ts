import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { chatSwitcher } from './chatSwitcher';
import { userBlocking } from './userBlocking';
import { chatUI } from './chatUI';

// ============================================================================ //
// CHAT WEBSOCKET MANAGER                                                       //
// ============================================================================ //

export class ChatWebSocketManager {

  async joinAllAvailableRooms(): Promise<void> {
    const token = chatState.getAuthToken();
    
    if (!chatState.currentWs || chatState.currentWs.readyState !== WebSocket.OPEN) {
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

  async joinSpecificRoom(chatId: number, type: 'group' | 'dm'): Promise<void> {
    if (!chatState.currentWs || chatState.currentWs.readyState !== WebSocket.OPEN) {
      // console.log('WebSocket not ready for joining specific room');
      return;
    }

    const token = chatState.getAuthToken();
    if (!token) return;

    try {
      if (type === 'group') {
        const joinResponse = await fetch('/chat/join/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId: chatId }),
        });
        
        if (joinResponse.ok) {
          chatState.currentWs!.send(JSON.stringify({
            action: 'join',
            scope: 'group',
            room: chatId
          }));
        }
      } else if (type === 'dm') {
        const canJoinResponse = await fetch('https://localhost:4242/chat/can-join/dm', {
          method: 'POST',
          body: JSON.stringify({ userId: chatId }),
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
            userId: chatId
          }));
        }
      }
    } catch (error) {
      console.error(`Error joining ${type} room ${chatId}:`, error);
    }
  }

  initializeWebSocket(token: string): void {
    chatState.setWebSocket(new WebSocket(`wss://${window.location.host}/chat?token=${encodeURIComponent(token)}`));

    chatState.currentWs!.onopen = async () => {
      // console.log('Chat WebSocket connected');
      await this.joinAllAvailableRooms();
    };

    chatState.currentWs!.onmessage = (event) => {
      this.handleWebSocketMessage(event);
    };

    chatState.currentWs!.onclose = (event) => {
      // console.log('Chat WebSocket closed:', event.code, event.reason);
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
    console.log('WebSocket message received:', event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.message) {
        try {
          const messageData = JSON.parse(data.message);
          if (messageData.type === 'game.invite') {
            if (messageData.roomId === chatState.currentChatId)
            {
              chatUI.displayGameInvite(
                messageData.senderId || '',
                messageData.gameId || '',
                messageData.receiverId || '',
                messageData.notifId || '',
                false,
                messageData.username || 'Unknown'
              );
            }
            return;
          }
        } catch {

        }
      }

      const messageHandlers: Record<string, Function> = {
        'user_blocked': () => userBlocking.handleUserBlocked(data.blocked_by_user_id, data.blocked_by_username),
        'user_blocked_by_me': () => userBlocking.handleUserBlockedByMe(data.blocked_user_id),
        'user_unblocked': () => userBlocking.handleUserUnblocked(data.unblocked_by_user_id, data.unblocked_by_username),
        'user_unblocked_by_me': () => userBlocking.handleUserUnblockedByMe(data.unblocked_user_id),
        // 'game.turn': () => chatUI.displayGameTurn(data.message),
        // 'chatGameCreated': () => chatUI.refreshSidebarChat(data.roomId),
        'friend_request_accepted': async () => {
          await this.joinAllAvailableRooms();
        },
        'game.invite': () => chatUI.displayGameInvite(data.senderId, data.gameId, data.receiverId, data.notifId),
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
        
        }
      }
    } catch (error) {
      const messageText = event.data.toString();
      if (messageText.startsWith('You must join') || messageText.includes('error') || messageText.includes('Error')) {
        chatMessages.showErrorMessage(messageText);
      } else {
        
      }
    }
  }

  closeWebSocket(): void {
    if (chatState.currentWs) {
      chatState.currentWs.close();
      chatState.setWebSocket(null);
    }
  }

  getCurrentWebSocket(): WebSocket | null {
    return chatState.currentWs;
  }

  isWebSocketConnected(): boolean {
    return chatState.currentWs !== null && chatState.currentWs.readyState === WebSocket.OPEN;
  }

  sendMessage(scope: 'group' | 'dm', room: number, message: any): boolean {
    if (this.isWebSocketConnected() && chatState.currentWs) {
      chatState.currentWs.send(JSON.stringify({
        action: 'send',
        scope,
        room,
        message
      }));
      
      if (room === chatState.currentChatId)
      {
        try {
          if (JSON.stringify(message).includes('game.invite')) {
            chatUI.displayGameInviteResponded(true, 'Me');
            return true;
          }
        } catch (error) {

        }
      }
      
      return true;
    }
    console.warn('Cannot send message: WebSocket not connected');
    return false;
  }
}

export const chatWebSocket = new ChatWebSocketManager();
