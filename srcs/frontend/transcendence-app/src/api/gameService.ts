import type { GameStatusUpdate } from '../types/game_api';

export async function getConfig(gameId: number): Promise<any> {
  const response = await fetch(`https://localhost:4242/games/${gameId}/details`, {
    method: 'GET',
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

  if (body.status == 'aborted' && navigator.sendBeacon) {
    // sendBeacon for aborted status to ensure it is sent even if the page unloads
    navigator.sendBeacon(`/games/${gameId}/status`,
       new Blob([json], { type: 'application/json' })
    );
    return;
  }

  await fetch(`/games/${gameId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: json
  });
}

export async function getAiId(){
  const aiId = await fetch('https://localhost:4242/users/ai', {
    method: 'GET',
    credentials: 'include'
  });
  if (!aiId)
    throw new Error('AI user not set up');
  return Number(aiId);
}