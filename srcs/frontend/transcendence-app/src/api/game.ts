import type { TourPlayer } from "@/types/game_api";

export async function getGamePlayers(gameId: number): Promise<any> {
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
    avatar: string;
  }>;

  return data.map(player => ({
    id: player.player_id,
    username: player.username,
    paddle_loc: player.paddle_loc,
    alias: player.alias,
    avatar: player.avatar
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


export async function isTournamentAdmin(gameId: number): Promise<boolean> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/games/${gameId}/isTourAdmin`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to check admin status for tournament ${gameId}`);
  }
  const data = await response.json();
  
  return data.isAdmin;
}

export async function isGameCreator(gameId: number, userId: number): Promise<boolean> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/games/${gameId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to check creator status for game ${gameId}`);
  }
  const data = await response.json();

  return data.created_by === userId;
}

export async function getGameOptions(gameId: number): Promise<any> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/games/${gameId}/options`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch options for game ${gameId}`);
  }
  const data = await response.json();
  return data;
}

export async function updateGameOptions(gameId: number, num_games: number, num_matches: number): Promise<any> {
  const token = localStorage.getItem("token");
  const requestBody = {
    num_games,
    num_matches
  };

  const response = await fetch(`/games/${gameId}/options`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    throw new Error(`Failed to update options for game ${gameId}`);
  }
  return response.json();
}