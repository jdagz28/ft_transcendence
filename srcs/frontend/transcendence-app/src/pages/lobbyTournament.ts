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
let lobbyMessageHandler: ((ev: MessageEvent) => void) | null = null;

async function connectLobbyChat(
  roomId: number,
  token: string,
  onMessage: (msg: ChatMessage ) => void
) {
  if (!lobbyWs) {
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

    lobbyWs.addEventListener("close", () => {
      lobbyWs = null;
      lobbyRoomJoined = false;
      lobbyMessageHandler = null;
    });
  }
   
  if (lobbyMessageHandler) {
    lobbyWs.removeEventListener("message", lobbyMessageHandler);
  }

  lobbyMessageHandler = (ev: MessageEvent) => {
    if (typeof ev.data === "string" && ev.data === "Room joined") {
      lobbyRoomJoined = true;
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
  };

  lobbyWs.addEventListener("message", lobbyMessageHandler);
  if (lobbyRoomJoined) {
    lobbyMessageHandler(new MessageEvent("message", { data: "Room joined" }));
  }
  
}

let cachedAuthFlow: (() => Promise<string>) | null = null;
function ensureAuthModals(): () => Promise<string> {
  if (cachedAuthFlow) return cachedAuthFlow;

  const inputHTML =
    '<input maxlength="1" class="w-12 h-12 bg-[#081a37] text-white text-center text-xl rounded" />';
  const sixInputs = Array(6).fill(inputHTML).join("");

  if (!document.getElementById("local-login-modal")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="local-login-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40">
        <div class="relative w-96 rounded-lg bg-[#0f2a4e] border-4 border-white p-8">
          <button id="local-login-close" class="absolute top-3 right-3 text-2xl font-bold text-gray-300">&times;</button>
          <div class="flex flex-col items-center">
            <img src="/icons8-rocket.svg" class="w-24 h-24 mb-6"/>
            <h2 class="text-3xl font-bold text-white mb-6">LOGIN</h2>
          </div>
          <form id="local-login-form" class="space-y-5">
            <input id="local-username" class="w-full bg-[#081a37] text-white rounded px-4 py-2 placeholder-gray-400" placeholder="Username"/>
            <input id="local-password" type="password" class="w-full bg-[#081a37] text-white rounded px-4 py-2 placeholder-gray-400" placeholder="Password"/>
            <button class="w-full bg-gradient-to-r from-orange-500 to-orange-400 py-3 rounded font-semibold text-xl text-white">Login</button>
            <div id="local-login-error" class="text-red-400 text-sm text-center hidden"></div>
          </form>
        </div>
      </div>

      <div id="local-mfa-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40">
        <div class="relative w-96 rounded-lg bg-[#0f2a4e] border-4 border-white p-8">
          <button id="local-mfa-close" class="absolute top-3 right-3 text-2xl font-bold text-gray-300">&times;</button>
          <h2 class="text-center text-3xl font-bold text-white mb-6">Enter 2FA Code</h2>
          <div id="code-box" class="flex justify-center space-x-2 mb-6">
            ${sixInputs}
          </div>
          <button id="local-mfa-verify" class="w-full bg-gradient-to-r from-orange-500 to-orange-400 py-3 rounded font-semibold text-xl text-white">Verify</button>
          <div id="local-mfa-error" class="text-red-400 text-sm text-center hidden mt-3"></div>
        </div>
      </div>
      `
    );
  }

  const $ = (id: string) => document.getElementById(id)!;
  const loginModal = $("local-login-modal");
  const mfaModal = $("local-mfa-modal");

  cachedAuthFlow = () =>
    new Promise<string>((resolve, reject) => {
      loginModal.classList.remove("hidden");

      $("local-login-close").onclick = () => {
        loginModal.classList.add("hidden");
        reject("cancel");
      };

      $("local-login-form").onsubmit = async (e) => {
        e.preventDefault();
        const user = ($("local-username") as HTMLInputElement).value.trim();
        const pass = ($("local-password") as HTMLInputElement).value;

        if (!user || !pass) return;

        try {
          const r = await fetch("/auth/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username: user, password: pass })
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.message ?? "login failed");

          if (data.mfaRequired) {
            loginModal.classList.add("hidden");
            mfaModal.classList.remove("hidden");

            const inputs = Array.from(
              $("code-box").querySelectorAll("input") as NodeListOf<HTMLInputElement>
            );
            inputs[0].focus();

            $("local-mfa-close").onclick = () => {
              mfaModal.classList.add("hidden");
              reject("cancel");
            };

            $("local-mfa-verify").onclick = async () => {
              const code = inputs.map((i) => i.value).join("");
              if (code.length !== 6) return;

              const vr = await fetch(`/auth/${data.userId}/mfa/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token: code })
              });
              const vData = await vr.json();
              if (!vr.ok) {
                $("local-mfa-error").textContent =
                  vData.message ?? "wrong code";
                $("local-mfa-error").classList.remove("hidden");
                return;
              }
              mfaModal.classList.add("hidden");
              resolve(vData.token);
            };

            return;
          }

          loginModal.classList.add("hidden");
          resolve(data.token);
        } catch (err: any) {
          $("local-login-error").textContent = err.message ?? "error";
          $("local-login-error").classList.remove("hidden");
        }
      };
    });

  return cachedAuthFlow;
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
  if (!authorized ) {
    window.location.hash = "/403"; 
    return;
  }

  const created_by = await getTournamentCreator(tournamentId);
  const settings = await getTournamentSettings(tournamentId);
  const maxPlayers = Number(settings.max_players);
  
  const isAdmin = await isTournamentAdmin(created_by);

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

    let onLocalConnect: SlotOptions["onLocalConnect"];
    if (state.kind === "open") {
      const authFlow = ensureAuthModals(); 

      onLocalConnect = async (slotIndex: number) => {
        try {
          const token = await authFlow(); 
          const response = await fetch(`/tournaments/${tournamentId}/join`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Authorization": `Bearer ${token}` ,
                      "Content-Type": "application/json"},
            body: JSON.stringify({ slotIndex })
          });
          if (!response.ok) throw new Error("could not join");
          await renderTournamentLobby(tournamentId);  
        } catch (err) {
          if (err !== "cancel") console.error(err);
        }
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
      onAddAi,
      onLocalConnect
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
        window.location.hash = `#/tournaments/${tournamentId}/bracket`;
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
