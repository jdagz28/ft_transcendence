import { setupAppLayout } from "../setUpLayout";
import { getTournamentName } from "@/api/tournament";

export async function renderAliasTournamentPage(tid: number): Promise<void> {
  const tournamentName = await getTournamentName(tid);

  const { contentContainer } = setupAppLayout();
  contentContainer.className =
    "flex-grow flex flex-col items-center justify-center text-white";

  const title = document.createElement("h1");
  title.textContent = tournamentName;
  title.className =
    "absolute top-20 text-4xl md:text-5xl font-extrabold text-center";
  contentContainer.appendChild(title);

  const prompt = document.createElement("p");
  prompt.textContent = "Please enter a monicker for the tournament.";
  prompt.className = "mb-6 text-xl md:text-2xl text-center";
  contentContainer.appendChild(prompt);

  const form = document.createElement("form");
  form.className =
    "flex w-full max-w-md lg:max-w-lg rounded-lg overflow-hidden shadow-lg";
  contentContainer.appendChild(form);

  // Alias Input
  const input = document.createElement("input");
  input.type = "text";
  input.name = "alias";
  input.placeholder = "The Transcender";
  input.className =
    "flex-grow px-4 py-3 text-gray-900 " +
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alias = input.value.trim();
    if (!alias) {
      alert("Alias cannot be empty");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const ok = await fetch(`/tournaments/${tid}/alias`, {
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
      window.location.hash = `#/tournaments/${tid}/lobby`;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unexpected error");
    }
  });
}