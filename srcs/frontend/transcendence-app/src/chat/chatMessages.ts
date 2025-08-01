import type { ChatMessage, ChatHistory } from './types';
import { chatState } from './chatState';
import { userModal } from './userModal';

// ============================================================================ //
// CHAT MESSAGES HANDLER                                                        //
// ============================================================================ //

export class ChatMessagesHandler {
  
  addMessageToUI(username: string, content: string, isCurrentUser: boolean): void {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (!messagesDiv) return;

    const displayName = isCurrentUser ? 'Me' : username;
    const isBlocked = !isCurrentUser && chatState.isUserBlocked(username);
    
    if (chatState.currentChatType === 'group' && isBlocked) {
      this.addBlockedMessageToUI(displayName, content);
    } else if (chatState.currentChatType === 'dm' && isBlocked) {
      return;
    } else {
      this.addNormalMessageToUI(displayName, content, isCurrentUser);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private addBlockedMessageToUI(displayName: string, content: string): void {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (!messagesDiv) return;

    const messageId = `blocked-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    messagesDiv.innerHTML += `
      <div class="mb-2 flex justify-start">
        <div id="${messageId}" class="bg-gray-800 text-gray-500 rounded-lg px-3 py-2 max-w-[60%] cursor-pointer border border-gray-600 hover:opacity-80 transition-opacity opacity-60" 
             onclick="window.toggleBlockedMessage('${messageId}')" title="Click to reveal message">
          <div class="blocked-preview">
            <span class="text-xs italic">🚫 Message from blocked user (click to reveal)</span>
          </div>
          <div class="blocked-content hidden">
            <b class="cursor-pointer hover:text-blue-400 hover:underline transition-colors duration-200" data-username="${displayName}">${displayName}:</b> ${content}
          </div>
        </div>
      </div>
    `;
    
    setTimeout(() => this.setupUsernameClickHandlers(), 0);
  }

  private addNormalMessageToUI(displayName: string, content: string, isCurrentUser: boolean): void {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (!messagesDiv) return;

    const messageClass = isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white';
    const alignClass = isCurrentUser ? 'justify-end' : 'justify-start';
    
    const usernameDisplay = isCurrentUser || displayName === 'Me' 
      ? `<b>${displayName}:</b>`
      : `<b class="cursor-pointer hover:text-blue-400 hover:underline transition-colors duration-200" data-username="${displayName}">${displayName}:</b>`;

    messagesDiv.innerHTML += `
      <div class="mb-2 flex ${alignClass}">
        <div class="${messageClass} rounded-xl px-3 py-2 max-w-[80%] break-words whitespace-pre-line">
          ${usernameDisplay} ${content}
        </div>
      </div>
    `;
    
    setTimeout(() => this.setupUsernameClickHandlers(), 0);
  }

  private setupUsernameClickHandlers(): void {
    const usernameElements = document.querySelectorAll('b[data-username]:not([data-handler-added])');
    
    usernameElements.forEach(element => {
      const username = element.getAttribute('data-username');
      if (username) {
        element.addEventListener('click', (event) => {
          userModal.showUserModal(username, event as MouseEvent);
        });
        element.setAttribute('data-handler-added', 'true');
      }
    });
  }

  toggleBlockedMessage(messageId: string): void {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const preview = messageDiv.querySelector('.blocked-preview');
    const contentDiv = messageDiv.querySelector('.blocked-content');
    
    if (preview && contentDiv) {
      if (contentDiv.classList.contains('hidden')) {
        preview.classList.add('hidden');
        contentDiv.classList.remove('hidden');
        messageDiv.classList.remove('opacity-60');
        messageDiv.classList.add('opacity-100');
        messageDiv.title = 'Click to hide message';
        messageDiv.className = messageDiv.className.replace('bg-gray-800 text-gray-500', 'bg-gray-700 text-white');
      } else {
        preview.classList.remove('hidden');
        contentDiv.classList.add('hidden');
        messageDiv.classList.remove('opacity-100');
        messageDiv.classList.add('opacity-60');
        messageDiv.title = 'Click to reveal message';
        messageDiv.className = messageDiv.className.replace('bg-gray-700 text-white', 'bg-gray-800 text-gray-500');
      }
    }
  }

  showErrorMessage(error: string): void {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML += `<div class="text-red-400 mb-2">${error}</div>`;
    }
  }

  clearMessages(): void {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML = '';
    }
  }

  async loadChatHistory(chatId: number, type: string): Promise<void> {
    const token = chatState.getAuthToken();
    const historyUrl = type === 'group' 
      ? `/chat/group/${chatId}/history`
      : `/chat/dm/${chatId}/history`;

    try {
      const res = await fetch(historyUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const history: ChatMessage[] | ChatHistory = await res.json();
      
      if (Array.isArray(history)) {
        history.forEach((msg: ChatMessage) => {
          const isMe = msg.username === chatState.currentUser;
          this.addMessageToUI(msg.username, msg.content, isMe);
        });
      } else if ((history as ChatHistory).error) {
        this.showErrorMessage((history as ChatHistory).error!);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      this.showErrorMessage('Error while displaying history.');
    }
  }

  handleMessageSubmit(): void {
    const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;

    if (!input || input.disabled || !input.value.trim() || !chatState.currentWs || !chatState.currentChatId) return;

    const message = input.value.trim();
    console.log(`scope = ${chatState.currentChatType}, room = ${chatState.currentChatId}, message = ${message}`);
    
    chatState.currentWs.send(JSON.stringify({
      action: 'send',
      scope: chatState.currentChatType,
      room: chatState.currentChatId,
      message: message
    }));

    this.addMessageToUI('Me', message, true);
    input.value = '';
  }
}

(window as any).toggleBlockedMessage = function(messageId: string) {
  const handler = new ChatMessagesHandler();
  handler.toggleBlockedMessage(messageId);
};

export const chatMessages = new ChatMessagesHandler();
