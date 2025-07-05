import { buildFormBox, type FormBoxSpec } from "../components/formBox";
import { setupAppLayout } from "../setUpLayout";
import { getTournamentCreator, isTournamentAdmin } from "../api/tournament";

export const optionsTournamentSpec: FormBoxSpec = {
  heading: "Tournament Settings",
  submitLabel: "Save",
  fields: [
    { type: "select", label: "Number of Games/Sets",  name: "num_games",    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
    { type: "select", label: "Number of Matches",     name: "num_matches",  options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
  ],
};

export async function renderOptionsTournamentPage(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();

  const created_by = await getTournamentCreator(tournamentId);
  const isAdmin = await isTournamentAdmin(created_by);
  if (!isAdmin) {
    window.location.hash = '#/403';
  }

  contentContainer.className = "flex-grow flex items-center justify-center";

  const form = buildFormBox(optionsTournamentSpec);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(form);
    const payload = {
      num_games: Number(fd.get("num_games")),
      num_matches: Number(fd.get("num_matches"))
    };

    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`/tournaments/${tournamentId}/options`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to update tournament options");
      }

      window.location.hash = `#/tournaments/${tournamentId}/alias`

    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error");
    }
  });

  contentContainer.appendChild(form);
}
