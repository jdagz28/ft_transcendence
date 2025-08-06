// ============================================================================ //
// SHARED TYPES & INTERFACES                                                    //
// ============================================================================ //

export type ChatType = 'group' | 'dm';

export interface ChatMessage {
  username: string;
  content: string;
  from?: string;
  message?: string;
  sender_id?: number;
  for?: number;
}

export interface ChatHistory {
  error?: string;
}

export interface BlockedUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  blocked_at: string;
}

export interface BlockedUsersResponse {
  success: boolean;
  blocker_id: number;
  blocked_count: number;
  blocked_users: BlockedUser[];
}

export interface IsBlockedResponse {
  isBlocked: boolean;
  blocker_id: number;
  blocked_user_id?: number;
  target_id?: number;
  blocked_at?: string;
  block_id?: number;
}

export interface ChatState {
  currentWs: WebSocket | null;
  currentChatId: number | null;
  currentChatName: string;
  currentChatType: ChatType;
  currentUserId: number | null;
  currentUser: string;
  isInitialized: boolean;
  blockedUsernames: Set<string>;
}
