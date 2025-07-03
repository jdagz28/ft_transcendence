import { setupAppLayout, whoAmI } from "../setUpLayout";
import { buildPlayerSlot, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentName, getTournamentSettings, getAvailablePlayers, 
  invitePlayerToSlot, getTournamentCreator, isTournamentAdmin, getTournamentChatRoom } from "../api/tournament";

export async function renderTournamentLobby(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = 
    "flex-grow flex flex-col gap-8 px-8 py-10 text-white";

  const tournamentName = await getTournamentName(tournamentId);
  console.log("Tournament name:", tournamentName);

  const header = document.createElement("div");
  header.className = "text-center py-6";
  const title = document.createElement("h1");
  title.textContent = tournamentName;
  title.className = 
    "text-3xl md:text-4xl font-bold text-white mb-2"; 
  header.appendChild(title);
  contentContainer.appendChild(header);

  const main = document.createElement("div");
  main.className = "flex justify-center items-start gap-20 px-8 py-10";
  contentContainer.appendChild(main);

  const players: Player[]  = await getTournamentPlayers(tournamentId);
  console.log("Players in tournament:", players);

  const userData = await whoAmI();
  console.log("Current user data:", userData); //! DELETE
  if (!userData.success) {
    console.error("Failed to get user data:", userData.error);
    window.location.hash = "#/";
    return;
  }
  const userId = userData.data.id;
  let authorized = false;
  for (const player of players) {
    if (player.id === userId) {
      authorized = true;
      break;
    }
  }
  if (!authorized) {
    window.location.hash = "/403"; 
    return;
  }

  const created_by = await getTournamentCreator(tournamentId);
  const settings = await getTournamentSettings(tournamentId);
  const maxPlayers = Number(settings.max_players);
  const game_mode = settings.game_mode as "public" | "private";
  
  const isAdmin = await isTournamentAdmin(created_by);
  const isPublic = game_mode === "public";

  // Player Slots
  const sideBar = document.createElement("div");
  sideBar.id = "player-slots";
  sideBar.className = "flex flex-col gap-4 w-64";
  main.appendChild(sideBar);

  for (let i = 0; i < maxPlayers; i++) {
    const playerForSlot = players.find(u => u.slotIndex === i);
    let state: SlotState;

    if (!playerForSlot) {
      state = { kind: "open" };
    } else if (playerForSlot.status === "pending") {
      state = { kind: "pending", player: playerForSlot };
    } else { 
      state = { kind: "filled", player: playerForSlot };
    }

    let fetchCandidates: SlotOptions["fetchCandidates"];
    if (isAdmin) {
      fetchCandidates = () => getAvailablePlayers(tournamentId);
    }

    let onInvite: SlotOptions["onInvite"];
    if (isAdmin) {
      onInvite = async (slotIndex: number, userId: number) => {
        try {
          await invitePlayerToSlot(tournamentId, slotIndex, userId);
          await renderTournamentLobby(tournamentId);
        } catch (err) {
          console.error(err);
          alert((err as Error).message ?? 'Could not invite player');
        }
      };
    }

    let onClick: SlotOptions["onClick"];
    if (!isAdmin && isPublic && state.kind === "open") {
      onClick = async () => {
        await fetch(`/tournaments/${tournamentId}/join`, {
          method: "PATCH",
          credentials: "include"
        });
        await renderTournamentLobby(tournamentId);
      };
    }

    const slotElement = buildPlayerSlot({
      slotIndex: i,
      state,
      fetchCandidates,
      onInvite,
      onClick
    });

    sideBar.appendChild(slotElement.el);
  }


  // Admin Buttons
  const btnContainer = document.createElement("div");
  btnContainer.className = "absolute inset-x-0 bottom-0 pb-6 flex flex-col items-center gap-4";
  main.appendChild(btnContainer);

  const commonBtn =
    "w-full max-w-xs text-xl font-semibold py-3 px-10 rounded-md shadow-sm transition";
  if (isAdmin) {
    const seedBtn = document.createElement("button");
    seedBtn.textContent = "Seed";
    seedBtn.className = `${commonBtn} bg-gradient-to-r from-orange-500 to-orange-400 hover:opacity-90`;
    btnContainer.appendChild(seedBtn);
  }
  const leaveBtn = document.createElement("button");
  if (isAdmin) {
    leaveBtn.textContent = "Delete";
  } else {
    leaveBtn.textContent = "Leave";
  }
  leaveBtn.className =`${commonBtn} bg-gradient-to-r from-red-400 to-red-400 hover:opacity-90`;
  btnContainer.appendChild(leaveBtn);

  // Chat Area
  const chatBox = document.createElement("div");
  chatBox.className =
    "flex-1 basis-2/3 max-w-2/3 bg-[#1a3a5a] rounded-lg p-4 h-250 flex flex-col shadow-lg";
  main.appendChild(chatBox);

  const messagesList = document.createElement("div");
  messagesList.className = "flex-1 overflow-y-auto mb-4 space-y-2";
  chatBox.appendChild(messagesList);

  const form = document.createElement("form");
  form.className = "flex justify-end";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type a message…";
  input.className = 
    "flex-grow rounded-l-md px-3 py-2 text-white bg-[#162e4f] placeholder-gray-400 focus:outline-none"
  form.appendChild(input);


  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.textContent = "Send";
  sendBtn.className = 
    "bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 rounded-r-md ";
  form.appendChild(sendBtn);

  chatBox.appendChild(form);

  function appendMessage(msg: { from: number; message: string }) {
    const el = document.createElement("div");
    el.className = "text-sm";
    const player = players.find((p) => p.id === msg.from);
    const name = player?.alias || player?.username || `#${msg.from}`;
    el.innerHTML = `<strong>${name}</strong>: ${msg.message}`;
    messagesList.appendChild(el);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  const token = localStorage.getItem("token");
  const roomId  = Number(await getTournamentChatRoom(tournamentId)); 
  console.log("Chat room ID:", roomId); //!Delete
  const wsChat = new WebSocket(
    `wss://${location.host}/chat?token=${token}`
  );

  let roomJoined = false;
  wsChat.addEventListener("open", () => {
    console.log("WebSocket connection opened for chat");
    console.log("WebSocket readyState:", wsChat.readyState);
    console.log("Joining chat room:", roomId);
    wsChat.send(JSON.stringify({ action: "join", room: roomId, scope: "group" }));
  });

  wsChat.addEventListener("message", (event) => {
    console.log("Received WebSocket message:", event.data);
    try {
      const rawMessage = event.data;
      if (typeof rawMessage === 'string') {
        if (rawMessage === 'Room joined') {
          roomJoined = true;
          console.log("Successfully joined room");
          return;
        }
        if (rawMessage.includes('You must join the room')) {
          console.log("Error: Must join room first");
          return;
        }
        if (rawMessage.includes('User:') && rawMessage.includes('connected')) {
          console.log("WebSocket connected");
          return;
        }
        try {
          const data = JSON.parse(rawMessage);
          if (typeof data === "object" && "message" in data && "from" in data) {
            appendMessage(data);
          }
        } catch {
          console.log("Received plain text message:", rawMessage);
        }
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
      console.error("Raw message data:", event.data);
    }
  });

  wsChat.addEventListener("close", () => {
    console.log("WebSocket connection closed for chat");
    setTimeout(() => {
      renderTournamentLobby(tournamentId);
    }, 1000);
  });

  wsChat.addEventListener("error", (event) =>
    console.error("chat socket error:", event)
  );

  

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!roomJoined) {
      console.log("Not joined to chat room yet");
      alert("Chat connection not established. Please wait.");
      return;
    }

    const text = input.value.trim();
    if (!text) {
      console.log("Empty message, not sending");
      return;
    }
    if (wsChat.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected");
      alert("Chat connection lost. Please refresh the page.");
      return;
    }

    appendMessage({ from: userId, message: text });
    wsChat.send(JSON.stringify({ action: "send", room: roomId, scope: "group", message: text }));
    input.value = "";
  });

  sendBtn.addEventListener("click", () => {
    form.requestSubmit();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });


  const ws = new WebSocket(
    `wss://${location.host}/tournaments/${tournamentId}/ws`
  );
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('WebSocket message received:', msg);
    if (msg.type === 'player-joined' || msg.type === 'player-left') {
      renderTournamentLobby(tournamentId);
    }
  }
}