import type { ChatType } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { populateNotifContainer } from '../api/notifications';

// ============================================================================ //
// CHAT UI MANAGER                                                              //
// ============================================================================ //

export class ChatUIManager {

  renderPermanentMiniButton(): void {
    const sidebar = document.getElementById('sidebar-chat');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <button id="openSidebarChatMini"
        class="fixed bottom-8 right-8 z-50 bg-[#1a2740] text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-3xl hover:bg-[#22325a] transition-colors"
        title="Ouvrir le chat">
        💬
      </button>
    `;
    
    const miniButton = document.getElementById('openSidebarChatMini');
    if (miniButton) {
      miniButton.addEventListener('click', async () => {
        if (chatState.currentChatId && chatState.currentChatName && chatState.currentChatType) {
          await this.openSidebarChat(chatState.currentChatId, chatState.currentChatName, chatState.currentChatType, chatState.currentUserId);
        } else {
          await this.openDefaultMainGroup();
        }
      });
    }
  }

  renderSidebarUI(chatName: string): void {
    const sidebar = document.getElementById('sidebar-chat');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="
        fixed bottom-4 right-4 z-50
        w-[90vw] max-w-[320px] md:w-[320px] md:max-w-[350px]
        min-h-[400px] max-h-[40vh]
        bg-[#1a2740] shadow-2xl rounded-xl flex flex-col border border-gray-700
      ">
        <div class="px-4 py-2 border-b border-gray-700 flex justify-between items-center rounded-t-xl">
          <div class="relative flex-1">
            <button id="chatSwitcher" class="flex items-center gap-2 text-lg font-bold text-white hover:text-gray-300 transition-colors max-w-[200px]">
              <span class="truncate">Chat: ${chatName}</span>
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div id="chatSwitcherDropdown" class="absolute top-full left-0 mt-1 bg-[#1a2740] border border-gray-600 rounded-lg shadow-xl z-50 min-w-[250px] max-w-[280px] max-h-[60vh] overflow-y-auto hidden">
              <div class="p-2">
                <div class="text-xs font-semibold text-gray-400 mb-2 px-2">GROUPS</div>
                <div id="groupsList" class="space-y-1 max-h-[25vh] overflow-y-auto"></div>
                <div class="text-xs font-semibold text-gray-400 mb-2 mt-4 px-2">Private Messages</div>
                <div id="dmsList" class="space-y-1 max-h-[25vh] overflow-y-auto"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-2">
            <button id="chatMenuBtn" class="text-white text-xl hover:text-gray-400 px-2" title="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="5" cy="12" r="2" fill="currentColor"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <circle cx="19" cy="12" r="2" fill="currentColor"/>
              </svg>
            </button>
            <button id="closeSidebarChat" class="text-white text-xl hover:text-red-400">✖</button>
          </div>
        </div>
        <div id="sidebar-chat-messages" class="flex-1 overflow-y-auto px-4 py-2"></div>
        <form id="sidebar-chat-form" class="px-4 py-2 flex gap-2 border-t border-gray-700">
          <input type="text" id="sidebar-chat-input" class="flex-1 rounded p-2 bg-[#f8f8e7] text-[#11294d] placeholder-gray-500" placeholder="Message..." />
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded transition-colors">Send</button>
        </form>
      </div>
    `;
  }

  async openSidebarChat(chatId: number, chatName: string, type: ChatType = 'group', userId: number | null = null): Promise<void> {
    const sidebar = document.getElementById('sidebar-chat');
    if (!sidebar) return;
    
    chatState.setCurrentChat(chatId, chatName, type, userId);
    
    if (!chatState.currentUser) {
      await chatState.getCurrentUserFromAPI();
    }
    
    this.renderSidebarUI(chatName);
    await chatMessages.loadChatHistory(chatId, type);
    this.setupEventListeners();
  }

  async openDefaultMainGroup(): Promise<void> {
    const token = chatState.getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/chat/mychats', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.warn('Could not fetch groups for default chat');
        return;
      }
      
      const groups = await response.json();
      const mainGroup = groups.find((group: any) => group.name.toLowerCase() === 'main');
      
      if (mainGroup) {
        const joinResponse = await fetch('/chat/join/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId: mainGroup.id }),
        });
        
        if (joinResponse.ok) {
          await this.openSidebarChat(mainGroup.id, mainGroup.name, 'group');
        }
      } else if (groups.length > 0) {
        const firstGroup = groups[0];
        const joinResponse = await fetch('/chat/join/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId: firstGroup.id }),
        });
        
        if (joinResponse.ok) {
          await this.openSidebarChat(firstGroup.id, firstGroup.name, 'group');
        }
      }
    } catch (error) {
      console.error('Error opening default main group:', error);
    }
  }

  private setupEventListeners(): void {
    this.setupChatForm();
    this.setupCloseButton();
    this.setupChatSwitcher();
    this.setupChatMenu();
    this.setupOutsideClickHandler();
  }

  private setupChatForm(): void {
    const form = document.getElementById('sidebar-chat-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      chatMessages.handleMessageSubmit();
    });
  }

  private setupCloseButton(): void {
    const closeButton = document.getElementById('closeSidebarChat');
    if (!closeButton) return;

    closeButton.addEventListener('click', () => {
      this.renderPermanentMiniButton();
    });
  }

  private setupChatSwitcher(): void {
    const chatSwitcher = document.getElementById('chatSwitcher');
    if (!chatSwitcher) return;

    chatSwitcher.addEventListener('click', async () => {
      console.log('Chat switcher button clicked from chatUI!');
      const { chatSwitcher: chatSwitcherModule } = await import('./chatSwitcher');
      await chatSwitcherModule.toggleChatSwitcher();
    });
  }

  private setupChatMenu(): void {
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    if (!chatMenuBtn) return;

    chatMenuBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (chatState.currentChatType !== 'dm' || !chatState.currentUserId) {
        console.log('Chat menu only available for DM chats');
        return;
      }

      const existingMenu = document.getElementById('chatUserMenu');
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      try {
        const { userBlocking } = await import('./userBlocking');
        const isBlocked = await userBlocking.isUserBlocked(chatState.currentUserId);
        
        const menu = document.createElement('div');
        menu.id = 'chatUserMenu';
        menu.className = 'absolute top-full right-0 mt-1 bg-[#1a2740] border border-gray-600 rounded-lg shadow-xl z-50 min-w-[120px]';
        menu.innerHTML = `
          <div class="p-2">
            <button id="toggleBlockUser" class="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#22325a] rounded transition-colors">
              ${isBlocked ? 'Unblock User' : 'Block User'}
            </button>
          </div>
        `;

        const menuContainer = chatMenuBtn.parentElement;
        if (menuContainer) {
          menuContainer.style.position = 'relative';
          menuContainer.appendChild(menu);
        }

        const toggleBlockBtn = menu.querySelector('#toggleBlockUser');
        if (toggleBlockBtn) {
          toggleBlockBtn.addEventListener('click', async () => {
            const userId = chatState.currentUserId;
            if (!userId) return;

            try {
              let success;
              if (isBlocked) {
                success = await userBlocking.unblockUser(userId);
              } else {
                success = await userBlocking.blockUser(userId);
              }

              if (success) {
                console.log(`User ${isBlocked ? 'unblocked' : 'blocked'} successfully`);
              }
            } catch (error) {
              console.error('Error toggling user block status:', error);
            }

            menu.remove();
          });
        }

        const handleOutsideClick = (event: Event) => {
          if (!menu.contains(event.target as Node) && !chatMenuBtn.contains(event.target as Node)) {
            menu.remove();
            document.removeEventListener('click', handleOutsideClick);
          }
        };
        
        setTimeout(() => {
          document.addEventListener('click', handleOutsideClick);
        }, 0);

      } catch (error) {
        console.error('Error setting up chat menu:', error);
      }
    });
  }

  private setupOutsideClickHandler(): void {
    document.removeEventListener('click', this.handleOutsideClick);
    document.addEventListener('click', this.handleOutsideClick);
  }

  private handleOutsideClick = (e: Event): void => {
    const dropdown = document.getElementById('chatSwitcherDropdown');
    const switcher = document.getElementById('chatSwitcher');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!switcher?.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        import('./chatSwitcher').then(({ chatSwitcher }) => {
          chatSwitcher.hideChatSwitcher();
        });
      }
    }
  };

  enableChatForm(): void {
    const chatForm = document.getElementById('sidebar-chat-form') as HTMLFormElement;
    if (chatForm) {
      chatForm.style.display = 'flex';
      const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;
      const button = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (input && button) {
        input.disabled = false;
        input.placeholder = "Message...";
        button.disabled = false;
        button.style.opacity = '1';
      }
    }
  }

  disableChatForm(message: string = "You cannot send messages"): void {
    const chatForm = document.getElementById('sidebar-chat-form') as HTMLFormElement;
    if (chatForm) {
      chatForm.style.display = 'flex';
      const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;
      const button = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (input && button) {
        input.disabled = true;
        input.placeholder = message;
        input.value = '';
        button.disabled = true;
        button.style.opacity = '0.5';
      }
    }
  }

  updateChatHeader(title: string): void {
    const chatSwitcher = document.getElementById('chatSwitcher');
    if (chatSwitcher) {
      const titleSpan = chatSwitcher.querySelector('span');
      if (titleSpan) {
        titleSpan.textContent = title;
      }
    }
  }

  cleanup(): void {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  private setupUsernameClickHandlers(): void {
    const usernameElements = document.querySelectorAll('b[data-username]');
    
    usernameElements.forEach(element => {
      const username = element.getAttribute('data-username');
      if (username) {
        element.removeAttribute('data-handler-added');
        
        const newElement = element.cloneNode(true) as HTMLElement;
        element.parentNode?.replaceChild(newElement, element);
        
        newElement.addEventListener('click', async (event) => {
          const { userModal } = await import('./userModal');
          userModal.showUserModal(username, event as MouseEvent);
        });
        newElement.setAttribute('data-handler-added', 'true');
      }
    });
  }

  // ============================================================================ //
  // GAME INVITE UI                                                               //
  // ============================================================================ //

  displayGameInvite(senderId: string, gameId: string, userId: string, notifId: string, isMe: boolean = false, senderUsername?: string): void {
    try {
      console.log('Displaying game invite in chat UI from', senderId, 'for game', gameId);

      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (!messagesDiv) {
        return;
      }

      const inviteId = `game-invite-${gameId}-${Date.now()}`;
      const alignClass = isMe ? 'justify-end' : 'justify-start';
      const bgColor = isMe ? 'bg-blue-100 text-[#1a2740]' : 'bg-yellow-100 text-[#1a2740]';
      const borderColor = isMe ? 'border-blue-300' : 'border-yellow-300';
      const inviteText = isMe ? 'You sent a game invite' : 'You received a game invite';
      
      const displayName = isMe ? 'Me' : (senderUsername || 'Unknown');
      const usernameDisplay = isMe || displayName === 'Me' 
        ? `<b>${displayName}:</b>`
        : `<b class="cursor-pointer hover:text-blue-400 hover:underline transition-colors duration-200" data-username="${displayName}">${displayName}:</b>`;

      messagesDiv.innerHTML += `
        <div class="mb-2 flex ${alignClass}">
          <div class="max-w-[75%]">
            <div class="mb-1 ${isMe ? 'text-right' : 'text-left'}">
              <span class="text-xs text-gray-400">${usernameDisplay}</span>
            </div>
            <div class="${bgColor} rounded-lg px-3 py-2 shadow border ${borderColor} text-sm">
              <p class="mb-3">${inviteText}</p>
              <div class="flex gap-2">
                <button id="acceptGameBtn-${inviteId}" class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Accept</button>
                <button id="declineGameBtn-${inviteId}" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Decline</button>
              </div>
            </div>
          </div>
        </div>
      `;

      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      setTimeout(() => {
        this.setupGameInviteButtons(inviteId, gameId, userId, notifId);
        this.setupUsernameClickHandlers();
      }, 0);

    } catch (error) {
      console.error('Error displaying game invite in chat UI:', error);
    }
  }

  displayGameInviteResponded(isMe: boolean = false, senderUsername?: string): void {
    try {
      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (!messagesDiv) {
        return;
      }

      const alignClass = isMe ? 'justify-end' : 'justify-start';
      const inviteText = isMe ? 'You sent a game invite' : 'Invite To Play';
      const statusText = isMe ? 'Invitation sent.' : 'Invitation responded.';

      const displayName = isMe ? 'Me' : (senderUsername || 'Unknown');
      const usernameDisplay = isMe || displayName === 'Me' 
        ? `<b>${displayName}:</b>`
        : `<b class="cursor-pointer hover:text-blue-400 hover:underline transition-colors duration-200" data-username="${displayName}">${displayName}:</b>`;

      messagesDiv.innerHTML += `
        <div class="mb-2 flex ${alignClass}">
          <div class="max-w-[75%]">
            <div class="mb-1 ${isMe ? 'text-right' : 'text-left'}">
              <span class="text-xs text-gray-400">${usernameDisplay}</span>
            </div>
            <div class="bg-gray-200 text-gray-600 rounded-lg px-3 py-2 shadow border border-gray-300 text-sm opacity-70 cursor-not-allowed">
              <p class="mb-2 font-medium">${inviteText}</p>
              <p class="mb-2 italic">${statusText}</p>
            </div>
          </div>
        </div>
      `;

      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      setTimeout(() => {
        this.setupUsernameClickHandlers();
      }, 0);

    } catch (error) {
      console.error('Error displaying responded game invite:', error);
    }
  }

  async checkNotificationStatus(userId: string, notifId: string): Promise<boolean> {
    try {
      const token = chatState.getAuthToken();
      const response = await fetch(`https://localhost:4242/notifications/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('Could not fetch notification status');
        return false;
      }

      const data = await response.json();
      
      const notification = data.notifications?.find((notif: any) => {
        return notif.id.toString() === notifId.toString();
      });
      
      return notification ? notification.is_read === "read" : false;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  private setupGameInviteButtons(inviteId: string, gameId: string, userId: string, notifId: string): void {
    const acceptBtn = document.getElementById(`acceptGameBtn-${inviteId}`);
    const declineBtn = document.getElementById(`declineGameBtn-${inviteId}`);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        this.respondToGameInvite(gameId, 'accept', inviteId, userId, notifId);
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        this.respondToGameInvite(gameId, 'decline', inviteId, userId, notifId);
      });
    }
  }

  private async respondToGameInvite(gameId: string, response: 'accept' | 'decline', inviteId: string, userId: string, notifId: string): Promise<void> {
    try {
      const token = chatState.getAuthToken();
      
      const apiResponse = await fetch('https://localhost:4242/games/invites/respond', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          gameId: parseInt(gameId),
          response: response
        })
      });

      await fetch(`/notifications/${userId}/${notifId}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			})

      const notifContainer = document.getElementById('notifContainer');
      if (notifContainer) {
        console.log('Clearing notification container');
        notifContainer.innerHTML = '';
        populateNotifContainer(notifContainer as HTMLElement, parseInt(userId));
      }


      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Error responding to game invite: ${apiResponse.status}`);
      }

      const acceptBtn = document.getElementById(`acceptGameBtn-${inviteId}`);
      const declineBtn = document.getElementById(`declineGameBtn-${inviteId}`);
      
      if (acceptBtn && declineBtn) {
        const container = acceptBtn.parentElement;
        if (container) {
          const responseText = response === 'accept' ? 'Invitation accepted!' : 'Invitation declined.';
          const textColor = response === 'accept' ? 'text-green-700' : 'text-red-700';
          container.innerHTML = `<p class="${textColor} font-medium">${responseText}</p>`;
        }
      }

      console.log(`Game invite ${response}ed for game ${gameId}`);
      
      if (response === 'accept') {
        setTimeout(() => {
          window.location.hash = `#/games/${gameId}/lobby`;
        }, 1500);
      }

    } catch (error) {
      console.error('Error responding to game invite:', error);
      alert(`Failed to ${response} game invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const chatUI = new ChatUIManager();
