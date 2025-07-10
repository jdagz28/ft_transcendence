let currentWs: WebSocket | null = null;

export async function openSidebarChat(groupId: number, groupName: string) {
  const sidebar = document.getElementById('sidebar-chat');
  if (!sidebar) return;

  const token = localStorage.getItem('token') || '';

  let currentUser = '';
  try {
    const res = await fetch('/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      currentUser = user.username;
    }
  } catch {}

  if (currentWs) {
    currentWs.close();
    currentWs = null;
  }

  fetch(`/chat/group/${groupId}/history`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(history => {
      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (!messagesDiv) return;
      if (Array.isArray(history)) {
        history.forEach(msg => {
          const isMe = msg.username === currentUser;
          messagesDiv.innerHTML += `
            <div class="mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}">
              <div class="${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} rounded-xl px-3 py-2 max-w-[80%] break-words whitespace-pre-line">
                <b>${isMe ? 'Moi' : msg.username}:</b> ${msg.content}
              </div>
            </div>
          `;
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      } else if (history.error) {
        messagesDiv.innerHTML += `<div class="text-red-400 mb-2">${history.error}</div>`;
      }
    })
    .catch(() => {
      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (messagesDiv)
        messagesDiv.innerHTML += `<div class="text-red-400 mb-2">Erreur lors du chargement de l'historique.</div>`;
    });

  sidebar.innerHTML = `
    <div class="
      fixed bottom-4 right-4 z-50
      w-[90vw] max-w-[320px] md:w-[320px] md:max-w-[350px]
      min-h-[400px] max-h-[40vh]
      bg-[#1a2740] shadow-2xl rounded-xl flex flex-col border border-gray-700
    ">
      <div class="px-4 py-2 border-b border-gray-700 flex justify-between items-center rounded-t-xl">
        <span class="text-lg font-bold text-white truncate">Chat: ${groupName}</span>
        <div class="flex items-center gap-2">
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

  currentWs = new WebSocket(`wss://${window.location.host}/chat?token=${encodeURIComponent(token)}`);

  currentWs.onopen = () => {
    setTimeout(() => {
      if (currentWs) {
        currentWs.send(JSON.stringify({
          action: 'join',
          scope: 'group',
          room: groupId
        }));
      }
    }, 100);
  };

  currentWs.onmessage = (event) => {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (!messagesDiv) return;
    try {
      const data = JSON.parse(event.data);
      if (data.message && data.from) {
        const isMe = data.from === currentUser;
        messagesDiv.innerHTML += `
          <div class="mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}">
            <div class="${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} rounded-xl px-3 py-2 max-w-[80%] break-words whitespace-pre-line">
              <b>${data.from}:</b> ${data.message}
            </div>
          </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    } catch {
      console.log("error in catching message data", event.data);
    }
  };

  currentWs.onclose = () => {};

  const chatMenuBtn = document.getElementById('chatMenuBtn');
  if (chatMenuBtn) {
    chatMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let dropdownDiv = document.getElementById('chatMenuDropdown');
      if (!dropdownDiv) {
        dropdownDiv = document.createElement('div');
        dropdownDiv.id = 'chatMenuDropdown';
        dropdownDiv.className = 'absolute right-10 top-12 bg-white dark:bg-gray-800 rounded shadow-lg z-50 min-w-[140px]';
        dropdownDiv.innerHTML = `
          <ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
            <li><button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Option 1</button></li>
            <li><button class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Option 2</button></li>
          </ul>
        `;
        const header = (e.currentTarget as HTMLElement).parentElement;
        if (header) {
          header.appendChild(dropdownDiv);
        }
      } else {
        if (dropdownDiv.style.display === 'none' || dropdownDiv.style.display === '') {
          dropdownDiv.style.display = 'block';
        } else {
          dropdownDiv.style.display = 'none';
        }
      }

      document.addEventListener('click', function closeMenu(ev) {
        if (dropdownDiv && !dropdownDiv.contains(ev.target as Node)) {
          dropdownDiv.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    });
  }

  document.getElementById('closeSidebarChat')?.addEventListener('click', () => {
    if (currentWs) {
      currentWs.close();
      currentWs = null;
    }
    sidebar.innerHTML = `
      <button id="openSidebarChatMini"
        class="fixed bottom-8 right-8 z-50 bg-[#1a2740] text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-3xl hover:bg-[#22325a] transition-colors"
        title="Ouvrir le chat">
        💬
      </button>
    `;
    document.getElementById('openSidebarChatMini')?.addEventListener('click', () => {
      openSidebarChat(groupId, groupName);
    });
  });

  document.getElementById('sidebar-chat-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('sidebar-chat-input') as HTMLInputElement;
    if (input && input.value.trim() !== '' && currentWs) {
      currentWs.send(JSON.stringify({
        action: 'send',
        scope: 'group',
        room: groupId,
        message: input.value
      }));

      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (messagesDiv) {
        messagesDiv.innerHTML += `
          <div class="mb-2 flex justify-end">
            <div class="bg-blue-600 text-white rounded-xl px-3 py-2 max-w-[80%] break-words whitespace-pre-line">
              <b>Moi:</b> ${input.value}
            </div>
          </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      input.value = '';
    }
  });
}
