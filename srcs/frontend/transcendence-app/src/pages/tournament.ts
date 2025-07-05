import { setupAppLayout } from "../setUpLayout";
import type { Tournament, Player} from "../types/tournament";


export async function renderTournamentPage() {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = 
    "flex-grow flex flex-col gap-8 px-8 py-10 text-white";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between mb-6";

  const h1 = document.createElement("h1");
  h1.textContent = "Tournaments";
  h1.className = "text-3xl font-bold text-white";

  const titleWrap = document.createElement("div");
  titleWrap.appendChild(h1);

  const createBtn = document.createElement("button");
  createBtn.id = "create-game-btn";
  createBtn.textContent = "Create Tournament";
  createBtn.className =
    "bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition";

  header.appendChild(titleWrap);
  header.appendChild(createBtn);
  contentContainer.appendChild(header);

  createBtn.addEventListener("click", () => {
    window.location.hash = "#/tournaments/create";
  });
  
  /* ------------------------------------------------ table skeleton --- */
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "overflow-x-auto";

  const table = document.createElement("table");
  table.className = "min-w-full divide-y divide-gray-700 text-sm";
  tableWrapper.appendChild(table);
  contentContainer.appendChild(tableWrapper);

  table.innerHTML = `
    <thead>
      <tr class="text-center text-lg uppercase tracking-wider text-gray-400">
        <th class="px-4 py-2 font-medium">Tournament</th>
        <th class="px-4 py-2 font-medium">Mode</th>
        <th class="px-4 py-2 font-medium">Created By</th>
        <th class="px-4 py-2 font-medium">Created</th>
        <th class="px-4 py-2 font-medium">Finished</th>
        <th class="px-4 py-2 font-medium">Max</th>
        <th class="px-4 py-2 font-medium">Open</th>
        <th class="px-4 py-2 font-medium">Players</th>
        <th class="px-4 py-2 font-medium"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-800"></tbody>`;

  const tbody = table.querySelector("tbody") as HTMLTableSectionElement | null;
  if (!tbody) return; 
  try {
    const token = localStorage.getItem("token") ?? "";
    const response = await fetch("/tournaments", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch tournaments");

    const tournaments: Tournament[] = (await response.json()) as Tournament[];

    tournaments.sort(
      (a: Tournament, b: Tournament) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    tournaments.forEach((tournament: Tournament) => {
      const openPlayers: number = tournament.settings.maxPlayers - tournament.players.length;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-600 opacity-90 transition";

      const nameTd = cell("font-semibold", tournament.name);
      tr.appendChild(nameTd);

      tr.appendChild(cell("", tournament.settings.gameMode));

      const byTd = document.createElement("td");
      byTd.className = "px-4 py-3";
      byTd.innerHTML = `
        <div class="flex items-center gap-2">
          <img src="${tournament.created_by.avatarUrl}" alt="avatar" class="w-6 h-6 rounded-full ring-1 ring-gray-600" />
          <span>${tournament.created_by.username}</span>
        </div>`;
      tr.appendChild(byTd);


      tr.appendChild(cell("", formatDateTime(tournament.created)));
      tr.appendChild(cell("", tournament.ended ? formatDateTime(tournament.ended) : "-"));
      tr.appendChild(cell("text-center", String(tournament.settings.maxPlayers)));
      tr.appendChild(cell("text-center", String(openPlayers)));

      const playersTd = document.createElement("td");
      playersTd.className = "px-4 py-3";
      playersTd.innerHTML = `
        <div class="flex -space-x-2">
          ${tournament.players
            .map(
              (player: Player) => `
              <img src="${player.avatarUrl}" alt="${player.username}" title="${player.username}"
                   class="inline-block w-6 h-6 rounded-full ring-1 ring-gray-600" />`
            )
            .join("")}
        </div>`;
      tr.appendChild(playersTd);

      const actionTd = document.createElement("td");
      actionTd.className = "px-4 py-3";
      if (tournament.status === "pending" && openPlayers > 0 && tournament.settings.gameMode !== "private") {
        const btn = document.createElement("button");
        btn.dataset.id = String(tournament.id);
        btn.textContent = "Join";
        btn.className =
          "join-tournament bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded";
        actionTd.appendChild(btn);
      }
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    const errRow = document.createElement("tr");
    errRow.innerHTML =
      '<td colspan="9" class="px-4 py-6 text-center text-red-400">Unable to load tournaments</td>';
    tbody.appendChild(errRow);
  }

  tbody.addEventListener("click", async (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.classList.contains("join-tournament")) return;

    const tId = target.dataset.id;
    if (!tId) return;

    target.setAttribute("disabled", "true");
    try {
      const res = await fetch(`/api/tournaments/${tId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to join");
      await renderTournamentPage(); 
    } catch (err) {
      console.error(err);
      target.removeAttribute("disabled");
      target.textContent = "Retry";
    }
  });
}

function cell(extra: string, text: string): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = `px-4 py-3 ${extra}`.trim();
  td.textContent = text;
  return td;
}

function formatDateTime(dateLike: string | number | Date): string {
  const d = new Date(dateLike);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}