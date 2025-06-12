import type { RouteParams } from "../router";

/*interface CreateGameLobby {
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
}*/

async function checkLobbyAccess(lobbyId: string, priv: boolean) {
	if (priv === false)
		return true;
  try {
    const response = await fetch('/auth/gamelobby', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Access check failed:', error);
      return false;
    }

    const data = await response.json();
    return data.allowed === true;
  } catch (err) {
    console.error('Fetch error:', err);
    return false;
  }
}

function renderLobbyError(root: HTMLElement) {
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
}

export function renderLobbyPage(params: RouteParams): void {
	const root = document.getElementById("app");
	if (!root) return;
	const game = (params.gameId ?? "");
	const priv = !((params.priv ?? "true") === "false");
	let hasAccess;
	hasAccess = checkLobbyAccess(game, priv).then((hasAccess) => {
	if (!hasAccess) {
		renderLobbyError(root);
		return ;
	}
	//let gameMode = (params.mode ?? "training");
	//let playerCount = 1;
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
	});
	hasAccess = false;
	if (!hasAccess) {
		return ;
	}
}