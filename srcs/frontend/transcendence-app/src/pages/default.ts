import { setupAppLayout } from "../setUpLayout";

export function renderDefault(): void {
	const root = setupAppLayout();
	if (!root) return;
	
	root.contentContainer.innerHTML = "";
	root.contentContainer.className =
    "flex flex-col items-center justify-center flex-grow text-white";

  root.contentContainer.innerHTML = `
    <h1 class="text-6xl md:text-8xl font-extrabold tracking-wider">
      ERROR&nbsp;404
    </h1>
    <p class="mt-4 text-2xl md:text-3xl opacity-80">
      Not&nbsp;Found
    </p>
  `;
}