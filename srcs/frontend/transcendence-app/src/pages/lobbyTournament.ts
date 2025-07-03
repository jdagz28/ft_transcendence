import { setupAppLayout} from "../setUpLayout";
import { buildPlayerSlot, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentName, getTournamentSettings, getAvailablePlayers, 
  invitePlayerToSlot, getTournamentCreator, isTournamentAdmin } from "../api/tournament";

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

  // const userId = await whoAmI();
  // let authorized = false;
  // for (const player of players) {
  //   if (player.userId === userId.data.id) {
  //     authorized = true;
  //     break;
  //   }
  // }
  // if (!authorized) {
  //   window.location.hash = "#/"; 
  //   return;
  // }

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
  leaveBtn.textContent = "Leave";
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