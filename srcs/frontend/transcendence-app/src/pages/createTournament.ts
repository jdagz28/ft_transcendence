import { buildFormBox, type FormBoxSpec } from "../components/formBox";
import { setupAppLayout } from "../setUpLayout";

export const createTournamentSpec: FormBoxSpec = {
  heading: "Create tournament",
  submitLabel: "Create",
  fields: [
    { type: "text",  label: "Tournament Name", name: "tournamentName", placeholder: "Tournament Name" },
    { type: "select", label: "Number of players", name: "numPlayers", options: ["4", "8", "16"] },
    { type: "select", label: "Type",             name: "type",        options: ["Singles", "Doubles"] },
    { type: "select", label: "Game mode",        name: "gameMode",    options: ["Public", "Private"] },
  ],
};

export function renderCreateTournamentPage(): void {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = "flex-grow flex items-center justify-center";

  const form = buildFormBox(createTournamentSpec);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(form);
    const payload = {
      name:       (fd.get("tournamentName") as string).trim(),
      maxPlayers: Number(fd.get("numPlayers")),
      gameType:   String(fd.get("type")).toLowerCase(),
      gameMode:   String(fd.get("gameMode")).toLowerCase()
    };
    if (!payload.name) {
      alert("Tournament name is required");
      return;
    }

    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch('/tournaments/create', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to create tournament");
      }

      const tournamentId = await res.json();

      window.location.hash = `#/tournaments/${tournamentId}/alias`

    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error");
    }
  });

  contentContainer.appendChild(form);
}
