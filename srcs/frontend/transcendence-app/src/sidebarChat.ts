import { clearBlockedUsersCache } from './chat';
import { chatState } from './chat/chatState';
import { chatUI } from './chat/chatUI';
import { chatMessages } from './chat/chatMessages';
import { chatWebSocket } from './chat/chatWebSocket';
import { chatSwitcher } from './chat/chatSwitcher';
import { userBlocking } from './chat/userBlocking';
import type { ChatType } from './chat/types';

// ============================================================================ //
// MAIN INITIALIZATION                                                          //
// ============================================================================ //

export async function initializePermanentChat(): Promise<void> {
  if (chatState.isInitialized) return;
  
  const currentUser = await chatState.getCurrentUserFromAPI();
  if (!currentUser) {
    console.warn('Cannot initialize chat: user not authenticated');
    return;
  }
  
  const token = chatState.getAuthToken();
  if (!token) {
    console.warn('Cannot initialize chat: no authentication token');
    return;
  }
  
  // Load blocked users
  await userBlocking.loadBlockedUsers();

  // Initialize WebSocket if not connected
  if (!chatWebSocket.isWebSocketConnected()) {
    await chatWebSocket.initializeWebSocket(token);
  }
  
  // Render mini button
  renderPermanentMiniButton();
  chatState.setInitialized(true);
}

// ============================================================================ //
// CLEANUP & WEBSOCKET MANAGEMENT                                               //   
// ============================================================================ //

export function disconnectPermanentChat(): void {
  console.log("Disconnecting permanent chat");
  chatWebSocket.closeWebSocket();
  chatState.reset();
  
  const sidebar = document.getElementById('sidebar-chat');
  if (sidebar) {
    sidebar.innerHTML = '';
  }
  
  clearBlockedUsersCache();
}

// ============================================================================ //
// UI RENDERING                                                                 //
// ============================================================================ //

function renderPermanentMiniButton(): void {
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
        openSidebarChat(chatState.currentChatId, chatState.currentChatName, chatState.currentChatType, chatState.currentUserId);
      } else {
        await openDefaultMainGroup();
      }
    });
  }
}

// ============================================================================ //
// DEFAULT CHAT NAVIGATION                                                      //
// ============================================================================ //

export async function openDefaultMainGroup(): Promise<void> {
  await chatUI.openDefaultMainGroup();
}

// ============================================================================ //
// MAIN CHAT OPENING FUNCTION                                                   //
// ============================================================================ //

export async function openSidebarChat(
  chatId: number, 
  chatName: string, 
  type: ChatType = 'group', 
  userId: number | null = null
): Promise<void> {
  const sidebar = document.getElementById('sidebar-chat');
  if (!sidebar) return;

  await chatWebSocket.joinSpecificRoom(chatId, type);
  
  // Update chat state
  chatState.setCurrentChat(chatId, chatName, type, userId);
  
  // Render the sidebar UI
  chatUI.renderSidebarUI(chatName);
  
  // Load chat history
  await chatMessages.loadChatHistory(chatId, type);

  // Setup event listeners
  setupEventListeners();
}

// ============================================================================ //
// EVENT LISTENERS SETUP                                                        //
// ============================================================================ //

function setupEventListeners(): void {
  // Close button
  const closeButton = document.getElementById('closeSidebarChat');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      renderPermanentMiniButton();
    });
  }

  // Chat form submission
  const chatForm = document.getElementById('sidebar-chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;
      if (input && input.value.trim()) {
        chatMessages.handleMessageSubmit();
      }
    });
  }

  // Chat switcher button
  const chatSwitcherButton = document.getElementById('chatSwitcher');
  if (chatSwitcherButton) {
    chatSwitcherButton.addEventListener('click', async () => {
      await chatSwitcher.toggleChatSwitcher();
    });
  }

  // Chat menu button
  const chatMenuBtn = document.getElementById('chatMenuBtn');
  if (chatMenuBtn) {
    chatMenuBtn.addEventListener('click', async () => {
      if (chatState.currentChatType === 'dm' && chatState.currentUserId) {
        await showUserActions(chatState.currentUserId, chatState.currentChatName);
      }
    });
  }

  // Click outside to close dropdown
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('chatSwitcherDropdown');
    const switcher = document.getElementById('chatSwitcher');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!switcher?.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        chatSwitcher.hideChatSwitcher();
      }
    }
  });
}

// ============================================================================ //
// USER ACTIONS MENU                                                           //
// ============================================================================ //

async function showUserActions(userId: number, username: string): Promise<void> {
  const isBlocked = await userBlocking.isUserBlocked(userId);
  const actionText = isBlocked ? 'Unblock User' : 'Block User';
  
  if (confirm(`${actionText} ${username}?`)) {
    let success = false;
    if (isBlocked) {
      success = await userBlocking.unblockUser(userId);
    } else {
      success = await userBlocking.blockUser(userId);
    }
    
    if (success) {
      console.log(`${isBlocked ? 'Unblocked' : 'Blocked'} user ${username}`);
      // Refresh the UI
      if (chatState.currentChatType === 'dm' && chatState.currentUserId === userId) {
        // Reload the current chat to reflect the new blocking state
        await openSidebarChat(chatState.currentChatId || 0, chatState.currentChatName, chatState.currentChatType, userId);
      }
    } else {
      console.error(`Failed to ${isBlocked ? 'unblock' : 'block'} user ${username}`);
    }
  }
}

// ============================================================================ //
// WEBSOCKET EXPORTS                                                            //
// ============================================================================ //

export function getCurrentWebSocket(): WebSocket | null {
  return chatState.currentWs;
}

export function isWebSocketConnected(): boolean {
  return chatWebSocket.isWebSocketConnected();
}
