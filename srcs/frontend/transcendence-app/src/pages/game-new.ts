import type { RouteParams } from "../router";

interface CreateGameRequest {
  mode:
    | "training"
    | "single-player"
    | "local-multiplayer"
    | "online-multiplayer";
  maxPlayers: number;
}
interface CreateGameResponse {
  gameId: string;
}

export function renderGameNewPage(params: RouteParams): void {
  const root = document.getElementById("app");
  if (!root) return;

  /* initial values from URL */
  const initialMode       = (params.mode ?? "training") as CreateGameRequest["mode"];
  const initialMaxPlayers = params.maxPlayers ?? "1";

  /* ---------- markup ---------- */
  root.innerHTML = /*html*/ `
    <div class="mx-auto max-w-5xl p-6">
      <div class="rounded-lg border border-gray-300 bg-white p-8 shadow-sm overflow-x-auto">
        <form id="create-form" class="flex flex-col items-center gap-6 md:flex-row md:justify-center">
          <!-- MODE -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="mode">Mode</label>
            <select id="mode" name="mode"
                    class="block w-full rounded-md border-gray-300 shadow-sm"
                    required>
              ${["training","single-player","local-multiplayer","online-multiplayer"]
                .map(
                  (m) => `<option value="${m}" ${m===initialMode ? "selected":""}>${m.replace("-"," ")}</option>`
                )
                .join("")}
            </select>
          </div>

          <!-- MAX PLAYERS -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="maxPlayers">Max players</label>
            <input id="maxPlayers" name="maxPlayers" type="number"
                   min="1" max="10"
                   value="${initialMaxPlayers}"
                   class="block w-full rounded-md border-gray-300 shadow-sm" required />
          </div>

          <!-- SUBMIT -->
          <button id="submit-btn" type="submit"
                  class="h-10 w-full md:w-40 rounded-md bg-blue-600 text-white transition hover:bg-blue-700">
            Create
          </button>
        </form>
      </div>
    </div>
  `;

  /* ---------- DOM refs ---------- */
  const form      = document.getElementById("create-form") as HTMLFormElement;
  const modeSel   = document.getElementById("mode")        as HTMLSelectElement;
  const maxInput  = document.getElementById("maxPlayers")  as HTMLInputElement;
  const submitBtn = document.getElementById("submit-btn")  as HTMLButtonElement;
  const spinner   =
    '<svg class="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24">' +
      '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-linecap="round"/>' +
    "</svg>";

  /* ---------- enable / disable logic ---------- */
  const applyMaxPlayersRules = (): void => {
    const m = modeSel.value as CreateGameRequest["mode"];
    const single = m === "training" || m === "single-player";
    maxInput.disabled = single;
    maxInput.min  = single ? "1" : "2";
    maxInput.max  = "10";
    maxInput.value = single ? "1" : Math.max(2, Number(maxInput.value)).toString();
  };
  applyMaxPlayersRules();
  modeSel.addEventListener("change", applyMaxPlayersRules);

  /* ---------- submit ---------- */
  form.onsubmit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault();

    const payload: CreateGameRequest = {
      mode: modeSel.value as CreateGameRequest["mode"],
      maxPlayers: Number(maxInput.value),
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${spinner}Creating…`;

    try {
      const res = await fetch("/games/createGame", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as CreateGameResponse;
      window.location.hash = `#dashboard?gameId=${encodeURIComponent(data.gameId)}`;
    } catch (err) {
      alert((err as Error).message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create";
    }
  };
}