import { buildFormBox, type FormBoxSpec } from "../components/formBox";

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
  const root = document.getElementById("app");
  if (!root) {
    console.error("#app element not found");
    return;
  }
  root.innerHTML = "";

  const page = document.createElement("div");
  page.className =
    "min-h-screen flex items-center justify-center " +
    "bg-gradient-to-b from-[#002861] to-[#001d4a] p-6";
  root.appendChild(page);

  page.appendChild(buildFormBox(createTournamentSpec));
}
