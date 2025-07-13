import { ROUTE_MAIN } from "../router";

export function renderLoginMFA(userId: number): void {
  const root = document.getElementById("app");
  if (!root) return;

  root.innerHTML = /*html*/ `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e]">
      <div class="bg-[#0d2551] p-8 rounded-xl shadow-xl w-full max-w-md text-white backdrop-blur-sm bg-opacity-90">
        <div class="flex flex-col items-center mb-6">
          <img src="/icons8-rocket.svg" class="w-24 h-24 mb-4" />
          <h2 class="text-3xl font-bold">Enter 2FA Code</h2>
          <p class="mt-2 text-sm text-gray-300">Enter your 6-digit code</p>
        </div>

        <div id="code-inputs" class="flex justify-center space-x-2 mb-8">
          ${Array(6).fill(0).map(() => `
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="1"
              class="w-12 h-12 text-center text-xl bg-[#0c1f4a] rounded-md border border-[#1e376f] focus:outline-none focus:ring-2 focus:ring-[#2DB9FF]"
            />
          `).join("")}
        </div>

        <button id="verify-btn" type="button"
          class="w-full text-xl bg-gradient-to-r from-orange-500 to-orange-400 font-semibold py-3 rounded-md hover:opacity-90 transition">
          Verify
        </button>
      </div>
    </div>
  `;

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("#code-inputs input"));
  inputs.forEach((input, i) => {
    input.addEventListener("input", () => {
      if (input.value.match(/[0-9]/) && i < inputs.length - 1) {
        inputs[i + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) {
        inputs[i - 1].focus();
      }
    });
  });

  document.getElementById("verify-btn")!.addEventListener("click", async () => {
    const token = inputs.map((i) => i.value).join("");
    if (token.length < 6) {
      alert("Please enter all 6 digits.");
      return;
    }

    try {
      const response = await fetch(`/auth/${userId}/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: Number(token) }),
      });

      if (!response.ok) {
        alert("Invalid code. Please try again.");
        return;
      }
      const data = await response.json();
      localStorage.setItem('token', data.token);
      window.location.hash = ROUTE_MAIN;
    } catch (err) {
      console.error("Error verifying MFA code:", err);
      alert("An error occurred while verifying the code. Please try again.");
    }
  });
}
