export async function getMfaDetails(userId: number): Promise<{ mfa_enabled: boolean, qr_code: string}> {
  const token = localStorage.getItem("token");
  const res = await fetch(`/auth/${userId}/mfa/details`, { 
    method: "GET", 
    headers: { 
      ...(token && { Authorization: `Bearer ${token}` }) 
    },
    credentials: "include" 
  });
  if (!res.ok) {
    return { mfa_enabled: false, qr_code: "" };
  }
  const data = await res.json();

  return {
    mfa_enabled: data.mfa_enabled,
    qr_code: data.qr_code
  };
}