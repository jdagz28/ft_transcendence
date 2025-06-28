export async function getTournamentPlayers(tournamentId: number): Promise<any> {
    const response = await fetch(`/tournaments/${tournamentId}/players`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tournament players for ${tournamentId}`);
  }
  return await response.json();
}

export async function getTournamentName(tournamentId: number): Promise<any> {
  const response = await fetch(`/tournaments/${tournamentId}/`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to get tournament info for ${tournamentId}`);
  }
  const { name: tournamentName } =  await response.json();
  return tournamentName;
}