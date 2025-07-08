
import type { Match, UserProfile } from "../types/profile";

export async function getUserProfile(username: string): Promise<UserProfile> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/users/${username}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include" 
  });
  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }
  const data = await response.json();
  return data;
}
export async function getMatchHistory(username: string): Promise<Match[]> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/users/${username}/matches`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include" 
  });
  if (!response.ok) {
    throw new Error("Failed to fetch match history");
  }
  const data = await response.json();
  return data;
}