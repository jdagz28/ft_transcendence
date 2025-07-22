import type { ChatState, ChatType } from './types';

// ============================================================================ //
// CHAT STATE MANAGER                                                           //
// ============================================================================ //

class ChatStateManager {
  private state: ChatState = {
    currentWs: null,
    currentChatId: null,
    currentChatName: '',
    currentChatType: 'group',
    currentUserId: null,
    currentUser: '',
    isInitialized: false,
    blockedUsernames: new Set<string>(),
  };

  get currentWs(): WebSocket | null { return this.state.currentWs; }
  get currentChatId(): number | null { return this.state.currentChatId; }
  get currentChatName(): string { return this.state.currentChatName; }
  get currentChatType(): ChatType { return this.state.currentChatType; }
  get currentUserId(): number | null { return this.state.currentUserId; }
  get currentUser(): string { return this.state.currentUser; }
  get isInitialized(): boolean { return this.state.isInitialized; }
  get blockedUsernames(): Set<string> { return this.state.blockedUsernames; }

  // Setters
  setWebSocket(ws: WebSocket | null): void {
    this.state.currentWs = ws;
  }

  setCurrentChat(chatId: number | null, chatName: string, type: ChatType, userId: number | null = null): void {
    this.state.currentChatId = chatId;
    this.state.currentChatName = chatName;
    this.state.currentChatType = type;
    this.state.currentUserId = userId;
  }

  setCurrentUser(user: string): void {
    this.state.currentUser = user;
  }

  setInitialized(initialized: boolean): void {
    this.state.isInitialized = initialized;
  }

  addBlockedUser(username: string): void {
    this.state.blockedUsernames.add(username);
  }

  removeBlockedUser(username: string): void {
    this.state.blockedUsernames.delete(username);
  }

  clearBlockedUsers(): void {
    this.state.blockedUsernames.clear();
  }

  isUserBlocked(username: string): boolean {
    return this.state.blockedUsernames.has(username);
  }

  reset(): void {
    this.state = {
      currentWs: null,
      currentChatId: null,
      currentChatName: '',
      currentChatType: 'group',
      currentUserId: null,
      currentUser: '',
      isInitialized: false,
      blockedUsernames: new Set<string>(),
    };
  }

  getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }

  async getCurrentUserFromAPI(): Promise<string> {
    const token = this.getAuthToken();
    try {
      const res = await fetch('/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        this.setCurrentUser(user.username);
        return user.username;
      }
    } catch (error) {
      console.warn('Failed to fetch current user:', error);
    }
    return '';
  }

  async getCurrentUserIdFromAPI(): Promise<number | null> {
    const token = this.getAuthToken();
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
}

export const chatState = new ChatStateManager();
