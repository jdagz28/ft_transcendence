/* src/pages/renderTournamentGameLobby.ts */
import { setupAppLayout, whoAmI } from "../setUpLayout";
import { getGamePlayersTournament, startGame } from "../api/game";   
import type { TourPlayer } from "../types/game_api";
import { getTournamentCreator, isTournamentAdmin } from "../api/tournament";
import type { RouteParams } from "../router";

function buildPlayerCard(player: TourPlayer, playerNumber: number): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "relative flex flex-col items-center w-full";

  const avatarWrap = document.createElement("div");
  avatarWrap.id = `avatar${playerNumber}`;
  avatarWrap.className = "h-48 w-48 rounded-full bg-white mx-auto overflow-hidden";
  const img = document.createElement("img");
  img.src = player.avatarUrl;
  img.alt = player.username;
  img.className = "w-full h-full object-cover";
  avatarWrap.appendChild(img);

  const overlay = document.createElement("h2");
  overlay.className = "absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white";

  const controlPanel = document.createElement("div");
  controlPanel.className = "bg-[rgba(20,50,90,0.70)] rounded-md px-4 py-2 w-72 h-24 flex items-center justify-between";

  const leftControl = document.createElement("div");
  leftControl.className = "h-12 w-12 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[32px]";
  leftControl.textContent = playerNumber === 1 ? "W" : "↑";

  const usernameContainer = document.createElement("div");
  usernameContainer.className = "flex-1 mx-3 flex flex-col items-center justify-center";
  
  const aliasSpan = document.createElement("span");
  aliasSpan.className = "text-2xl font-bold text-center truncate max-w-full";
  aliasSpan.textContent = player.alias ?? player.username;
  

  const sublabel = document.createElement("span");
  sublabel.className = "text-xs font-light text-gray-300 -mt-0.5"; 
  sublabel.textContent = player.username;

  usernameContainer.append(aliasSpan, sublabel);

  const rightControl = document.createElement("div");
  rightControl.className = "h-12 w-12 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[32px]";
  rightControl.textContent = playerNumber === 1 ? "S" : "↓";

  controlPanel.append(leftControl, usernameContainer, rightControl);
  overlay.appendChild(controlPanel);
  card.append(avatarWrap, overlay);

  return card;
}

function buildVsLabel(): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "text-6xl font-extrabold select-none";
  span.textContent = "VS";
  return span;
}


export async function renderTournamentGameLobby(params: RouteParams): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className =
    "flex-grow flex flex-col items-center justify-center " +
    "bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] text-white";

  contentContainer.innerHTML = "";                     
  const tournamentId = Number(params.tournamentId);
  const gameId       = Number(params.gameId);

  const user = await whoAmI();
  if (!user.success) {
    window.location.hash = "#/";
    return;
  }

  const creatorId = await getTournamentCreator(tournamentId);
  console.log("Tournament creator ID:", creatorId);
  const isAdmin = await isTournamentAdmin(creatorId);
  const players: TourPlayer[] = await getGamePlayersTournament(gameId);
  if (
    players.length !== 2 ||
    !(
      players.some((p) => p.id === user.data.id) ||
      isAdmin
    )
  ) {
    window.location.hash = "/403";
    return;
  }

  const lobbyWrap = document.createElement("div");
  lobbyWrap.className = "flex flex-col items-center gap-24 py-20";
  contentContainer.appendChild(lobbyWrap);

  const [p1, p2] = players;
  const row = document.createElement("div");
  row.className = "flex items-center justify-center gap-28 w-full";
  row.append(buildPlayerCard(p1, 1), buildVsLabel(), buildPlayerCard(p2, 2));
  lobbyWrap.appendChild(row);

  const startBtn = document.createElement("button");
  startBtn.id = "startBtn";
  startBtn.textContent = "Start";
  startBtn.className =
    "bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase " +
    "text-4xl px-16 py-4 rounded-lg shadow-lg transition";
  lobbyWrap.appendChild(startBtn);

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    try {
      await startGame(gameId, p1, p2);
      alert("Game started successfully!");
      // window.location.hash = `#/game/${gameId}/play`;  
    } catch (err) {
      console.error(err);
      startBtn.disabled = false;
    }
  });
}