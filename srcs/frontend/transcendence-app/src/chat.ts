export function renderChat(): void {
  const root = document.getElementById('app');
  if (!root)
      return;
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
          <span class="text-xl">USERRR<span>
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
            <div id="groups-list" class="flex flex-col gap-4 mb-8 max-h-[400px] overflow-y-auto">
             <!-- ${[
                "Amazing title",
                "Im alone join pls",
                "I dont know...",
                "TITLE!!!!!!"
              ].map(title => `
                <div class="flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4">
                  <span class="text-lg text-[#f8f8e7] font-semibold">${title}</span>
                  <div class="flex gap-2">
                    <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Leave</button>
                  </div>
                </div>
              `).join("")} -->
            </div>
            <div class="flex justify-end">
              <button id="createButton" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-bold">CREATE</button>
            </div>
          </div>
          <!-- DMs -->
          <div class="flex-1 bg-[#15305a] rounded-2xl p-12 shadow-2xl shadow-black/60 min-h-[600px]">
            <h2 class="text-4xl font-bold text-center text-[#f8f8e7] mb-8">DM</h2>
            <div class="flex flex-col gap-4">
              ${[
                "Tupac",
                "Macron",
                "La reine des neiges"
              ].map(name => `
                <div class="flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4">
                  <span class="text-lg text-[#f8f8e7] font-semibold">${name}</span>
                  <div class="flex gap-2">
                    <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Block</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </main>
    </div>
    `
  ;

  (async () => {
    const groupsList = document.getElementById("groups-list");
    if (!groupsList) return;

    const createBtn = document.getElementById("createButton");
    if (createBtn) {
      // createBtn.addEventListener("click", async () => {
      //   const name = prompt("Group name :");
      //   if (!name || name.trim() === "") return;

      //   let type = prompt("Groupe type ? (public/private)", "public");
      //   if (!type) return;
      //   type = type.toLowerCase();
      //   if (type !== "public" && type !== "private") {
      //     alert("Type invalid. Chose 'public' or 'private'.");
      //     return;
      //   }

      //   const result = await createGroup(name, type);
      //   if (result.success) {
      //     window.location.reload();
      //   } else {
      //     alert("Error while creating group : " + (result.error?.error || "Unknown error"));
      //   }
      createBtn.addEventListener("click", async () => {
      showCreateGroupModal(async (name, type) => {
        const result = await createGroup(name, type);
        if (result.success) {
          window.location.reload();
        } else {
          alert("Erreur lors de la création du groupe : " + (result.error?.error || "inconnue"));
        }
        });
      });
    }

    groupsList.innerHTML = `<div class="text-gray-400 text-center">Chargement...</div>`;
    const result = await getChats();

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
    groups.forEach((group: { id: number, name: string }) => {
      const divGroup = document.createElement("div");
      divGroup.className = "flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4";
      divGroup.innerHTML = `
        <span class="text-lg text-[#f8f8e7] font-semibold">${group.name}</span>
        <div class="flex gap-2">
          <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
          <!-- <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Leave</button> -->
        </div>
      `;
      groupsList.appendChild(divGroup);
    });
  })();

  async function getChats() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/chat/mychats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await response.json();

      if (!response.ok) {
        console.error('Mychats request failed', json);
        return { success: false, error: json};
      }
      return { success: true, data: json};
    } catch (err) {
      console.error('Fetch error:', err);
      return { success: false, error: err};
    }
  }

  async function createGroup(name: string, type: string) {
    try {
      const token = localStorage.getItem('token');
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
      return { success: true, data: json}
    } catch (err) {
      console.error('Fetch error:', err)
      return { success: false, error: err};
    }
  }
}

function showCreateGroupModal(onSubmit: (name: string, type: string) => void) {
  const modal = document.createElement('div');
  modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50";
  modal.innerHTML = `
    <div class="bg-[#18376b] rounded-xl p-8 shadow-2xl flex flex-col gap-4 min-w-[300px]">
      <h2 class="text-2xl text-[#f8f8e7] font-bold mb-2">Create a Group</h2>
      <input id="groupNameInput" type="text" placeholder="Name of Group" class="px-3 py-2 rounded w-full mb-2" />
      <select id="groupTypeInput" class="px-3 py-2 rounded w-full mb-4">
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
      <div class="flex justify-end gap-2">
        <button id="cancelModalBtn" class="px-4 py-1 rounded bg-gray-400 text-white font-bold">Annuler</button>
        <button id="submitModalBtn" class="px-4 py-1 rounded bg-green-600 text-white font-bold">Créer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  (modal.querySelector('#cancelModalBtn') as HTMLButtonElement).onclick = () => modal.remove();
  (modal.querySelector('#submitModalBtn') as HTMLButtonElement).onclick = () => {
    const name = (modal.querySelector('#groupNameInput') as HTMLInputElement).value.trim();
    const type = (modal.querySelector('#groupTypeInput') as HTMLSelectElement).value;
    if (!name) {
      alert("Name is required.");
      return;
    }
    modal.remove();
    onSubmit(name, type);
  };
}
