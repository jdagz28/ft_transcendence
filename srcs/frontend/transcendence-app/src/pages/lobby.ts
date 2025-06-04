import type { RouteParams } from "../router";

interface CreateGameLobby {
  mode:
    | "training"
    | "single-player"
    | "local-multiplayer"
    | "online-multiplayer";
  maxPlayers: number;
  priv: boolean;
  invitedPlayers: string[];
  loggedInPlayers: string[];
  gameId: string;
}

export function renderGameNewPage(params: RouteParams): void {
	const root = document.getElementById("app");
	if (!root) return;
	 root.innerHTML = /*html*/`
	<nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-white text-sm font-semibold">
    	<div class="flex items-center gap-6">
    		<div class="text-xl font-bold">🌊</div>
    			<a href="#">Dashboard</a>
				<a href="#">Games</a>
				<a href="#">Tournament</a>
				<a href="#">Leaderboard</a>
				<a href="#">Chat</a>
			</div>
		<div class="flex items-center gap-4">
			<span class="text-xl">🔔</span>
			<div class="w-8 h-8 bg-white rounded-full"></div>
    	</div>
	</nav>`;
	const initialMode = (params.mode ?? "training") as CreateGameLobby["mode"];
}