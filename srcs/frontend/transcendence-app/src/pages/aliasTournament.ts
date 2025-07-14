import { setupAppLayout } from "../setUpLayout";
import { getTournamentDetails } from "@/api/tournament";

export async function renderAliasTournamentPage(tournamentId: number): Promise<void> {
  const token = localStorage.getItem("token");
  console.log("Token from localStorage:", token);
  console.log("Token exists:", !!token);
  console.log("Token length:", token?.length);
  const { name: tournamentName } = await getTournamentDetails(tournamentId);
  console.log("Tournament name:", tournamentName);

  const { contentContainer } = setupAppLayout();
  contentContainer.className =
    "flex-grow flex flex-col text-white";

  const header = document.createElement("div");
  header.className = "text-center py-6";
  const title = document.createElement("h1");
  title.textContent = tournamentName;
  title.className = 
    "text-3xl md:text-4xl font-bold text-white mb-2"; 
  header.appendChild(title);
  contentContainer.appendChild(header);

  const mainContent = document.createElement("div");
  mainContent.className = 
    "flex-grow flex flex-col items-center justify-center px-8 space-y-6";
  
  const prompt = document.createElement("p");
  prompt.textContent = "Please enter a monicker for the tournament.";
  prompt.className = 
    "mb-6 text-xl text-center";
  mainContent.appendChild(prompt);

  const form = document.createElement("form");
  form.className =
    "flex w-full max-w-md lg:max-w-lg rounded-lg overflow-hidden shadow-lg";

  // Alias Input
  const input = document.createElement("input");
  input.type = "text";
  input.name = "alias";
  input.placeholder = "The Transcender";
  input.className =
    "flex-grow px-4 py-3 bg-white text-gray-900 " +
    "placeholder-gray-400 focus:outline-none";
  form.appendChild(input);

  // Submit
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Set alias";
  btn.className =
    "bg-orange-500 hover:bg-orange-600 text-white font-semibold " +
    "px-5 md:px-6 whitespace-nowrap";
  form.appendChild(btn);

  // contentContainer.appendChild(form);
  // contentContainer.appendChild(mainContent);

  mainContent.appendChild(form);
  contentContainer.appendChild(mainContent);
  

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alias = input.value.trim();
    if (!alias) {
      alert("Alias cannot be empty");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const ok = await fetch(`/tournaments/${tournamentId}/alias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: "include",
        body: JSON.stringify({ alias })
      });

      if (!ok.ok) {
        const err = await ok.json();
        throw new Error(err.message ?? "Failed to save alias");
      }
      window.location.hash = `#/tournaments/${tournamentId}/lobby`;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error");
    }
  });
}