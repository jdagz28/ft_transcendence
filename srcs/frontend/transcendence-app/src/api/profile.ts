export async function getUserProfile(username: string): Promise<any> {
  const token = localStorage.getItem("token");
  const response = await fetch(`/users/${username}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    credentials: "include" 
  });
  if (!response.ok) {
    return { success: false, error: "Failed to fetch profile" };
  }
  const data = await response.json();
  return { success: true, data };
}

