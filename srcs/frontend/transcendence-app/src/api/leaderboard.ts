import type { LeaderboardUser } from "../types/leaderboard.ts";

export async function getLeaderboard(): Promise<LeaderboardUser[]> {
  const token = localStorage.getItem("token");
  const response = await fetch("/games/leaderboard", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  const data = await response.json();
  return data;
}