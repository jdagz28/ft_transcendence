import type { ChatType } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { chatUI } from './chatUI';
import { userBlocking } from './userBlocking';
import { userModal } from './userModal';

// ============================================================================ //
// CHAT SWITCHER MANAGER                                                        //
// ============================================================================ //

export class ChatSwitcherManager {

  async loadChatSwitcher(): Promise<void> {
    const token = chatState.getAuthToken();
    if (!token) return;

    try {
      await Promise.all([
        this.loadGroupsList(token),
        this.loadDMsList(token)
      ]);
    } catch (error) {
      console.error('Error loading chat switcher:', error);
    }
  }

  private async loadGroupsList(token: string): Promise<void> {
    const groupsResponse = await fetch('/chat/mychats', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const groupsList = document.getElementById('groupsList');
    if (groupsList && groupsResponse.ok) {
      const groups = await groupsResponse.json();
      groupsList.innerHTML = '';

      groups.forEach((group: any) => {
        const isActive = chatState.currentChatType === 'group' && chatState.currentChatId === group.id;
        const groupItem = document.createElement('button');
        groupItem.className = `w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300'
        }`;
        groupItem.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
            <span class="truncate">${group.name}</span>
          </div>
        `;
        groupItem.addEventListener('click', async () => {
          await this.switchToChat(group.id, group.name, 'group');
        });
        groupsList.appendChild(groupItem);
      });
    }
  }

  private async loadDMsList(token: string): Promise<void> {
    const friendsResponse = await fetch('https://localhost:4242/users/me/friends', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const dmsList = document.getElementById('dmsList');
    if (dmsList && friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      const friends = friendsData.data || [];
      dmsList.innerHTML = '';
      
      const friendsWithBlockStatus = await Promise.all(
        friends.map(async (friend: any) => {
          const isBlockedLocal = chatState.isUserBlocked(friend.username);
          const isBlockedAPI = await userBlocking.isUserBlocked(friend.id);
          
          if (isBlockedAPI && !isBlockedLocal) {
            chatState.addBlockedUser(friend.username);
          } else if (!isBlockedAPI && isBlockedLocal) {
            chatState.removeBlockedUser(friend.username);
          }
          
          return { ...friend, isBlocked: isBlockedAPI };
        })
      );
      
      friendsWithBlockStatus.forEach((friend: any) => {
        const isActive = chatState.currentChatType === 'dm' && chatState.currentUserId === friend.id;
        const dmItem = document.createElement('button');

        const baseClasses = 'group w-full text-left px-3 py-2 rounded text-sm transition-colors';
        const blockedClasses = friend.isBlocked 
          ? 'text-gray-500 cursor-not-allowed opacity-60' 
          : 'hover:bg-gray-600';
        const activeClasses = isActive ? 'bg-blue-600 text-white' : 'text-gray-300';
        
        dmItem.className = `${baseClasses} ${blockedClasses} ${activeClasses}`;
        dmItem.innerHTML = `
          <div class="flex items-center gap-2">
            <img src="${friend.avatar}" alt="avatar" class="w-5 h-5 rounded-full flex-shrink-0 ${friend.isBlocked ? 'grayscale' : ''}">
            <span class="truncate flex-1">${friend.username}</span>
            ${friend.isBlocked ? '<span class="text-xs text-red-400">🚫</span>' : ''}
            <button class="opacity-0 group-hover:opacity-70 hover:!opacity-100 ml-auto text-gray-400 hover:text-white p-1 rounded transition-all duration-200" data-username="${friend.username}" title="User actions">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </button>
          </div>
        `;
        dmItem.addEventListener('click', async (e) => {
          if ((e.target as HTMLElement).closest('button[data-username]')) {
            return;
          }
          await this.switchToDM(friend.id, friend.username, friend.isBlocked);
        });
        
        const userActionsBtn = dmItem.querySelector('button[data-username]');
        if (userActionsBtn) {
          userActionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userModal.showUserModal(friend.username, e as MouseEvent);
          });
        }
        
        dmsList.appendChild(dmItem);
      });
    }
  }

  async switchToChat(chatId: number, chatName: string, type: ChatType): Promise<void> {
    if (chatState.currentChatId === chatId && chatState.currentChatType === type) {
      console.log('Already viewing this chat, skipping switch');
      this.hideChatSwitcher();
      return;
    }

    const token = chatState.getAuthToken();
    
    const joinResponse = await fetch('/chat/join/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ groupId: chatId }),
    });
    
    if (joinResponse.ok) {
      chatState.setCurrentChat(chatId, chatName, type, null);
      
      chatMessages.clearMessages();
      chatUI.updateChatHeader(`Chat: ${chatName}`);
      
      if (!chatState.currentUser) {
        await chatState.getCurrentUserFromAPI();
      }
      await chatMessages.loadChatHistory(chatId, type);
      
      chatUI.enableChatForm();
      
      this.hideChatSwitcher();
    }
  }

  async switchToDM(userId: number, username: string, isBlocked: boolean = false): Promise<void> {
    const token = chatState.getAuthToken();
    
    if (isBlocked) {
      await this.showBlockedDMView(userId, username);
      this.hideChatSwitcher();
      return;
    }

    const isBlockedCheck = await userBlocking.isUserBlocked(userId);
    if (isBlockedCheck) {
      chatMessages.showErrorMessage(`Cannot open chat with ${username} : user blocked.`);
      this.hideChatSwitcher();
      return;
    }
    
    try {
      const canJoinResponse = await fetch('https://localhost:4242/chat/can-join/dm', {
        method: 'POST',
        body: JSON.stringify({ userId: userId }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (canJoinResponse.ok) {
        const canJoinData = await canJoinResponse.json();
      
        if (chatState.currentChatType === 'dm' && chatState.currentChatId === canJoinData.Room) {
          console.log('Already viewing this DM, skipping switch');
          this.hideChatSwitcher();
          return;
        }
        
        chatState.setCurrentChat(canJoinData.Room, username, 'dm', userId);
        
        chatMessages.clearMessages();
        chatUI.updateChatHeader(`Chat: ${username}`);
        
        if (!chatState.currentUser) {
          await chatState.getCurrentUserFromAPI();
        }
        await chatMessages.loadChatHistory(canJoinData.Room, 'dm');
        
        chatUI.enableChatForm();
        chatUI.lobbyShowGameInvitePrompt(chatUI.maxPlayers);

        this.hideChatSwitcher();
      }
    } catch (error) {
      console.error('Error switching to DM:', error);
    }
  }

  async showBlockedDMView(userId: number, username: string): Promise<void> {
    chatState.setCurrentChat(null, username, 'dm', userId);
    
    const blockingInfo = await userBlocking.getBlockingInfo(userId);
    const currentUserIdNum = await chatState.getCurrentUserIdFromAPI();
    
    let blockMessage = "Chat is blocked";
    let titleSuffix = "(Blocked)";
    let placeholder = "Cannot send messages";
    
    if (blockingInfo && currentUserIdNum) {
      if (blockingInfo.blocker_id === currentUserIdNum) {
        blockMessage = `You have blocked ${username}`;
        titleSuffix = "(You blocked)";
        placeholder = `You have blocked ${username}`;
      } else {
        blockMessage = `You have been blocked by ${username}`;
        titleSuffix = "(Blocked you)";
        placeholder = "You cannot send messages to this user";
      }
    }
    
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML = `
        <div class="flex items-center justify-center h-full text-center p-4">
          <div class="text-gray-400">
            <div class="text-4xl mb-4">🚫</div>
            <div class="text-lg font-semibold mb-2">Chat Blocked</div>
            <div class="text-sm">${blockMessage}</div>
          </div>
        </div>
      `;
    }
    
    chatUI.updateChatHeader(`Chat: ${username} ${titleSuffix}`);
    chatUI.disableChatForm(placeholder);
  }

  toggleChatSwitcher(): void {
    const dropdown = document.getElementById('chatSwitcherDropdown');
    if (!dropdown) return;
    
    if (dropdown.classList.contains('hidden')) {
      this.loadChatSwitcher();
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  }

  hideChatSwitcher(): void {
    const dropdown = document.getElementById('chatSwitcherDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  setupEventListeners(): void {
    const chatSwitcher = document.getElementById('chatSwitcher');
    if (!chatSwitcher) return;

    chatSwitcher.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleChatSwitcher();
    });

    document.addEventListener('click', (ev) => {
      const dropdown = document.getElementById('chatSwitcherDropdown');
      if (dropdown && !dropdown.contains(ev.target as Node) && !chatSwitcher.contains(ev.target as Node)) {
        this.hideChatSwitcher();
      }
    });
  }
}

export const chatSwitcher = new ChatSwitcherManager();
