import { openSidebarChat } from "./sidebarChat";

export function renderChat(): void {
  const token = localStorage.getItem('token');
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <div class="flex flex-col min-h-screen bg-[#11294d]">
      <!-- Navbar -->
      <nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-white text-sm font-semibold">
        <div class="flex items-center gap-6">
          <div class="text-xl font-bold">🌊</div>
          <a href="#">Dashboard</a>
          <a href="#">Games</a>
          <a href="#">Tournament</a>
          <a href="#">Leaderboard</a>
          <a href="#">Chat</a>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-xl">USERRR</span>
          <span class="text-xl">🔔</span>
          <div id="avatar" class="w-8 h-8 rounded-full overflow-hidden bg-white"></div>
        </div>
      </nav>
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
  loadDMs(token);
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
        openSidebarChat(group.id, group.name);
      });
    }
    groupsList.appendChild(divGroup);
  });
}

async function loadDMs(token: string | null) {
  const dmList = document.getElementById('dm-list')
  if (!dmList) return;

  dmList.innerHTML = `<div class="text-gray-400 text-center">Loading...</div>`;

  const result = await getFriends(token)
  if (!result.success) {
    dmList.innerHTML = `<div class="text-red-400 text-center">Error while searching DMs</div>`;
    return;
  }

  const dms: { id: number, username: string }[] = result.data;
  if (!dms || dms.length === 0) {
    dmList.innerHTML = `<div class="text-gray-400 text-center">No DM found.</div>`;
    return;
  }

  dmList.innerHTML = "";
  dms.forEach((dm) => {
    const divDM = document.createElement("div");
    divDM.className = "flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4";
    divDM.innerHTML = `
      <span class="text-lg text-[#f8f8e7] font-semibold">${dm.username}</span>
      <div class="flex gap-2">
        <button id="join-dm-btn-${dm.id} class="join-dm-btn bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
        <button id="block-dm-btn-${dm.id} class="block-dm-btn bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Block</button>
      </div>
    `;
    dmList.appendChild(divDM);

    const joinBtn = document.getElementById(`join-dm-btn-${dm.id}`);
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        openSidebarChat(dm.id, dm.username);
      });
    }

    const blockBtn = document.getElementById(`block-dm-btn-${dm.id}`);
    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {

        const res = await fetch('/chat/block-user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ blockedUserId: dm.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          alert(json.error || "Not possible to block this user");
          return;
        }
        alert(`User: ${dm.username} Blocked !`);
      });
    }
  });
  
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