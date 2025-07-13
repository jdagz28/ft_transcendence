import { openSidebarChat } from "./sidebarChat";
import { setupAppLayout } from "./setUpLayout";

interface BlockedUser {
  id: number;
  username: string;
  avatar: string;
}

let blockedUsersCache: Set<number> = new Set();

async function blockUser(userId: number, token: string | null): Promise<{ success: boolean; error?: any }> {
  try {
    const response = await fetch('/chat/block-user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ blockedUserId: userId }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json };
    }
    
    // Mettre à jour le cache local
    blockedUsersCache.add(userId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function unblockUser(userId: number, token: string | null): Promise<{ success: boolean; error?: any }> {
  try {
    const response = await fetch('/chat/unblock-user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ blockedUserId: userId }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json };
    }

    blockedUsersCache.delete(userId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

async function loadBlockedUsers(token: string | null): Promise<void> {
  console.log('=== DEBUT loadBlockedUsers ==='); // DEBUG
  if (!token) {
    console.log('No token provided to loadBlockedUsers'); // DEBUG
    return;
  }
  
  try {
    // Obtenir les utilisateurs bloqués directement
    const response = await fetch('/chat/blocked-users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const json = await response.json();
    console.log('LoadBlockedUsers response:', json); // DEBUG
    if (response.ok && json.success) {
      blockedUsersCache.clear();
      if (json.blocked_users && Array.isArray(json.blocked_users)) {
        json.blocked_users.forEach((user: BlockedUser) => {
          blockedUsersCache.add(user.id);
          console.log('Added to blocked cache:', user.id, user.username); // DEBUG
        });
      }
    }
    console.log('Blocked users cache:', Array.from(blockedUsersCache)); // DEBUG
  } catch (err) {
    console.error('Error loading blocked users:', err);
  }
}

// Fonction pour obtenir les détails du blocage
async function getBlockingDetails(userId: number, token: string | null): Promise<{
  isBlocked: boolean;
  iBlockedThem: boolean;
  theyBlockedMe: boolean;
  details?: any;
}> {
  console.log(`=== DEBUT getBlockingDetails for user ${userId} ===`); // DEBUG
  try {
    const response = await fetch(`/chat/isBlocked/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const json = await response.json();
    
    if (response.ok && json.isBlocked) {
      // Obtenir l'ID de l'utilisateur actuel pour déterminer qui a bloqué qui
      const userResponse = await fetch('/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const currentUser = await userResponse.json();
        const currentUserId = currentUser.id;
        
        // Si je suis le blocker_id, c'est que j'ai bloqué l'autre utilisateur
        console.log(`Current user ID: ${currentUserId}`); // DEBUG
        console.log(`Blocker ID: ${json.blocker_id}, Blocked User ID: ${json.blocked_user_id}`); // DEBUG
        const iBlockedThem = json.blocker_id === currentUserId;
        // Si je suis le blocked_user_id, c'est que l'autre utilisateur m'a bloqué
        const theyBlockedMe = json.blocked_user_id === currentUserId;
        
        console.log(`Blocking details for user ${userId}:`, {
          currentUserId,
          blocker_id: json.blocker_id,
          blocked_user_id: json.blocked_user_id,
          iBlockedThem,
          theyBlockedMe
        }); // DEBUG
        
        return {
          isBlocked: true,
          iBlockedThem,
          theyBlockedMe,
          details: json
        };
      }
    }
    
    return {
      isBlocked: false,
      iBlockedThem: false,
      theyBlockedMe: false
    };
  } catch (err) {
    console.error('Error getting blocking details:', err);
    return {
      isBlocked: false,
      iBlockedThem: false,
      theyBlockedMe: false
    };
  }
}

// Fonction pour nettoyer le cache lors de la déconnexion
export function clearBlockedUsersCache(): void {
  blockedUsersCache.clear();
}

export function renderChat(): void {
  console.log('=== DEBUT renderChat ==='); // DEBUG
  const token = localStorage.getItem('token');
  console.log('Token found:', !!token); // DEBUG
  
  const root = setupAppLayout().contentContainer;
  if (!root) {
    console.log('ERROR: root contentContainer not found'); // DEBUG
    return;
  }

  console.log('Setting up HTML...'); // DEBUG

  root.innerHTML = `
    <div class="flex flex-col min-h-screen bg-[#11294d]">
      <!-- Main content -->
      <main class="flex-1 flex justify-center items-center">
        <div class="flex gap-20 w-full max-w-6xl mt-16">
          <!-- Groups -->
          <div id="groups" class="flex-1 bg-[#15305a] rounded-2xl p-12 shadow-2xl shadow-black/60 min-h-[600px]">
            <h2 class="text-4xl font-bold text-center text-[#f8f8e7] mb-8">Groups</h2>
            <div id="groups-list" class="flex flex-col gap-4 mb-8 max-h-[400px] overflow-y-auto"></div>
            <div class="flex justify-end">
              <button id="createButton" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-bold">CREATE</button>
            </div>
          </div>
          <!-- DMs -->
          <div class="flex-1 bg-[#15305a] rounded-2xl p-12 shadow-2xl shadow-black/60 min-h-[600px]">
            <h2 class="text-4xl font-bold text-center text-[#f8f8e7] mb-8">DM</h2>
            <div id="dm-list" class="flex flex-col gap-4 mb-8 max-h-[400px] overflow-y-auto"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  setupCreateGroupButton(token);
  loadGroups(token);
  
  console.log('Starting loadBlockedUsers...'); // DEBUG
  // Charger les utilisateurs bloqués puis les DMs
  loadBlockedUsers(token).then(() => {
    console.log('loadBlockedUsers completed, starting loadDMs...'); // DEBUG
    loadDMs(token);
  }).catch(err => {
    console.error('Error in loadBlockedUsers:', err); // DEBUG
    loadDMs(token); // Charger les DMs même si loadBlockedUsers échoue
  });
}

function setupCreateGroupButton(token: string | null) {
  const createBtn = document.getElementById("createButton");
  if (!createBtn) return;

  createBtn.addEventListener("click", async () => {
    const name = prompt("Group name :");
    if (!name || name.trim() === "") return;

    let type = prompt("Groupe type ? (public/private)", "public");
    if (!type) return;
    type = type.toLowerCase();
    if (type !== "public" && type !== "private") {
      alert("Type invalid. Choose 'public' or 'private'.");
      return;
    }

    const result = await createGroup(token, name, type);
    if (result.success) {
      window.location.reload();
    } else {
      alert("Error while creating group : " + (result.error?.error || "Unknown error"));
    }
  });
}

async function loadGroups(token: string | null) {
  const groupsList = document.getElementById("groups-list");
  if (!groupsList) return;

  groupsList.innerHTML = `<div class="text-gray-400 text-center">Loading...</div>`;
  const result = await getChats(token);

  if (!result.success) {
    groupsList.innerHTML = `<div class="text-red-400 text-center">Error while searching groups</div>`;
    return;
  }

  const groups: { id: number, name: string }[] = result.data;
  if (!groups || groups.length === 0) {
    groupsList.innerHTML = `<div class="text-gray-400 text-center">No group found.</div>`;
    return;
  }

  groupsList.innerHTML = "";
  groups.forEach((group) => {
    const divGroup = document.createElement("div");
    divGroup.className = "flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4";
    divGroup.innerHTML = `
      <span class="text-lg text-[#f8f8e7] font-semibold">${group.name}</span>
      <div class="flex gap-2">
        <button class="join-btn bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
      </div>
    `;
    const joinBtn = divGroup.querySelector('.join-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', async () => {
        if (!token) {
          alert("Vous devez être connecté pour rejoindre un groupe.");
          return;
        }
        const res = await fetch('/chat/join/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId: group.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          alert(json.error || "Impossible de rejoindre le groupe");
          return;
        }
        openSidebarChat(group.id, group.name, "group");
      });
    }
    groupsList.appendChild(divGroup);
  });
}

async function loadDMs(token: string | null) {
  console.log('=== DEBUT loadDMs ==='); // DEBUG
  console.log('Token disponible:', !!token); // DEBUG
  
  const dmList = document.getElementById('dm-list');
  if (!dmList) {
    console.log('ERROR: dm-list element not found'); // DEBUG
    return;
  }

  dmList.innerHTML = `<div class="text-gray-400 text-center">Loading...</div>`;

  console.log('Fetching friends...'); // DEBUG
  const result = await getFriends(token);
  console.log('getFriends result:', result); // DEBUG
  
  if (!result.success) {
    console.log('getFriends failed:', result.error); // DEBUG
    dmList.innerHTML = `<div class="text-gray-400 text-center">Add friends to start using DMs!</div>`;
    return;
  }

  const dms: { id: number, username: string, avatar: string }[] = result.data.data;
  console.log('Raw DMs data:', dms); // DEBUG
  
  if (!dms || dms.length === 0) {
    console.log('No DMs found'); // DEBUG
    dmList.innerHTML = `<div class="text-gray-400 text-center">Add friends to start using DMs!</div>`;
    return;
  }

  console.log('Processing DMs:', dms); // DEBUG

  // Filtrer les utilisateurs bloqués et les séparer
  const unblockedDms = [];
  const iBlockedThem = []; // Utilisateurs que j'ai bloqués
  const theyBlockedMe = []; // Utilisateurs qui m'ont bloqué (ne pas afficher du tout)
  
  for (const dm of dms) {
    console.log(`Checking user ${dm.username} (ID: ${dm.id})`); // DEBUG
    const blockingDetails = await getBlockingDetails(dm.id, token);
    console.log(`User ${dm.username} blocking details:`, blockingDetails); // DEBUG
    
    if (blockingDetails.theyBlockedMe) {
      // Si ils m'ont bloqué, ne pas afficher du tout
      theyBlockedMe.push(dm);
      console.log(`User ${dm.username} blocked me - hiding from list`); // DEBUG
    } else if (blockingDetails.iBlockedThem) {
      // Si je les ai bloqués, les afficher dans la section bloquée
      iBlockedThem.push(dm);
    } else {
      // Pas de blocage, afficher normalement
      unblockedDms.push(dm);
    }
  }

  console.log('Unblocked DMs:', unblockedDms); // DEBUG
  console.log('I blocked them:', iBlockedThem); // DEBUG
  console.log('They blocked me (hidden):', theyBlockedMe); // DEBUG

  dmList.innerHTML = "";
  
  // Vérifier s'il y a des DMs à afficher
  if (unblockedDms.length === 0 && iBlockedThem.length === 0) {
    dmList.innerHTML = `<div class="text-gray-400 text-center">Add friends to start using DMs!</div>`;
    return;
  }
  
  // Afficher d'abord les DMs non bloqués
  unblockedDms.forEach((dm) => {
    const divDM = document.createElement("div");
    divDM.className = "flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4";
    divDM.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${dm.avatar}" alt="avatar" class="w-10 h-10 rounded-full border-2 border-gray-400">
        <span class="text-lg text-[#f8f8e7] font-semibold">${dm.username}</span>
      </div>
      <div class="flex gap-2">
        <button class="join-dm-btn bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
        <button class="block-dm-btn bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Block</button>
      </div>
    `;
    dmList.appendChild(divDM);

    const joinBtn = divDM.querySelector('.join-dm-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', async () => {
        const canJoin = await canIJoinDm(dm.id, token);
        console.log(`canJoin = ${ JSON.stringify(canJoin) }`);
        if (!canJoin.success) {
          alert("Cannot join this DM: " + (canJoin.error?.error || "Unknown error"));
          return;
        }
        openSidebarChat(canJoin.data.Room, dm.username, "dm", dm.id);
      });
    }

    const blockBtn = divDM.querySelector('.block-dm-btn');
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        const result = await blockUser(dm.id, token);
        if (result.success) {
          alert(`User: ${dm.username} Blocked !`);
          // Recharger les DMs pour mettre à jour l'affichage
          loadDMs(token);
        } else {
          alert("Not possible to block this user: " + (result.error?.error || "Unknown error"));
        }
      });
    }
  });

  // Afficher ensuite les utilisateurs que j'ai bloqués avec option de déblocage
  if (iBlockedThem.length > 0) {
    const separator = document.createElement("div");
    separator.className = "text-gray-500 text-sm text-center py-2 border-t border-gray-600 mt-4";
    separator.textContent = "Blocked Users";
    dmList.appendChild(separator);

    iBlockedThem.forEach((dm) => {
      const divDM = document.createElement("div");
      divDM.className = "flex items-center justify-between bg-[#2d1b1b] rounded-xl px-6 py-4 opacity-60";
      divDM.innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${dm.avatar}" alt="avatar" class="w-10 h-10 rounded-full border-2 border-red-400">
          <span class="text-lg text-red-300 font-semibold">${dm.username} (Blocked)</span>
        </div>
        <div class="flex gap-2">
          <button class="unblock-dm-btn bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded font-bold">Unblock</button>
        </div>
      `;
      dmList.appendChild(divDM);

      const unblockBtn = divDM.querySelector('.unblock-dm-btn');
      if (unblockBtn) {
        unblockBtn.addEventListener('click', async () => {
          const result = await unblockUser(dm.id, token);
          if (result.success) {
            alert(`User: ${dm.username} Unblocked !`);
            // Recharger les DMs pour mettre à jour l'affichage
            loadDMs(token);
          } else {
            alert("Not possible to unblock this user: " + (result.error?.error || "Unknown error"));
          }
        });
      }
    });
  }
}

async function getChats(token: string | null) {
  try {
    const response = await fetch('/chat/mychats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const json = await response.json();
    if (!response.ok) {
      console.error('Mychats request failed', json);
      return { success: false, error: json };
    }
    return { success: true, data: json };
  } catch (err) {
    console.error('Fetch error:', err);
    return { success: false, error: err };
  }
}

async function getFriends(token: string | null) {
  try {
    const response = await fetch('https://localhost:4242/users/me/friends', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });
    const json = await response.json();
    if (!response.ok) {
      console.error('Get friends request failed', json);
      return { success: false, error: json };
    }
    return { success: true, data: json };
  } catch (err) {
    console.error('Fetch error:', err);
    return { success: false, error: err };
  }
}

async function canIJoinDm(userId: number, token: string | null) {
  try {
    console.log(`userId = ${userId} and type = ${typeof userId}`); // REMOVE THIS COMMENT
    const response = await fetch(`https://localhost:4242/chat/can-join/dm`, {
      method: 'POST',
      body: JSON.stringify({ userId: userId }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
    const json = await response.json();
    if (!response.ok) {
      console.error('Can I join DM request failed', json);
      return { success: false, error: json };
    }
    return { success: true, data: json };
  } catch (err) {
    console.error('Fetch error:', err);
    return { success: false, error: err };
  }
}

async function createGroup(token: string | null, name: string, type: string) {
  try {
    const response = await fetch('/chat/create/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, type }),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error('Create group request failed', json);
      return { success: false, error: json };
    }
    return { success: true, data: json };
  } catch (err) {
    console.error('Fetch error:', err);
    return { success: false, error: err };
  }
}
