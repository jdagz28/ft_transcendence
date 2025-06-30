import { setupAppLayout } from "../setUpLayout";
import { buildPlayerSlot, assignSlots, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentName, getTournamentSettings, getAvailablePlayers, invitePlayerToSlot, getTournamentCreator, isTournamentAdmin} from "../api/tournament";

const reservedSlots: Record<number, number> = {};

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
  main.className = "flex justify-start gap-8 px-8 py-10";
  contentContainer.appendChild(main);

  const players: Player[]  = await getTournamentPlayers(tournamentId);
  const created_by = await getTournamentCreator(tournamentId);
  const settings = await getTournamentSettings(tournamentId);
  const maxPlayers = Number(settings.max_players);
  const game_mode = settings.game_mode as "public" | "private";
  
  const isAdmin = await isTournamentAdmin(created_by);
  const isPublic = game_mode === "public";

  // Player Slots
  const sideBar = document.createElement("div");
  sideBar.id = "player-slots";
  sideBar.className = "flex flex-col gap-4 flex-grow";
  main.appendChild(sideBar);

  const playersWithSlots = assignSlots(
    players,
    maxPlayers,
    created_by,
    reservedSlots
  );

 for (let i = 0; i < maxPlayers; i++) {
    const entry =  playersWithSlots.find(p => p.slotIndex === i);
    const state: SlotState = entry
      ? { kind: 'filled', player: entry }
      : { kind: 'open' };

    const slotOpts: SlotOptions = {
      slotIndex: i,
      state,
      fetchCandidates: isAdmin
         ? (_slotIndex: number) => getAvailablePlayers(tournamentId)
        : undefined,
      onInvite: isAdmin
        ? async (slotIndex: number, userId: number) => {
            await invitePlayerToSlot(tournamentId, slotIndex, userId);
            reservedSlots[userId] = slotIndex;
            await renderTournamentLobby(tournamentId);
          }
        : undefined,
      onClick: !isAdmin && isPublic && state.kind === 'open'
        ? async () => {
            await fetch(`/tournaments/${tournamentId}/join`, {
              method: 'PATCH',
              credentials: 'include'
            });
            await renderTournamentLobby(tournamentId);
          }
        : undefined
    };

    const slotComponent = buildPlayerSlot(slotOpts);
    sideBar.appendChild(slotComponent.el);
  }

  // Admin Buttons
  const btnContainer = document.createElement("div");
  btnContainer.className = "mt-auto flex flex-col gap-3 w-48";
  main.appendChild(btnContainer);

  const commonBtn =
  "w-full text-xl font-semibold py-3 rounded-md transition";
  if (isAdmin) {
    const seedBtn = document.createElement("button");
    seedBtn.textContent = "Seed";
    seedBtn.className = `${commonBtn} bg-gradient-to-r from-green-600 to-green-500 hover:opacity-90`;
    btnContainer.appendChild(seedBtn);
  }
  const leaveBtn = document.createElement("button");
  leaveBtn.textContent = "Leave";
  leaveBtn.className =`${commonBtn} bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90`;
  btnContainer.appendChild(leaveBtn);

  // Chat Area
  const chatBox = document.createElement("div");
  chatBox.className = "flex-1 bg-[#1a3a5a] rounded-lg";
  main.appendChild(chatBox);

  

}