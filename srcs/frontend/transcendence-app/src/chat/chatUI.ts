import type { ChatType } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { populateNotifContainer } from '../api/notifications';
import { ROUTE_MAIN } from '../router';

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

  // ============================================================================ //
  // GAME INVITE UI                                                               //
  // ============================================================================ //

  displayGameInvite(senderId: string, gameId: string, userId: string, notifId: string): void {
    try {
      console.log('Displaying game invite in chat UI from', senderId, 'for game', gameId);

      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (!messagesDiv) {
        console.warn('Messages div not found, cannot display game invite in chat');
        return;
      }

      const inviteId = `game-invite-${gameId}-${Date.now()}`;

      messagesDiv.innerHTML += `
        <div class="mb-2 flex justify-start">
          <div class="bg-yellow-100 text-[#1a2740] rounded-lg px-3 py-2 max-w-[75%] shadow border border-yellow-300 text-sm">
            <p class="mb-3">You received a game invite</p>
            <div class="flex gap-2">
              <button id="acceptGameBtn-${inviteId}" class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Accept</button>
              <button id="declineGameBtn-${inviteId}" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Decline</button>
            </div>
          </div>
        </div>
      `;

      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      setTimeout(() => {
        this.setupGameInviteButtons(inviteId, gameId, userId, notifId);
      }, 0);

    } catch (error) {
      console.error('Error displaying game invite in chat UI:', error);
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

      fetch(`/notifications/${userId}/${notifId}`, {
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
        // setTimeout(() => {
        //   window.location.hash = `#/games/${gameId}/lobby`;
        // }, 1500);
        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-10";
        
        const box = document.createElement('div');
        box.className = "w-full max-w-md rounded-xl shadow-xl/20 bg-[#0d2551] text-white backdrop-blur-sm bg-opacity-90 p-8 space-y-6";
        
        const h = document.createElement("h1");
        h.textContent = `Remote Multiplayer:
                         Not Implemented`;
        h.className = "text-2xl font-bold text-center";

        const p = document.createElement("p");
        p.textContent = "Invitation Accepted! Game will be in creator's browser.";
        p.className = "text-center"
        box.appendChild(h);
        box.appendChild(p);

        let buttonLabel = "Return to Main Menu";
        const btn = document.createElement("button");
        btn.textContent = buttonLabel;
        btn.className = "w-full py-3 rounded-md text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-400 hover:opacity-90 transition";
        btn.onclick = () => {
          window.location.hash = ROUTE_MAIN;
          overlay.remove();
        };
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
      }

    } catch (error) {
      alert('Already responded / Game no longer available');
      window.location.reload();
      // console.error('Error responding to game invite:', error);
      // alert(`Failed to ${response} game invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const chatUI = new ChatUIManager();
