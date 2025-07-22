import type { ChatType } from './types';
import { chatState } from './chatState';
import { chatMessages } from './chatMessages';

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

  enableChatForm(): void {
    const chatForm = document.getElementById('sidebar-chat-form');
    if (chatForm) {
      const input = chatForm.querySelector('#sidebar-chat-input') as HTMLInputElement;
      const button = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (input && button) {
        input.disabled = false;
        input.placeholder = "Message...";
        input.classList.remove('opacity-50', 'cursor-not-allowed');
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  disableChatForm(message: string = "You cannot send messages"): void {
    const chatForm = document.getElementById('sidebar-chat-form');
    if (chatForm) {
      const input = chatForm.querySelector('#sidebar-chat-input') as HTMLInputElement;
      const button = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (input && button) {
        input.disabled = true;
        input.placeholder = message;
        input.classList.add('opacity-50', 'cursor-not-allowed');
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
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
}

export const chatUI = new ChatUIManager();
