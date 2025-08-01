import type { GameStatusUpdate } from '../types/game_api';

export async function getConfig(gameId: number): Promise<any> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/games/${gameId}/details`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch game config for ${gameId}`);
  }
  return await response.json();
}

export async function sendStatus(
  gameId: number,
  body: GameStatusUpdate
) {
  const json = JSON.stringify(body);
  const token = localStorage.getItem('token');

  await fetch(`/games/${gameId}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
    body: json
  });
}

export async function setInGameStatus(gameId: number): Promise<void> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/games/${gameId}/in-game`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify({ status: 'in-game' })
  });
  if (!response.ok) {
    throw new Error(`Failed to set in-game status for game ${gameId}`);
  }
}

export async function getTournamentId(gameId: number): Promise<number> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/games/${gameId}/tournament`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    if (response.status === 404) {
      return -1; 
    }
    throw new Error(`Failed to fetch tournament ID for game ${gameId}`);
  }
  const data = await response.json();
  
  return data.tournamentId;
}