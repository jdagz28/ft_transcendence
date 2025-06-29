export async function getTournamentPlayers(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/players`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tournament players for ${tournamentId}`);
  }
  return await response.json();
}

export async function getTournamentName(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to get tournament info for ${tournamentId}`);
  }
  const result=  await response.json();
  console.log(result);

  return result.name;
}