import { setupAppLayout, whoAmI } from "../setUpLayout";
import { buildPlayerSlot, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentDetails, getTournamentSettings, getAvailablePlayers, invitePlayerToSlot, getTournamentCreator, getTournamentAlias, isTournamentAdmin } from "../api/tournament";
import { ROUTE_MAIN } from "../router";


let cachedAuthFlow: (() => Promise<{token: string, alias: string}>) | null = null;
function ensureAuthModals(): () => Promise<{token: string, alias: string}> {
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

      <div id="local-alias-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/40">
        <div class="relative w-96 rounded-lg bg-[#0f2a4e] border-4 border-white p-8">
          <h2 class="text-center text-3xl font-bold text-white mb-6">Enter Your Alias</h2>
          <p class="text-center text-gray-300 mb-6 text-sm">You must set an alias for this tournament.</p>
          <form id="local-alias-form" class="space-y-5">
            <input id="local-alias-input" class="w-full bg-[#081a37] text-white rounded px-4 py-2 placeholder-gray-400" placeholder="" required />
            <button class="w-full bg-gradient-to-r from-orange-600 to-orange-400 py-3 rounded font-semibold text-xl text-white">Confirm Alias</button>
            <div id="local-alias-error" class="text-red-400 text-sm text-center hidden mt-3"></div>
          </form>
        </div>
      </div>
      `
    );
  }

  const $ = (id: string) => document.getElementById(id)!;
  const loginModal = $("local-login-modal");
  const mfaModal = $("local-mfa-modal");
  const aliasModal = $("local-alias-modal"); 

  cachedAuthFlow = () =>
    new Promise<{token: string, alias: string}>((resolve, reject) => { 
      
      const handleAuthSuccess = async (token: string) => {
        loginModal.classList.add("hidden");
        mfaModal.classList.add("hidden");
        aliasModal.classList.remove("hidden");

        const response = await fetch("/users/me", {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` },
          credentials: "include"
        });
        if (!response) {
          reject("Failed to fetch user data");
          return;
        }
        const userData = await response.json();

        const nickname = userData.nickname || userData.username;

        const aliasInput = $("local-alias-input") as HTMLInputElement;
        const aliasForm = $("local-alias-form");
        const aliasError = $("local-alias-error");
        
        aliasInput.placeholder = nickname;
        aliasInput.value = nickname;  
        aliasInput.focus();

        aliasForm.onsubmit = (e) => {
          e.preventDefault();
          const alias = aliasInput.value.trim();
          if (!alias) {
            alert("Alias cannot be empty");
            return;
          }
          if (alias.length < 3 || alias.length > 15) {
            alert("Alias must be between 3 and 15 characters");
            return;
          }
          if (!/^[a-zA-Z0-9_!$#-]+$/.test(alias)) {
            alert("Alias can only contain alphanumeric characters and special characters (!, $, #, -, _)");
            return;
          }
          if (alias) {
            aliasModal.classList.add("hidden");
            resolve({ token, alias });
          } else {
            aliasError.textContent = "Alias cannot be empty.";
            aliasError.classList.remove("hidden");
          }
        };
      };

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
              handleAuthSuccess(vData.token);
            };

            return;
          }
          handleAuthSuccess(data.token);
        } catch (err: any) {
          $("local-login-error").textContent = err.message ?? "error";
          $("local-login-error").classList.remove("hidden");
        }
      };
    });

  return cachedAuthFlow;
}


export async function renderTournamentLobby(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = 
    "flex-grow flex flex-col items-center gap-8 px-8 py-10 text-white";

  const tournamentDetails = await getTournamentDetails(tournamentId);
  if (tournamentDetails.status !== "pending" && tournamentDetails.status !== "active") {
    window.location.hash = `#/400`;
  } else if (tournamentDetails.status === "active") {
    window.location.hash = `#/tournaments/${tournamentId}/bracket`;
  }
  const tournamentName = tournamentDetails.name;

  const created_by = await getTournamentCreator(tournamentId);
  if (created_by === -1) {
    console.error("Failed to retrieve tournament creator ID.");
    window.location.hash = "#/400";
    return;
  }
  const creatorAlias = await getTournamentAlias(tournamentId, created_by);
  if (!creatorAlias) {
    window.location.hash = `#/tournaments/${tournamentId}/alias`;
    return;
  }

  const header = document.createElement("div");
  header.className = "text-center py-4";
  const title = document.createElement("h1");
  title.textContent = tournamentName;
  title.className = 
    "text-3xl md:text-4xl font-bold text-white mb-2"; 
  header.appendChild(title);
  contentContainer.appendChild(header);

  const main = document.createElement("div");
  main.className = "flex flex-col items-center px-4 flex-1";
  contentContainer.appendChild(main);

  const players: Player[]  = await getTournamentPlayers(tournamentId);

  const userData = await whoAmI();
  if (!userData.success) {
    console.error("Failed to get user data:", userData.error);
    window.location.hash = "#/";
    return;
  }
  const userId = userData.data.id;
  const userAlias = await getTournamentAlias(tournamentId, userId);
  if (!userAlias) {
    window.location.hash = `#/tournaments/${tournamentId}/alias`;
    return;
  }

  let authorized = false;

  if (players.some(p => p.id === userId) || created_by === userId) {
    authorized = true;
  }

  if (!authorized ) {
    window.location.hash = "/403"; 
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.hash = '#/403';
    return;
  }
  

  const settings = await getTournamentSettings(tournamentId);
  const maxPlayers = Number(settings.max_players);
  const isAdmin = await isTournamentAdmin(created_by);

  const slotsWrapper = document.createElement("div");
  slotsWrapper.className =
    "flex flex-col items-center justify-center flex-grow";
  main.appendChild(slotsWrapper);

  const sideBar = document.createElement("div");
  sideBar.id = "player-slots";
  sideBar.className = "flex flex-col items-center gap-4 w-64";
  slotsWrapper.appendChild(sideBar);

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
          const { token, alias } = await authFlow(); 
          const response = await fetch(`/tournaments/${tournamentId}/join`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` ,
                      "Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({ slotIndex })
          });
          if (!response.ok) throw new Error("could not join");
          
          const aliasResponse = await fetch(`/tournaments/${tournamentId}/alias`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` ,
                      "Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({ alias })
          });
          if (!aliasResponse.ok) throw new Error("could not set alias");

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
  btnContainer.className = "flex flex-col items-center gap-4 w-full pt-8 mt-auto";
  main.appendChild(btnContainer);

  const commonBtn =
    "w-full max-w-xs text-xl font-semibold py-3 px-10 rounded-md shadow-sm transition";
  if (isAdmin) {
    const seedBtn = document.createElement("button");
    seedBtn.textContent = "Start Tournament";
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
          throw new Error("Failed to start tournament");
        }
        console.log(`response`, response);

        const tournamentData = await fetch(`/tournaments/${tournamentId}/players`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        const tournamentDataJson = await tournamentData.json();

        const p1Id = tournamentDataJson[0]?.id || null;
        const p2Id = tournamentDataJson[1]?.id || null;
        const p3Id = tournamentDataJson[2]?.id || null;
        const p4Id = tournamentDataJson[3]?.id || null;
        
        const createGroupResponse = await fetch(`/chat/createGroupGame`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          credentials: "include",
          body: JSON.stringify({
            name: tournamentName, 
            p1: p1Id, 
            p2: p2Id, 
            p3: p3Id, 
            p4: p4Id, 
            tournamentId
          })
        })
        
        if (!createGroupResponse.ok) {
          throw new Error("Failed to create group chat");
        }

        window.location.hash = `#/tournaments/${tournamentId}/bracket`;
      } catch (err) {
        console.error(err);
        alert((err as Error).message ?? 'Could not start tournament');
      }
    });

    const optionsBtn = document.createElement("button");
    optionsBtn.textContent = "Options";
    optionsBtn.className = `${commonBtn} bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90`;
    btnContainer.appendChild(optionsBtn);
    optionsBtn.addEventListener("click", () => {
      window.location.hash = `#/tournaments/${tournamentId}/options`;
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

  const ws = new WebSocket(
    `wss://${location.host}/tournaments/${tournamentId}/ws`
  );
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'player-joined' || msg.type === 'player-left') {
      renderTournamentLobby(tournamentId);
    }
  }
}
