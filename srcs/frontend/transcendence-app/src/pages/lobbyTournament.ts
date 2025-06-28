// import { setupAppLayout } from "../setUpLayout";
// import { buildPlayerSlot, type Player, type SlotState } from "../components/playerSlots";
// import { getTournamentPlayers } from "../api/tournament";


// interface LobbyPayload {
//   id: number;
//   number: string;
//   maxPlayers: number;
//   players: { slotIndex: number } & Player[]; 
// }


// export async function renderTournamentLobby(tournamentId: number): Promise<void> {
//   const { contentContainer } = setupAppLayout();
//   contentContainer.className = "flex-grow flex justify-start gap-8 px-8 py-10 text-white";

//   // Player Slots
//   const sideBar = document.createElement("div");
//   sideBar.id = "player-slots";
//   sideBar.className = "flex flex-col gap-4";
//   contentContainer.appendChild(sideBar);

//   // Chat Area
//   const chatBox = document.createElement("div");
//   chatBox.className = "flex-1";
//   contentContainer.appendChild(chatBox);

//   const lobby: LobbyPayload = await getTournamentPlayers(tournamentId)

// }