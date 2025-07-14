import type { Player } from "../components/playerSlots";

export async function getTournamentPlayers(tournamentId: number): Promise<Player[]> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/players`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error("Failed to get tournament players:", response.status, response.statusText);
    return [];
  }
  const result = await response.json();

  return result as Player[];
}

export async function getTournamentCreator(tournamentId: number): Promise<number> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error("Failed to get tournament creator:", response.status, response.statusText);
    return -1;
  }
  const result = await response.json();

  return result.created_by;
}

export async function getTournamentDetails(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error("Failed to get tournament details:", response.status, response.statusText);
    return [];
  }
  const result =  await response.json();

  return result;
}

export async function getTournamentSettings(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/settings`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error("Failed to get tournament settings:", response.status, response.statusText);
    return [];
  }

  return await response.json();
}

export async function getAvailablePlayers(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";

  const tournamentRes = await fetch(`/tournaments/${tournamentId}/available`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  if (!tournamentRes.ok) {
    throw new Error(`Couldn’t load tournament ${tournamentId}`);
  }
  const availablePlayers: Player[] = await tournamentRes.json();
  
  return availablePlayers;
}

export async function invitePlayerToSlot(
  tournamentId: number,
  slotIndex: number,
  userId: number
): Promise<void> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/invite`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify({ userId, slotIndex })
  });
  if (!response.ok) {
    console.error(`Failed to invite player ${userId} to slot ${slotIndex} in tournament ${tournamentId}:`, response.status, response.statusText);
    return;
  }
}

export async function isTournamentAdmin(userId: number): Promise<boolean> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/users/me`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error("Failed to check if user is admin:", response.status, response.statusText);
    return false;
  }

  const user = await response.json();
  return user.id === userId;
}

export async function getPlayerById(userId: number): Promise<Player> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/users/id/${userId}`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error(`Failed to get player with ID ${userId}:`, response.status, response.statusText);
    return {} as Player;
  }
  return await response.json() as Player;
}

export async function getTournamentChatRoom(tournamentId: number): Promise<number> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/chat`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to get chat room for tournament ${tournamentId}`);
  }
  const result = await response.json();

  return Number(result.chatRoomId);
}

export async function getTournamentBrackets(tournamentId: number): Promise<any> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/brackets`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error(`Failed to get brackets for tournament ${tournamentId}:`, response.status, response.statusText);
    return [];
  }

  return await response.json();
}

export async function getTournamentAlias(tournamentId: number, userId: number): Promise<string> {
  const token = localStorage.getItem("token") ?? "";
  const response = await fetch(`/tournaments/${tournamentId}/aliases`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });
  if (!response.ok) {
    console.error(`Failed to get aliases for tournament ${tournamentId}:`, response.status, response.statusText);
    return "";
  }
  const aliases: { user_id: number; alias: string; }[] = await response.json();
  const userAlias = aliases.find(item => item.user_id === userId);

  return userAlias ? userAlias.alias : "";
}

