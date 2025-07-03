export function openSidebarChat(groupId: number, groupName: string) {
  const sidebar = document.getElementById('sidebar-chat');
  if (!sidebar) return;

  const token = localStorage.getItem('token') || '';

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
          messagesDiv.innerHTML += `<div class="text-white mb-2"><b>${msg.username}:</b> ${msg.content}</div>`;
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

  // const ws = new WebSocket(`ws://${window.location.host}/chat`);
  const ws = new WebSocket(`wss://${window.location.host}/chat?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    setTimeout(() => {
      ws.send(JSON.stringify({
        action: 'join',
        scope: 'group',
        room: groupId
      }));
    }, 100);
  };

  ws.onmessage = (event) => {
    const messagesDiv = document.getElementById('sidebar-chat-messages');
    if (!messagesDiv) return;
    try {
      const data = JSON.parse(event.data);
      if (data.message && data.from) {
        messagesDiv.innerHTML += `<div class="text-white mb-2"><b>${data.from}:</b> ${data.message}</div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    } catch {
      console.log("error")
      // messagesDiv.innerHTML += `<div class="text-gray-400 mb-2">${event.data}</div>`;
    }
  };

  ws.onclose = () => {};

  sidebar.innerHTML = `
  <div class="
    fixed bottom-4 right-4 z-50
    w-[90vw] max-w-[320px] md:w-[320px] md:max-w-[350px]
    min-h-[400px] max-h-[40vh]
    bg-[#1a2740] shadow-2xl rounded-xl flex flex-col border border-gray-700
  ">
    <div class="px-4 py-2 border-b border-gray-700 flex justify-between items-center rounded-t-xl">
      <span class="text-lg font-bold text-white truncate">Chat: ${groupName}</span>
      <button id="closeSidebarChat" class="text-white text-xl hover:text-red-400">✖</button>
    </div>
    <div id="sidebar-chat-messages" class="flex-1 overflow-y-auto px-4 py-2"></div>
    <form id="sidebar-chat-form" class="px-4 py-2 flex gap-2 border-t border-gray-700">
      <input type="text" id="sidebar-chat-input" class="flex-1 rounded p-2 bg-[#f8f8e7] text-[#11294d] placeholder-gray-500" placeholder="Message..." />
      <button type="submit" class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded transition-colors">Send</button>
    </form>
  </div>
`;

  document.getElementById('closeSidebarChat')?.addEventListener('click', () => {
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
    if (input && input.value.trim() !== '') {
      ws.send(JSON.stringify({
        action: 'send',
        scope: 'group',
        room: groupId,
        message: input.value
      }));

      const messagesDiv = document.getElementById('sidebar-chat-messages');
      if (messagesDiv) {
        messagesDiv.innerHTML += `<div class="text-white mb-2 text-right"><b>Moi:</b> ${input.value}</div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      input.value = '';
    }
  });
}
