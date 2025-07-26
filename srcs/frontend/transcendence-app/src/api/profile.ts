
import type { Match, UserProfile, Friend } from "../types/profile";

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

export async function getFriendsList(): Promise<Friend[]> {
  const token = localStorage.getItem("token");
  const response = await fetch("/users/me/friends", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include" 
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friends list");
  }
  const data = await response.json();
  return data.data;
}

export async function getUserFriendsList(username: string): Promise<Friend[]> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/users/${username}/friends`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include" 
  });
  if (!response.ok) {
    throw new Error("Failed to fetch friends list");
  }
  const data = await response.json();
  return data.data;
}