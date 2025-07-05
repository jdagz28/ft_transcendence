import { setupAppLayout } from "../setUpLayout";


export function renderTournamentPage() {
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
    "bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition";

  header.appendChild(titleWrap);
  header.appendChild(createBtn);
  contentContainer.appendChild(header);

  createBtn.addEventListener("click", () => {
    window.location.hash = "#/tournaments/create";
  });
  
}