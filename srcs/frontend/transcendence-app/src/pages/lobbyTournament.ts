import { setupAppLayout, whoAmI } from "../setUpLayout";
import { buildPlayerSlot, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentName, getTournamentSettings, getAvailablePlayers, 
  invitePlayerToSlot, getTournamentCreator, isTournamentAdmin, getTournamentChatRoom } from "../api/tournament";
import { ROUTE_MAIN } from "@/router";

interface ChatMessage {
  from: number;
  message: string;
  username?: string;
}


let lobbyWs: WebSocket | null = null;
let lobbyRoomJoined = false;


async function connectLobbyChat(
  roomId: number,
  token: string,
  onMessage: (msg: ChatMessage ) => void
) {
  if (lobbyWs) return;

  lobbyWs = new WebSocket(
    `wss://${location.host}/chat?token=${encodeURIComponent(token)}`
  );

  lobbyWs.addEventListener("open", () => {
    console.log("WebSocket connection opened for lobby chat");
    setTimeout(() => {
      if (lobbyWs) {
        console.log("Joining chat room:", roomId);
        lobbyWs.send(JSON.stringify({
          action: 'join',
          scope: 'group',
          room: roomId
        }));
      }
    }, 500);
  });
   

  lobbyWs.addEventListener("message", function bannerListener(ev) {
    if (typeof ev.data === "string" && ev.data === "Room joined") {
      lobbyRoomJoined = true;
      lobbyWs!.removeEventListener("message", bannerListener);
      fetch(`/chat/group/${roomId}/history`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        credentials: "include"
      })
      .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
      .then((previousMessages: any[]) => {
        previousMessages.forEach((msg: any) => {
          onMessage({
            from: msg.sender_id,
            message: msg.content,
            username: msg.username
          });
        });
      })

      .catch(err => console.error("Failed to fetch previous chat messages:", err));
      return;
    }
    try {
      const data = JSON.parse(ev.data as string);
      if (data.message && data.from) onMessage(data);
    } catch {}
  });


  lobbyWs.addEventListener("close", () => {
    lobbyWs = null;
    lobbyRoomJoined = false;
  });
}



export async function renderTournamentLobby(tournamentId: number): Promise<void> {
  const token = localStorage.getItem("token") || "" ;
  if (!token) {
    console.error("No token found, redirecting to login");
    window.location.hash = "#/login";
  }
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

    let onAddAi: SlotOptions["onAddAi"];
    if (isAdmin && state.kind === "open") {
      onAddAi = async (slotIndex: number) => {
        await fetch(`/tournaments/${tournamentId}/ai`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          credentials: "include",
          body: JSON.stringify({ slotIndex: Number(slotIndex)  })
        });
        await renderTournamentLobby(tournamentId);
      };
    }

    const slotElement = buildPlayerSlot({
      slotIndex: i,
      state,
      fetchCandidates,
      onInvite,
      onClick,
      onAddAi
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

    seedBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`/tournaments/${tournamentId}/start`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error("Failed to seed tournament");
        }
        alert("Tournament seeded successfully!");
        // window.location.hash = `#/tournaments/${tournamentId}`;
      } catch (err) {
        console.error(err);
        alert((err as Error).message ?? 'Could not seed tournament');
      }
    });
  }
  const leaveBtn = document.createElement("button");
  if (isAdmin) {
    leaveBtn.textContent = "Delete";
  } else {
    leaveBtn.textContent = "Leave";
  }
  leaveBtn.className =`${commonBtn} bg-gradient-to-r from-red-400 to-red-400 hover:opacity-90`;
  btnContainer.appendChild(leaveBtn);

  leaveBtn.addEventListener("click", async () => {
    try {
      let response
      if (isAdmin) {
        response = await fetch(`/tournaments/${tournamentId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
      } else {
        response = await fetch(`/tournaments/${tournamentId}/leave`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
      }
      if (!response.ok) {
        throw new Error("Failed to leave tournament");
      }
      window.location.hash = ROUTE_MAIN;
    } catch (err) {
      console.error(err);
      alert((err as Error).message ?? 'Could not leave tournament');
    }
  });

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

  function appendMessage(msg: ChatMessage) {
    const el = document.createElement("div");
    el.className = "text-sm";
    const player = players.find((p) => p.id === msg.from);
    const name = player?.alias || player?.username || msg.username || `#${msg.from}`;
    el.innerHTML = `<strong>${name}</strong>: ${msg.message}`;
    messagesList.appendChild(el);
    messagesList.scrollTop = messagesList.scrollHeight;
  }


  const roomId  = Number(await getTournamentChatRoom(tournamentId)); 
  console.log("Connecting to chat room:", roomId);
  connectLobbyChat(roomId, token, appendMessage);
  
  
  form.addEventListener("submit", (event) => {
    event.preventDefault();
     if (!lobbyRoomJoined || !lobbyWs || lobbyWs.readyState !== WebSocket.OPEN) {
      alert("Chat connection not ready");
      return;
    }

    const text = input.value.trim();
    if (!text) {
      console.log("Empty message, not sending");
      return;
    }
    // appendMessage({ from: userId, message: text });s
    lobbyWs.send(JSON.stringify({ action: "send", room: roomId, scope: "group", message: text }));
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
