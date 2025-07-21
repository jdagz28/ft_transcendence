import { clearBlockedUsersCache, refreshDMsList } from './chat';

// ============================================================================ //
// TYPES & INTERFACES                                                           //
// ============================================================================ //

type ChatType = 'group' | 'dm';

interface ChatMessage {
  username: string;
  content: string;
  from?: string;
  message?: string;
}

interface ChatHistory {
  error?: string;
}

interface BlockedUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  blocked_at: string;
}

interface BlockedUsersResponse {
  success: boolean;
  blocker_id: number;
  blocked_count: number;
  blocked_users: BlockedUser[];
}

interface IsBlockedResponse {
  isBlocked: boolean;
  blocker_id: number;
  blocked_user_id?: number;
  target_id?: number;
  blocked_at?: string;
  block_id?: number;
}

// ============================================================================ //
// GLOBAL STATE                                                                 //
// ============================================================================ //

let currentWs: WebSocket | null = null;
let currentChatId: number | null = null;
let currentChatName: string = '';
let currentChatType: ChatType = 'group';
let currentUserId: number | null = null;
let currentUser: string = '';
let isInitialized: boolean = false;
let blockedUsernames: Set<string> = new Set();

// ============================================================================ //
// AUTHENTICATION HELPERS                                                       //
// ============================================================================ //

function getAuthToken(): string {
  return localStorage.getItem('token') || '';
}

async function getCurrentUser(): Promise<string> {
  const token = getAuthToken();
  try {
    const res = await fetch('/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      return user.username;
    }
  } catch (error) {
    console.warn('Failed to fetch current user:', error);
  }
  return '';
}

async function getCurrentUserId(): Promise<number | null> {
  const token = getAuthToken();
  try {
    const res = await fetch('/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      return user.id;
    }
  } catch (error) {
    console.warn('Failed to fetch current user ID:', error);
  }
  return null;
}

// ============================================================================ //
// MAIN INITIALIZATION                                                          //
// ============================================================================ //

export async function initializePermanentChat(): Promise<void> {
  if (isInitialized) return;
  
  currentUser = await getCurrentUser();
  if (!currentUser) {
    console.warn('Cannot initialize chat: user not authenticated');
    return;
  }
  
  const token = getAuthToken();
  if (!token) {
    console.warn('Cannot initialize chat: no authentication token');
    return;
  }
  
  await loadBlockedUsers();

  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
    initializeWebSocket(token);
  }
  
  renderPermanentMiniButton();
  isInitialized = true;
}

// ============================================================================ //
// DEFAULT CHAT NAVIGATION                                                      //
// ============================================================================ //

async function openDefaultMainGroup(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch('/chat/mychats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      console.warn('Could not fetch groups for default chat');
      return;
    }
    
    const groups = await response.json();
    
    const mainGroup = groups.find((group: any) => 
      group.name.toLowerCase() === 'main'
    );
    
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
        openSidebarChat(mainGroup.id, mainGroup.name, 'group');
      } else {
        console.warn('Could not join main group');
      }
    } else {
      if (groups.length > 0) {
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
          openSidebarChat(firstGroup.id, firstGroup.name, 'group');
        }
      } else {
        console.warn('No groups available');
      }
    }
  } catch (error) {
    console.error('Error opening default main group:', error);
  }
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
      if (currentChatId && currentChatName && currentChatType) {
        openSidebarChat(currentChatId, currentChatName, currentChatType, currentUserId);
      } else {
        await openDefaultMainGroup();
      }
    });
  }
}

// ============================================================================ //
// CLEANUP & WEBSOCKET MANAGEMENT                                               //   
// ============================================================================ //

export function disconnectPermanentChat(): void {
  console.log("in function disconnetctPermanentChat");
  closeCurrentWebSocket();
  currentChatId = null;
  currentChatName = '';
  currentChatType = 'group';
  currentUserId = null;
  currentUser = '';
  isInitialized = false;
  blockedUsernames.clear();
  
  const sidebar = document.getElementById('sidebar-chat');
  if (sidebar) {
    sidebar.innerHTML = '';
  }
}

function closeCurrentWebSocket(): void {
  if (currentWs) {
    currentWs.close();
    currentWs = null;
  }

  clearBlockedUsersCache();
}

// ============================================================================ //
// CHAT OPENING & HISTORY                                                       //
// ============================================================================ //

function buildHistoryUrl(type: ChatType, chatId: number): string {
  return type === 'group' 
    ? `/chat/group/${chatId}/history`
    : `/chat/dm/${chatId}/history`;
}

export async function openSidebarChat(
  chatId: number, 
  chatName: string, 
  type: ChatType = 'group', 
  userId: number | null = null
): Promise<void> {
  const sidebar = document.getElementById('sidebar-chat');
  if (!sidebar) return;
  
  currentChatId = chatId;
  currentChatName = chatName;
  currentChatType = type;
  currentUserId = userId;
  
  const token = getAuthToken();
  if (!currentUser) {
    currentUser = await getCurrentUser();
  }
  
  
  renderSidebarUI(chatName);

  await loadChatHistory(chatId, type, token, currentUser);

  setupEventListeners(chatId, chatName);
}

function renderSidebarUI(chatName: string): void {
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

// ============================================================================ //
// MESSAGE HANDLING                                                             //
// ============================================================================ //

function addMessageToUI(username: string, content: string, isCurrentUser: boolean): void {
  const messagesDiv = document.getElementById('sidebar-chat-messages');
  if (!messagesDiv) return;


  if (!isCurrentUser && isMessageBlocked(username)) {
    console.log(`Message from blocked user ${username} filtered out`);
    return;
  }

  const displayName = isCurrentUser ? 'Me' : username;
  const messageClass = isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white';
  const alignClass = isCurrentUser ? 'justify-end' : 'justify-start';

  messagesDiv.innerHTML += `
    <div class="mb-2 flex ${alignClass}">
      <div class="${messageClass} rounded-xl px-3 py-2 max-w-[80%] break-words whitespace-pre-line">
        <b>${displayName}:</b> ${content}
      </div>
    </div>
  `;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showErrorMessage(error: string): void {
  const messagesDiv = document.getElementById('sidebar-chat-messages');
  if (messagesDiv) {
    messagesDiv.innerHTML += `<div class="text-red-400 mb-2">${error}</div>`;
  }
}

async function loadChatHistory(
  chatId: number, 
  type: ChatType, 
  token: string, 
  currentUser: string
): Promise<void> {
  const historyUrl = buildHistoryUrl(type, chatId);

  try {
    const res = await fetch(historyUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const history: ChatMessage[] | ChatHistory = await res.json();
    
    if (Array.isArray(history)) {
      history.forEach((msg: ChatMessage) => {
        const isMe = msg.username === currentUser;
      
        if (!isMe && type === 'dm' && isMessageBlocked(msg.username)) {
          return;
        }
        addMessageToUI(msg.username, msg.content, isMe);
      });
    } else if ((history as ChatHistory).error) {
      showErrorMessage((history as ChatHistory).error!);
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    showErrorMessage('Error while displaying history.');
  }
}

// ============================================================================ //
// WEBSOCKET CONNECTION & ROOM MANAGEMENT                                       //              
// ============================================================================ //

async function joinAllAvailableRooms(token: string): Promise<void> {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not ready for joining all rooms');
    return;
  }

  console.log('Joining all available rooms...');

  try {
  
    const groupsResponse = await fetch('/chat/mychats', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (groupsResponse.ok) {
      const groups = await groupsResponse.json();
      for (const group of groups) {
        console.log(`Joining group: ${group.name} (ID: ${group.id})`);
        currentWs.send(JSON.stringify({
          action: 'join',
          scope: 'group',
          room: group.id
        }));
      }
    }
  
    const friendsResponse = await fetch('https://localhost:4242/users/me/friends', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (friendsResponse.ok) {
      const friendsData = await friendsResponse.json();
      const friends = friendsData.data || [];

      for (const friend of friends) {
        try {
        
          const isBlockedAPI = await isUserBlocked(friend.id);
          const isBlockedLocal = blockedUsernames.has(friend.username);
          
        
          if (isBlockedAPI && !isBlockedLocal) {
            blockedUsernames.add(friend.username);
          } else if (!isBlockedAPI && isBlockedLocal) {
            blockedUsernames.delete(friend.username);
          }
        
          if (isBlockedAPI) {
            console.log(`Skipping DM join with blocked user: ${friend.username}`);
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
            console.log(`Joining DM with: ${friend.username} (Room ID: ${canJoinData.Room})`);
            currentWs.send(JSON.stringify({
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

    console.log('All available rooms joined!');
  } catch (error) {
    console.error('Error joining all rooms:', error);
  }
}

function initializeWebSocket(token: string): void {
  currentWs = new WebSocket(`wss://${window.location.host}/chat?token=${encodeURIComponent(token)}`);

  currentWs.onopen = async () => {
    console.log('Chat WebSocket connected');
  
    await joinAllAvailableRooms(token);
  };

  currentWs.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'user_blocked') {
        console.log('Processing user_blocked event:', {
          blocked_by_user_id: data.blocked_by_user_id,
          blocked_by_username: data.blocked_by_username,
          currentUserId: currentUserId,
          currentChatType: currentChatType
        });
        handleUserBlocked(data.blocked_by_user_id, data.blocked_by_username);
        return;
      }
      
      if (data.type === 'user_unblocked') {
        console.log('Processing user_unblocked event:', {
          unblocked_by_user_id: data.unblocked_by_user_id,
          unblocked_by_username: data.unblocked_by_username,
          currentUserId: currentUserId,
          currentChatType: currentChatType
        });
        handleUserUnblocked(data.unblocked_by_user_id, data.unblocked_by_username);
        return;
      }

      if (data.message && data.from && !data.type) {
        if (data.roomId && currentChatId && data.roomId === currentChatId) {
          const isMe = data.from === currentUser;
          addMessageToUI(data.from, data.message, isMe);
        } else {
          console.log(`Message filtered out - from room ${data.roomId}, currently viewing room ${currentChatId}`);
        }
      }
    } catch (error) {
      const messageText = event.data.toString();
      if (messageText.startsWith('You must join') || messageText.includes('error') || messageText.includes('Error')) {
        showErrorMessage(messageText);
        console.warn('Server message:', messageText);
      } else {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    }
  };

  currentWs.onclose = (event) => {
    console.log('Chat WebSocket closed:', event.code, event.reason);
    currentWs = null;
    
    if (event.code !== 1000 && isInitialized) {
      setTimeout(() => {
        if (currentChatId && currentChatName) {
          const token = getAuthToken();
          if (token) {
            initializeWebSocket(token);
          }
        }
      }, 3000);
    }
  };

  currentWs.onerror = (error) => {
    console.error('Chat WebSocket error:', error);
  };
}

// ============================================================================ //
// CHAT SWITCHER FUNCTIONALITY                                                  //      
// ============================================================================ //

async function loadChatSwitcher(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  try {
    const groupsResponse = await fetch('/chat/mychats', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const groupsList = document.getElementById('groupsList');
    if (groupsList && groupsResponse.ok) {
      const groups = await groupsResponse.json();
      groupsList.innerHTML = '';

      groups.forEach((group: any) => {
        const isActive = currentChatType === 'group' && currentChatId === group.id;
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
          await switchToChat(group.id, group.name, 'group');
        });
        groupsList.appendChild(groupItem);
      });
    }

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
        
          const isBlockedLocal = blockedUsernames.has(friend.username);
          const isBlockedAPI = await isUserBlocked(friend.id);
          
        
          if (isBlockedAPI && !isBlockedLocal) {
            blockedUsernames.add(friend.username);
          } else if (!isBlockedAPI && isBlockedLocal) {
            blockedUsernames.delete(friend.username);
          }
          
          return { ...friend, isBlocked: isBlockedAPI };
        })
      );
      
      friendsWithBlockStatus.forEach((friend: any) => {
        const isActive = currentChatType === 'dm' && currentUserId === friend.id;
        const dmItem = document.createElement('button');

        const baseClasses = 'w-full text-left px-3 py-2 rounded text-sm transition-colors';
        const blockedClasses = friend.isBlocked 
          ? 'text-gray-500 cursor-not-allowed opacity-60' 
          : 'hover:bg-gray-600';
        const activeClasses = isActive ? 'bg-blue-600 text-white' : 'text-gray-300';
        
        dmItem.className = `${baseClasses} ${blockedClasses} ${activeClasses}`;
        dmItem.innerHTML = `
          <div class="flex items-center gap-2">
            <img src="${friend.avatar}" alt="avatar" class="w-5 h-5 rounded-full flex-shrink-0 ${friend.isBlocked ? 'grayscale' : ''}">
            <span class="truncate">${friend.username}</span>
            ${friend.isBlocked ? '<span class="text-xs text-red-400 ml-auto">🚫</span>' : ''}
          </div>
        `;
        dmItem.addEventListener('click', async () => {
          await switchToDM(friend.id, friend.username, friend.isBlocked);
        });
        dmsList.appendChild(dmItem);
      });
    }
  } catch (error) {
    console.error('Error loading chat switcher:', error);
  }
}

// ============================================================================ //
// CHAT NAVIGATION                                                              //
// ============================================================================ //

async function switchToChat(chatId: number, chatName: string, type: ChatType): Promise<void> {

  if (currentChatId === chatId && currentChatType === type) {
    console.log('Already viewing this chat, skipping switch');
    hideChatSwitcher();
    return;
  }

  const token = getAuthToken();
  
  const joinResponse = await fetch('/chat/join/group', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ groupId: chatId }),
  });
  
  if (joinResponse.ok) {
    currentChatId = chatId;
    currentChatName = chatName;
    currentChatType = type;
    currentUserId = null;
    
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (messagesDiv) messagesDiv.innerHTML = '';
    
    const chatSwitcher = document.getElementById('chatSwitcher');
    if (chatSwitcher) {
      const titleSpan = chatSwitcher.querySelector('span');
      if (titleSpan) {
        titleSpan.textContent = `Chat: ${chatName}`;
      }
    }
    
    if (!currentUser) {
      currentUser = await getCurrentUser();
    }
    await loadChatHistory(chatId, type, token, currentUser);
    
    enableChatMenuButton();
    enableChatForm();
    
  
    console.log(`Switched to viewing group: ${chatName} (already connected via WebSocket)`);
    
    hideChatSwitcher();
  }
}

async function switchToDM(userId: number, username: string, isBlocked: boolean = false): Promise<void> {
  const token = getAuthToken();
  
  if (isBlocked) {
    currentChatId = null;
    currentChatName = username;
    currentChatType = 'dm';
    currentUserId = userId;
    
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (messagesDiv) {
      const blockingInfo = await getBlockingInfo(userId);
      const currentUserIdNum = await getCurrentUserId();
      
      let blockMessage = "Chat is blocked";
      
      if (blockingInfo && currentUserIdNum) {
        if (blockingInfo.blocker_id === currentUserIdNum) {
          blockMessage = `You have blocked ${username}`;
        } else {
          blockMessage = `You have been blocked by ${username}`;
        }
      }
      
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
    
    const chatSwitcher = document.getElementById('chatSwitcher');
    if (chatSwitcher) {
      const titleSpan = chatSwitcher.querySelector('span');
      if (titleSpan) {
        const blockingInfo = await getBlockingInfo(userId);
        const currentUserIdNum = await getCurrentUserId();
        
        let titleSuffix = "(Blocked)";
        if (blockingInfo && currentUserIdNum) {
          if (blockingInfo.blocker_id === currentUserIdNum) {
            titleSuffix = "(You blocked)";
          } else {
            titleSuffix = "(Blocked you)";
          }
        }
        
        titleSpan.textContent = `Chat: ${username} ${titleSuffix}`;
      }
    }

    const chatForm = document.getElementById('sidebar-chat-form');
    if (chatForm) {
      const input = chatForm.querySelector('#sidebar-chat-input') as HTMLInputElement;
      const button = chatForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (input && button) {
        input.disabled = true;
        
        const blockingInfo = await getBlockingInfo(userId);
        const currentUserIdNum = await getCurrentUserId();
        
        let placeholder = "Cannot send messages";
        if (blockingInfo && currentUserIdNum) {
          if (blockingInfo.blocker_id === currentUserIdNum) {
            placeholder = `You have blocked ${username}`;
          } else {
            placeholder = "You cannot send messages to this user";
          }
        }
        
        input.placeholder = placeholder;
        input.classList.add('opacity-50', 'cursor-not-allowed');
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    if (chatMenuBtn) {
      chatMenuBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      chatMenuBtn.setAttribute('title', 'Menu disabled (chat blocked)');
    }
    
    hideChatSwitcher();
    return;
  }

  const isBlockedCheck = await isUserBlocked(userId);
  if (isBlockedCheck) {
    showErrorMessage(`Cannot open chat with ${username} : user blocked.`);
    hideChatSwitcher();
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
    
      if (currentChatType === 'dm' && currentChatId === canJoinData.Room) {
        console.log('Already viewing this DM, skipping switch');
        hideChatSwitcher();
        return;
      }
      
      currentChatId = canJoinData.Room;
      currentChatName = username;
      currentChatType = 'dm';
      currentUserId = userId;
      
    
      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (messagesDiv) messagesDiv.innerHTML = '';
      
    
      const chatSwitcher = document.getElementById('chatSwitcher');
      if (chatSwitcher) {
        const titleSpan = chatSwitcher.querySelector('span');
        if (titleSpan) {
          titleSpan.textContent = `Chat: ${username}`;
        }
      }
      
      if (!currentUser) {
        currentUser = await getCurrentUser();
      }
      await loadChatHistory(canJoinData.Room, 'dm', token, currentUser);
      
      enableChatMenuButton();
      enableChatForm();

      console.log(`Switched to viewing DM with: ${username} (already connected via WebSocket)`);

      hideChatSwitcher();
    }
  } catch (error) {
    console.error('Error switching to DM:', error);
  }
}

// ============================================================================ //
// DROPDOWN MANAGEMENT                                                          //
// ============================================================================ //

function toggleChatSwitcher(): void {
  const dropdown = document.getElementById('chatSwitcherDropdown');
  if (!dropdown) return;
  
  if (dropdown.classList.contains('hidden')) {
    loadChatSwitcher();
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}

function hideChatSwitcher(): void {
  const dropdown = document.getElementById('chatSwitcherDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

// ============================================================================ //
// EVENT LISTENERS SETUP                                                        //
// ============================================================================ //

function setupEventListeners(chatId: number, chatName: string): void {
  setupChatSwitcher();
  setupMenuButton();
  setupCloseButton(chatId, chatName);
  setupChatForm();
}

function setupChatSwitcher(): void {
  const chatSwitcher = document.getElementById('chatSwitcher');
  if (!chatSwitcher) return;

  chatSwitcher.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChatSwitcher();
  });

  document.addEventListener('click', function closeSwitcher(ev) {
    const dropdown = document.getElementById('chatSwitcherDropdown');
    if (dropdown && !dropdown.contains(ev.target as Node) && !chatSwitcher.contains(ev.target as Node)) {
      hideChatSwitcher();
    }
  });
}

function setupChatForm(): void {
  const form = document.getElementById('sidebar-chat-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleMessageSubmit();
  });
}

function enableChatMenuButton(): void {
  const chatMenuBtn = document.getElementById('chatMenuBtn');
  if (chatMenuBtn) {
    chatMenuBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    chatMenuBtn.setAttribute('title', 'Menu');
  }
}

function enableChatForm(): void {
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

function setupMenuButton(): void {
  const chatMenuBtn = document.getElementById('chatMenuBtn');
  if (!chatMenuBtn) return;

  chatMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChatMenu(e.currentTarget as HTMLElement);
  });
}

function toggleChatMenu(button: HTMLElement): void {
  if (button.classList.contains('pointer-events-none') || button.classList.contains('cursor-not-allowed')) {
    return;
  }

  let dropdownDiv = document.getElementById('chatMenuDropdown');
  
  if (!dropdownDiv) {
    dropdownDiv = createChatMenuDropdown();
    const header = button.parentElement;
    if (header) {
      header.appendChild(dropdownDiv);
    }
  } else {
    dropdownDiv.style.display = dropdownDiv.style.display === 'none' ? 'block' : 'none';
  }

  document.addEventListener('click', function closeMenu(ev) {
    if (dropdownDiv && !dropdownDiv.contains(ev.target as Node)) {
      dropdownDiv.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

function createChatMenuDropdown(): HTMLDivElement {
  const dropdownDiv = document.createElement('div');
  dropdownDiv.id = 'chatMenuDropdown';
  dropdownDiv.className = 'absolute right-10 top-12 bg-white dark:bg-gray-800 rounded shadow-lg z-50 min-w-[140px]';
  

  if (currentChatType === 'dm' && currentUserId) {
  
    dropdownDiv.innerHTML = `
      <ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
        <li><button id="blockUserBtn" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400">Block User</button></li>
        <li><button id="unblockUserBtn" class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600 dark:text-green-400 hidden">Unblock User</button></li>
      </ul>
    `;
    
  
    if (currentUserId) {
      isUserBlocked(currentUserId).then(isBlocked => {
        const blockBtn = dropdownDiv.querySelector('#blockUserBtn') as HTMLElement;
        const unblockBtn = dropdownDiv.querySelector('#unblockUserBtn') as HTMLElement;
        
        if (isBlocked) {
          blockBtn?.classList.add('hidden');
          unblockBtn?.classList.remove('hidden');
        } else {
          blockBtn?.classList.remove('hidden');
          unblockBtn?.classList.add('hidden');
        }
      });
    }
  
    const blockBtn = dropdownDiv.querySelector('#blockUserBtn');
    const unblockBtn = dropdownDiv.querySelector('#unblockUserBtn');
    
    blockBtn?.addEventListener('click', async () => {
      if (currentUserId) {
        const success = await blockUser(currentUserId);
        if (success) {
          showErrorMessage(`${currentChatName} has been blocked.`);
          dropdownDiv.remove();
          
        
          setTimeout(async () => {
          
            await openDefaultMainGroup();
          }, 500);
        } else {
          showErrorMessage('Error while blocking user.');
        }
      }
    });
    
    unblockBtn?.addEventListener('click', async () => {
      if (currentUserId) {
        const success = await unblockUser(currentUserId);
        if (success) {
          showErrorMessage(`${currentChatName} has been blocked.`);
          dropdownDiv.remove();
        } else {
          showErrorMessage('Error while unblocking user.');
        }
      }
    });
  } else {
  
    dropdownDiv.innerHTML = `
      <ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
        <li><button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Infos du groupe</button></li>
        <li><button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Paramètres</button></li>
      </ul>
    `;
  }
  
  return dropdownDiv;
}

// ============================================================================ //
// MESSAGE SENDING                                                              //
// ============================================================================ //

function setupCloseButton(_chatId: number, _chatName: string): void {
  const closeButton = document.getElementById('closeSidebarChat');
  if (!closeButton) return;

  closeButton.addEventListener('click', () => {
    renderPermanentMiniButton();
  });
}

function handleMessageSubmit(): void {
  const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;

  if (!input || input.disabled || !input.value.trim() || !currentWs || !currentChatId) return;

  const message = input.value.trim();
  console.log(`scope = ${currentChatType}, room = ${currentChatId}, message = ${message}`);
  currentWs.send(JSON.stringify({
    action: 'send',
    scope: currentChatType,
    room: currentChatId,
    message: message
  }));

  addMessageToUI('Me', message, true);
  
  input.value = '';
}

// ============================================================================ //
// USER BLOCKING FUNCTIONALITY                                                  // 
// ============================================================================ //

async function blockUser(userId: number): Promise<boolean> {
  const token = getAuthToken();
  try {
    const response = await fetch('/chat/block-user', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockedUserId: userId }),
    });
    
    if (response.ok) {
      await loadBlockedUsers();
      console.log('User blocked successfully, cache updated');
      
      refreshDMsList();
      
      const chatSwitcher = document.getElementById('sidebar-chat-switcher');
      if (chatSwitcher && !chatSwitcher.classList.contains('hidden')) {
        await loadChatSwitcher();
      }
      
      if (currentChatType === 'dm' && currentUserId === userId) {
        currentChatId = null;
        currentChatName = '';
        currentChatType = 'group';
        currentUserId = null;
        const messagesDiv = document.getElementById('sidebar-chat-messages');
        if (messagesDiv) messagesDiv.innerHTML = '<div class="text-gray-400 text-center">Sélectionnez un chat pour commencer</div>';
      }
      
      return true;
    } else {
      console.error('Failed to block user, response:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    return false;
  }
}

async function unblockUser(userId: number): Promise<boolean> {
  const token = getAuthToken();
    try {
    const response = await fetch('/chat/unblock-user', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockedUserId: userId }),
    });
    
    if (response.ok) {
      await loadBlockedUsers();
      
      refreshDMsList();
      
      const chatSwitcher = document.getElementById('sidebar-chat-switcher');
      if (chatSwitcher && !chatSwitcher.classList.contains('hidden')) {
        await loadChatSwitcher();
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unblocking user:', error);
    return false;
  }
}

// ============================================================================ //
// BLOCKING UTILITIES                                                           //
// ============================================================================ //

async function loadBlockedUsers(): Promise<void> {
  const token = getAuthToken();
  try {
    const blockedResponse = await fetch('/chat/blocked-users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (blockedResponse.ok) {
      const data: BlockedUsersResponse = await blockedResponse.json();
      blockedUsernames.clear();
      if (data.success && data.blocked_users) {
        data.blocked_users.forEach(user => {
          blockedUsernames.add(user.username);
        });
      }
      console.log('Blocked users loaded:', blockedUsernames);
    }
  } catch (error) {
    console.error('Error loading blocked users:', error);
  }
}

async function isUserBlocked(userId: number): Promise<boolean> {
  const token = getAuthToken();
  try {
    const response = await fetch(`/chat/isBlocked/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data: IsBlockedResponse = await response.json();
      return data.isBlocked;
    }
    return false;
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
}

async function getBlockingInfo(userId: number): Promise<IsBlockedResponse | null> {
  const token = getAuthToken();
  try {
    const response = await fetch(`/chat/isBlocked/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting blocking info:', error);
    return null;
  }
}

function isMessageBlocked(username: string): boolean {

  if (currentChatType === 'group') {
    return false;
  }
  return blockedUsernames.has(username);
}

// ============================================================================ //
// BLOCK/UNBLOCK EVENT HANDLERS                                                 //
// ============================================================================ //

function handleUserBlocked(blockedByUserId: number, blockedByUsername: string): void {
  blockedUsernames.add(blockedByUsername);
  
  if (currentChatType === 'dm' && currentUserId === blockedByUserId) {
    showErrorMessage(`You have been blocked by ${blockedByUsername}`);
    
    setTimeout(async () => {
      await openDefaultMainGroup();
    }, 2000);
  }
  
  const dropdown = document.getElementById('chatSwitcherDropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    loadChatSwitcher();
  }

  refreshDMsList();
}

function handleUserUnblocked(_unblockedByUserId: number, unblockedByUsername: string): void {
  console.log('handleUserUnblocked called with:', { _unblockedByUserId, unblockedByUsername, currentUserId, currentChatType });
  
  blockedUsernames.delete(unblockedByUsername);
  
  const dropdown = document.getElementById('chatSwitcherDropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    loadChatSwitcher();
  }
  
  refreshDMsList();
}

// ============================================================================ //
// EXPOSE WS                                                                    //
// ============================================================================ //

export function getCurrentWebSocket(): WebSocket | null {
  return currentWs;
}

export function isWebSocketConnected(): boolean {
  return currentWs !== null && currentWs.readyState === WebSocket.OPEN;
}
