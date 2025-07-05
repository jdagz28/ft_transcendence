import type { TourPlayer } from "@/types/game_api";

export async function getGamePlayersTournament(gameId: number): Promise<any> {
  const token = localStorage.getItem("token");
  const response = await fetch(`games/${gameId}/players`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch players for game ${gameId}`);
  }
  const data = await response.json() as Array<{
    player_id: number;
    username: string;
    paddle_loc: string;
    alias?: string;
    avatarUrl: string;
  }>;

  return data.map(player => ({
    id: player.player_id,
    username: player.username,
    paddle_loc: player.paddle_loc,
    alias: player.alias,
    avatarUrl: player.avatarUrl
  }));
}

export async function startGame(gameId: number, player1: TourPlayer, player2: TourPlayer): Promise<void> {
  const token = localStorage.getItem("token");

  const requestBody = {
    options: [
      {
        userId: player1.id,
        paddle_loc: "left"
      },
      {
        userId: player2.id,
        paddle_loc: "right"
      }
    ]
  };

  const response = await fetch(`/games/${gameId}/start`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    throw new Error(`Failed to start game ${gameId}`);
  }
  return;
}