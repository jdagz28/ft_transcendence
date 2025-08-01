import { clearBlockedUsersCache } from './chat';
import { chatState } from './chat/chatState';
import { chatUI } from './chat/chatUI';
import { chatWebSocket } from './chat/chatWebSocket';
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

  await userBlocking.loadBlockedUsers();

  if (!chatWebSocket.isWebSocketConnected()) {
    await chatWebSocket.initializeWebSocket(token);
  }

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

  chatUI.cleanup();
  
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
  await chatWebSocket.joinSpecificRoom(chatId, type);

  await chatUI.openSidebarChat(chatId, chatName, type, userId);
}

// ============================================================================ //
// USER ACTIONS MENU                                                           //
// ============================================================================ //

export async function showUserActions(userId: number, username: string): Promise<void> {
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
      if (chatState.currentChatType === 'dm' && chatState.currentUserId === userId) {
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

// ============================================================================ //
// REFRESH FUNCTIONALITY                                                       //
// ============================================================================ //

export async function refreshSidebarChat(): Promise<void> {
  const messagesDiv = document.getElementById('sidebar-chat-messages');
  if (!messagesDiv) {
    return;
  }

  if (!chatState.currentChatId || !chatState.currentChatType) {
    return;
  }

  try {
    
    await openSidebarChat(
      chatState.currentChatId,
      chatState.currentChatName,
      chatState.currentChatType,
      chatState.currentUserId
    );
    
  } catch (error) {
    console.error('Error refreshing sidebar chat:', error);
  }
}
