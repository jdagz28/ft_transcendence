import { setupAppLayout, whoAmI } from "../setUpLayout";
import { getTournamentDetails, getTournamentAlias } from "@/api/tournament";

export async function renderAliasTournamentPage(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className =
    "flex-grow flex flex-col text-white";
  const { name: tournamentName } = await getTournamentDetails(tournamentId);
  console.log("Tournament name:", tournamentName);
  if (!tournamentName) {
    console.error("Tournament name is not available");
    window.location.hash = '#/400';
    return;
  }

  const userData = await whoAmI();
  if (!userData.success) {
    window.location.hash = "#/login";
    return;
  }
  const nickname = userData.data.nickname || "";

  const userAlias = await getTournamentAlias(tournamentId, userData.data.id);
  if (userAlias) {
    console.log("Tournament Alias has already been set. User alias:", userAlias); //! DELETE
    window.location.hash = `#/tournaments/${tournamentId}/lobby`;
    return;
  }

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

  const input = document.createElement("input");
  input.type = "text";
  input.name = "alias";
  input.placeholder = nickname;
  input.value = nickname;
  input.title = "Alias must be between 3 and 15 characters long, can contain alphanumeric characters and special characters (!, $, #, -, _)";
  input.className =
    "flex-grow px-4 py-3 bg-white text-gray-900 " +
    "placeholder-gray-400 focus:outline-none";
  form.appendChild(input);

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Set alias";
  btn.className =
    "bg-orange-500 hover:bg-orange-600 text-white font-semibold " +
    "px-5 md:px-6 whitespace-nowrap";
  form.appendChild(btn);

  mainContent.appendChild(form);
  contentContainer.appendChild(mainContent);
  

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alias = input.value.trim();
    if (!alias) {
      alert("Alias cannot be empty");
      return;
    }
    if (alias.length < 3 || alias.length > 15) {
      alert("Alias must be between 3 and 15 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_!$#-]+$/.test(alias)) {
      alert("Alias can only contain alphanumeric characters and special characters (!, $, #, -, _)");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const ok = await fetch(`/tournaments/${tournamentId}/alias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ alias })
      });

      if (!ok.ok) {
        alert("Failed to set alias. Please try again.");
        return;
      }
      window.location.hash = `#/tournaments/${tournamentId}/lobby`;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error");
    }
  });
}