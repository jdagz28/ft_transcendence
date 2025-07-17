import type { MfaDetails } from "../types/mfa";

export async function getMfaDetails(userId: number): Promise<MfaDetails> {
  const token = localStorage.getItem("token");
  const res = await fetch(`/auth/${userId}/mfa/details`, { 
    method: "GET", 
    headers: { 
      Authorization: `Bearer ${token}` 
    },
    credentials: "include" 
  });
  if (!res.ok) {
    return { mfa_enabled: false, qr_code: "", mfa_type: "totp" };
  }
  const data = await res.json();

  return {
    mfa_type: data.mfa_type,
    mfa_enabled: data.mfa_enabled,
    qr_code: data.qr_code
  };
}

export async function emailGenerateMfaCode(userId: number): Promise<void> {
  const res = await fetch(`/auth/${userId}/mfa/emailGenerate`, { 
    method: "POST", 
  });
  if (!res.ok) {
    throw new Error("Failed to generate MFA code");
  }
}