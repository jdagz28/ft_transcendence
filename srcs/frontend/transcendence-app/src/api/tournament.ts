import type { Player } from "../components/playerSlots";

export async function getTournamentPlayers(tournamentId: number): Promise<Player[]> {
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
  return (await response.json()) as Player[];
}

export async function getTournamentCreator(tournamentId: number): Promise<number> {
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
    throw new Error(`Failed to get tournament creator for ${tournamentId}`);
  }
  const result = await response.json();
  return result.created_by;
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
  const result =  await response.json();
  console.log(result);

  return result.name;
}

export async function getTournamentSettings(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/settings`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to get tournament settings for ${tournamentId}`);
  }
  return await response.json();
}

export async function getAvailablePlayers(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";

  const tournamentRes = await fetch(`/tournaments/${tournamentId}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
  });
  if (!tournamentRes.ok) {
    throw new Error(`Couldn’t load tournament ${tournamentId}`);
  }
  const { created_by: adminId } = await tournamentRes.json();

  const currentPlayers = await getTournamentPlayers(tournamentId);
  const occupiedIds = new Set(currentPlayers.map(p => p.id));

  const usersRes = await fetch(`/users`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
  });
  if (!usersRes.ok) {
    throw new Error(`Couldn’t load user list`);
  }
  const allUsers: Player[] = await usersRes.json();

  return allUsers.filter(u => u.id !== adminId && !occupiedIds.has(u.id));
}

export async function invitePlayerToSlot(
  tournamentId: number,
  slotIndex: number,
  userId: number
): Promise<void> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/players`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include',
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    throw new Error(`Failed to invite player ${userId} to slot ${slotIndex} in tournament ${tournamentId}`);
  }
}

export async function isTournamentAdmin(userId: number): Promise<boolean> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/users/me`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to check admin status for user ${userId}`);
  }

  const user = await response.json();
  return user.id === userId;
}
