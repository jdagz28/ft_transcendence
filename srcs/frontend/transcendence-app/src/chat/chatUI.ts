import type { ChatType } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';
import { populateNotifContainer } from '../api/notifications';
import { ROUTE_MAIN } from '../router';
import { chatWebSocket } from './chatWebSocket';
import { whoAmI } from '../setUpLayout';
import { isGamePending } from '../api/game';
import { refreshSidebarChat } from '../sidebarChat';

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

    this.lobbyShowGameInvitePrompt(this.maxPlayers);
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
      const { chatSwitcher: chatSwitcherModule } = await import('./chatSwitcher');
      await chatSwitcherModule.toggleChatSwitcher();
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

  private renderGameInvitePrompt(gameId: string): void {
    const form = document.getElementById('sidebar-chat-form') as HTMLFormElement;
    if (!form) return;

    const inviteeName = chatState.currentChatName;
    form.innerHTML = `
      <div class="w-full bg-[#1e2d4b] p-3 rounded-lg text-white text-center">
        <p class="text-sm text-gray-300 mb-2">Invite ${inviteeName} to your game?</p>
        <button id="send-chat-game-invite" 
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
          Send
        </button>
        <button id="cancel-chat-game-invite"
                class="w-full text-gray-400 hover:text-white text-xs py-1 mt-2">
            Cancel
        </button>
      </div>
    `;

    this.setupGameInvitePromptListeners(gameId);
  }

  private setupGameInvitePromptListeners(gameId: string): void {
    const sendBtn = document.getElementById('send-chat-game-invite');
    const cancelBtn = document.getElementById('cancel-chat-game-invite');

    sendBtn?.addEventListener('click', async () => {
      if (!chatState.currentWs || chatState.currentChatType !== 'dm') {
        alert("Error: Can only send invites in a DM chat.");
        return;
      }

      if (this.invitesSentCount >= this.maxPlayers - 1) {
        alert(`You have already sent the max invites to ${this.invitesSentCount} players. `);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`/games/${gameId}/options`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const gameSettings = await response.json();

        let inviteRes;
        let smallestSlot = 2;
        if (gameSettings.mode === "multiplayer" && gameSettings.max_players == 2) {
          inviteRes = await fetch(`/games/${gameId}/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
              username: chatState.currentChatName,
              slot: "user2"
            })
          });
        } else if (gameSettings.mode === "multiplayer" && gameSettings.max_players == 4) {
          for (let i = 2; i <= 4; i++) {
            const slot = localStorage.getItem(`invite_slot_user${i}`);
            if (!slot) {
              smallestSlot = i;
              break;
            }
          }

          inviteRes = await fetch(`/games/${gameId}/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({
              username: chatState.currentChatName,
              slot: `user${smallestSlot}`
            })
          });
        }
        if (!inviteRes) {
          alert("Error: Could not send game invite. Please try again.");
          this.restoreDefaultChatForm();
          return;
        }
        if (inviteRes.ok) {
          localStorage.setItem(`invite_slot_user${smallestSlot}`, 'true');
          this.invitesSentCount++;
          this.updateInviteUIState();

          const res = await inviteRes.json();
          const message = JSON.stringify({
            type: "game.invite",
            senderId: res.senderId,
            receiverId: res.receiverId,
            notifId: res.notifId,
            gameId: res.gameId,
            username: localStorage.getItem("userName"),
            roomId: res.roomId
          });
          chatWebSocket.sendMessage("dm", res.roomId, message);
        }
      }

      this.restoreDefaultChatForm();
    });

    cancelBtn?.addEventListener('click', () => {
      this.restoreDefaultChatForm();
    });
  }

  private restoreDefaultChatForm(): void {
    const form = document.getElementById('sidebar-chat-form');
    if (!form) return;

    form.innerHTML = `
      <input type="text" id="sidebar-chat-input" class="flex-1 rounded p-2 bg-[#f8f8e7] text-[#11294d] placeholder-gray-500" placeholder="Message..." />
      <button type="submit" class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded transition-colors">Send</button>
    `;
    this.setupChatForm();
  }
  
  public maxPlayers = 0;
  private invitesSentCount = 0;

  public lobbyShowGameInvitePrompt(max_players: number): void {
    this.maxPlayers = max_players;
    this.invitesSentCount = 0;

    for (let i = 2; i <= 4; i++) {
      if (localStorage.getItem(`invite_slot_user${i}`)) {
        this.invitesSentCount++;
      }
    }

    const chatForm = document.getElementById('sidebar-chat-form');
    if (!chatForm) return;

    const gameId = localStorage.getItem('gameId');

    if (gameId && chatState.currentChatType === 'dm') {
      if (this.invitesSentCount < this.maxPlayers - 1) {
        this.renderGameInvitePrompt(gameId);
      } else {
        this.restoreDefaultChatForm();
      }
    }
    this.updateInviteUIState();
  }

  private updateInviteUIState(): void {
    const sendBtn = document.getElementById('send-chat-game-invite') as HTMLButtonElement;
    if (!sendBtn) return;

    if (this.invitesSentCount >= (this.maxPlayers - 1)) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Max Invites Sent";
      sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
      sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  public updateInvitesCountOnSlotChange(): void {
    this.invitesSentCount = 0;
    for (let i = 2; i <= this.maxPlayers; i++) {
      if (localStorage.getItem(`invite_slot_user${i}`) === 'true') {
        this.invitesSentCount++;
      }
    }
    this.updateInviteUIState();
  }


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

  async displayGameInvite(senderId: string, gameId: string, userId: string, notifId: string, isMe: boolean = false, senderUsername?: string): Promise<void> {
    try {

      const isPending = await isGamePending(Number(gameId));
      if (!isPending) {
        return;
      }


      const currentUser = await whoAmI();
      if (!currentUser.success) {
        return;
      }
      let isSender = false;
      if (currentUser) {
        isSender = currentUser.data.id === Number(senderId);
      }

      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (!messagesDiv) {
        return;
      }

      const inviteId = `game-invite-${gameId}-${Date.now()}`;
      const alignClass = isMe ? 'justify-end' : 'justify-start';
      const bgColor = 'bg-blue-100 text-[#1a2740]';
const borderColor = 'border-blue-300';
      const inviteText = isMe ? 'You sent a game invite' : 'You received a game invite';
      
      const displayName = isMe ? 'Me' : (senderUsername || 'Unknown');
      const usernameDisplay = isMe || displayName === 'Me' 
        ? `<b>${displayName}:</b>`
        : `<b class="cursor-pointer hover:text-blue-400 hover:underline transition-colors duration-200" data-username="${displayName}">${displayName}:</b>`;

      messagesDiv.innerHTML += `
        <div class="mb-2 flex ${alignClass}">
          <div class="max-w-[75%]">
            <div class="mb-1 ${isSender ? 'text-right' : 'text-left'}">
              <span class="text-xs text-gray-400">${usernameDisplay}</span>
            </div>
            <div class="${bgColor} rounded-lg px-3 py-2 shadow border ${borderColor} text-sm">
              <p class="mb-3">${inviteText}</p>
              <div class="flex gap-2">
                ${!isSender ? `
                  <button id="acceptGameBtn-${inviteId}" class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Accept</button>
                  <button id="declineGameBtn-${inviteId}" class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Decline</button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      if (!isSender) {
        setTimeout(() => {
          this.setupGameInviteButtons(inviteId, gameId, userId, notifId);
          this.setupUsernameClickHandlers();
        }, 0);
      } else {
        setTimeout(() => {
          this.setupUsernameClickHandlers();
        }, 0);
      }

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

  public async gameInviteFromNotif(response: 'accept' | 'decline', inviteId: string, userId: string, notifId: string): Promise<void> {
    try {
      void(notifId);
      const notifContainer = document.getElementById('notifContainer');
      if (notifContainer) {
        notifContainer.innerHTML = '';
        populateNotifContainer(notifContainer as HTMLElement, parseInt(userId));
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
      console.error('Error handling game invite from notification:', error);
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
      if (error instanceof Error) {
        alert(`Failed to ${response} game invitation`);
      } 
      window.location.reload();
      // console.error('Error responding to game invite:', error);
      // alert(`Failed to ${response} game invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async displayGameTurn(): Promise<void> {
    await refreshSidebarChat();
  }

  async displayGameChat(): Promise<void> {
    try {
      const { refreshChatLists } = await import('../chat');
      refreshChatLists();
      chatWebSocket.joinAllAvailableRooms();
    } catch (err) {
      console.error('Error refreshing chat lists:', err);
    }
  }

  async refreshChats(): Promise<void> {
    await refreshSidebarChat();
    try {
      const { refreshChatLists } = await import('../chat');
      refreshChatLists();
      chatWebSocket.joinAllAvailableRooms();
    } catch (err) {
      console.error('Error refreshing chat lists:', err);
    }
  }
  
}

export const chatUI = new ChatUIManager();
