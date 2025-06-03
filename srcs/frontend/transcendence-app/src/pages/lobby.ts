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
  gameId: string;
}

export function renderGameNewPage(params: RouteParams): void {
	const root = document.getElementById("app");
	if (!root) return;
}