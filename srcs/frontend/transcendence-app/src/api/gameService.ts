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
