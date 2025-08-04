import { chatState } from './chatState';
import { chatWebSocket } from './chatWebSocket';

// ============================================================================ //
// USER MODAL HANDLER                                                           //
// ============================================================================ //

export class UserModalHandler {

  showUserModal(username: string, event: MouseEvent): void {
    if (username === 'Me' || username === chatState.currentUser) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.createDropdown(username, event);
  }

  private createDropdown(username: string, event: MouseEvent): void {
    this.hideModal();

    const x = event.clientX;
    const y = event.clientY;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const gameId = localStorage.getItem('gameId');
    console.log(`Game ID from localStorage: ${gameId}`);
    console.log(`Current chat type: ${chatState.currentChatType}`);
    const shouldShowGameInvite = gameId && chatState.currentChatType === 'dm';

    const dropdown = document.createElement('div');
    dropdown.id = 'user-dropdown-menu';
    dropdown.className = 'fixed bg-[#1a2740] border border-gray-600 rounded-lg shadow-xl z-[9999] min-w-[180px] animate-in fade-in zoom-in-95 duration-200';
    
    const gameInviteButton = shouldShowGameInvite ? `
      <button id="invite-to-game" class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
        </svg>
        Invite to Game
      </button>
    ` : '';
    
    dropdown.innerHTML = `
      <div class="py-2">
        <div class="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-600">
          ${username}
        </div>
        <button id="view-profile" class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          View Profile
        </button>
        ${gameInviteButton}
        <button id="invite-to-group" class="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          Invite to Group
        </button>
      </div>
    `;

    let left = x + 10;
    let top = y + 10;
    
    if (left + 180 > windowWidth) {
      left = x - 190;
    }
    if (top + 120 > windowHeight) {
      top = y - 130;
    }
    
    dropdown.style.left = `${Math.max(10, left)}px`;
    dropdown.style.top = `${Math.max(10, top)}px`;

    document.body.appendChild(dropdown);

    this.setupDropdownEvents(username);
  }

  private setupDropdownEvents(username: string): void {
    const viewProfileBtn = document.getElementById('view-profile');
    const inviteToGroupBtn = document.getElementById('invite-to-group');
    const inviteToGameBtn = document.getElementById('invite-to-game');

    const handleOutsideClick = (e: MouseEvent) => {
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        this.hideModal();
        document.removeEventListener('click', handleOutsideClick);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);

    // Close dropdown on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideModal();
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    document.addEventListener('keydown', handleEscape);

    viewProfileBtn?.addEventListener('click', () => {
      this.viewUserProfile(username);
    });

    inviteToGroupBtn?.addEventListener('click', () => {
      this.showGroupInviteModal(username);
    });

    inviteToGameBtn?.addEventListener('click', () => {
      this.inviteUserToGame(username);
    });
  }

  private async inviteUserToGame(username: string): Promise<void> {
    console.log(`Inviting ${username} to game...`);
    const game = localStorage.getItem('gameId');
    const token = chatState.getAuthToken();
    
    const response = await fetch(`/games/${game}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        username: username,
        slot: "user2"
      })
    })
    if (response.ok) {
      const res = await response.json();
      const message = JSON.stringify({
        type: "game.invite",
        senderId: res.senderId,
        receiverId: res.receiverId,
        notifId: res.notifId,
        gameId: res.gameId,
        username: username,
        roomId: res.roomId
      });
      chatWebSocket.sendMessage("dm", res.roomId, message);
    }
  }

  private hideModal(): void {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
      dropdown.remove();
    }
    
    const groupDropdown = document.getElementById('group-invite-dropdown');
    if (groupDropdown) {
      groupDropdown.remove();
    }
  }

  private viewUserProfile(username: string): void {
    this.hideModal();
    
    window.location.hash = `#/users/${username}`;
  }

  private showGroupInviteModal(username: string): void {
    this.createGroupInviteDropdown(username);
  }

  private async createGroupInviteDropdown(username: string): Promise<void> {
    const groups = await this.getAvailableGroups();
    
    const mainDropdown = document.getElementById('user-dropdown-menu');
    
    const dropdown = document.createElement('div');
    dropdown.className = 'fixed bg-[#1a2740] border border-gray-600 rounded-lg shadow-xl z-[9999] w-48 animate-in fade-in slide-in-from-right duration-200';
    dropdown.id = 'group-invite-dropdown';
    
    const groupsList = groups.length > 0 
      ? groups.map(group => `
          <button class="group-invite-btn w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg" data-group-id="${group.id}" data-group-name="${group.name}">
            <div class="text-white text-sm font-medium">${group.name}</div>
          </button>
        `).join('')
      : '<div class="text-gray-400 text-center py-6 text-sm">No private groups available</div>';

    dropdown.innerHTML = `
      <div class="p-0">
        <div class="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-800 rounded-t-lg border-b border-gray-600">
          Invite ${username} to:
        </div>
        <div class="max-h-60 overflow-y-auto">
          ${groupsList}
        </div>
      </div>
    `;

    if (mainDropdown) {
      const rect = mainDropdown.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      
      let left = rect.right + 10;
      let top = rect.top;
      
      if (left + 192 > windowWidth) {
        left = rect.left - 202;
      }
      
      if (left < 10) {
        left = 10;
      }
      
      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${Math.max(10, top)}px`;
    } else {
      dropdown.style.left = '50%';
      dropdown.style.top = '50%';
      dropdown.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(dropdown);

    this.setupGroupInviteEvents(username, dropdown);
  }

  private setupGroupInviteEvents(username: string, dropdown: HTMLElement): void {
    const groupBtns = dropdown.querySelectorAll('.group-invite-btn');

    const handleOutsideClick = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', handleOutsideClick);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dropdown.remove();
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    document.addEventListener('keydown', handleEscape);

    groupBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const groupId = btn.getAttribute('data-group-id');
        const groupName = btn.getAttribute('data-group-name');
        
        if (groupId && groupName) {
          await this.sendGroupInvitation(username, groupId, groupName);
          dropdown.remove();
          document.removeEventListener('click', handleOutsideClick);
          document.removeEventListener('keydown', handleEscape);
        }
      });
    });
  }

  private async getAvailableGroups(): Promise<any[]> {
    try {
      const token = chatState.getAuthToken();
      const response = await fetch('/chat/mychats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const chats = await response.json();
        return Array.isArray(chats) ? chats.filter(chat => {
          return chat.group_type === 'private';
        }) : [];
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
    
    return [];
  }

  private async sendGroupInvitation(username: string, groupId: string, groupName: string): Promise<void> {
    try {
      const token = chatState.getAuthToken();

      const userResponse = await fetch(`/users/${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        alert(`User "${username}" not found.`);
        return;
      }
      
      const userData = await userResponse.json();
      const toUserId = userData.id;

      const response = await fetch('/chat/invite/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          toUserId: toUserId
        })
      });

      if (response.ok) {
        alert(`Invitation sent to ${username} for group "${groupName}"`);
      } else {
        const error = await response.json();
        alert(`Failed to send invitation: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending group invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  }

}

export const userModal = new UserModalHandler();
