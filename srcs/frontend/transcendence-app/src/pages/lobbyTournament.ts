import { setupAppLayout } from "../setUpLayout";
import { buildPlayerSlot, type Player, type SlotState, type SlotOptions } from "../components/playerSlots";
import { getTournamentPlayers, getTournamentName, getTournamentSettings, getAvailablePlayers, invitePlayerToSlot } from "../api/tournament";


export async function renderTournamentLobby(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = 
    "flex-grow flex justify-start gap-8 px-8 py-10 text-white";

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
  const { maxPlayers, game_mode } = await getTournamentSettings(tournamentId); 
  const isAdmin = true; // TODO: replace with real admin check
  const isPublic = game_mode === "public";

  // Player Slots
  const sideBar = document.createElement("div");
  sideBar.id = "player-slots";
  sideBar.className = "flex flex-col gap-4";
  main.appendChild(sideBar);

 for (let i = 0; i < maxPlayers; i++) {
    const entry = (players as Array<Player & { slotIndex: number }>).find(
      p => p.slotIndex === i
    ); 

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
        ? (slotIndex: number, userId: number) =>
            invitePlayerToSlot(tournamentId, slotIndex, userId)
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
  btnContainer.className = "flex flex-col gap-2 mt-4";
  main.appendChild(btnContainer);
  if (isAdmin) {
    const seedBtn = document.createElement("button");
    seedBtn.textContent = "Seed";
    seedBtn.className = "px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700";
    btnContainer.appendChild(seedBtn);
  }
  const leaveBtn = document.createElement("button");
  leaveBtn.textContent = "Leave";
  leaveBtn.className = "px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700";
  btnContainer.appendChild(leaveBtn);

  // Chat Area
  const chatBox = document.createElement("div");
  chatBox.className = "flex-1 bg-[#1a3a5a] rounded-lg";
  main.appendChild(chatBox);

  

}