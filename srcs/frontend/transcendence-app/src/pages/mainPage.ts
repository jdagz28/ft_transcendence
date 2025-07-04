import { setupAppLayout } from "../setUpLayout";

export function renderMainPage(): void {
	const root = setupAppLayout();
	if (!root) return;
	root.contentContainer.innerHTML = `
	<div class="relative z-10 min-h-screen bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] selection:bg-blue-400 selection:text-white flex items-center justify-center px-4">
  <div class="grid w-full gap-6 grid-cols-1 lg:grid-cols-[repeat(3,minmax(280px,1fr))] max-w-none lg:auto-rows-fr">

    <div class="flex flex-col justify-between w-full max-h-[400px] lg:max-h-none lg:h-full lg:aspect-[4/5] bg-[#0d2551] p-8 text-white rounded-xl shadow-xl/20 backdrop-blur-sm">
      <h2 class="mb-6 text-center font-bold text-4xl sm:text-5xl md:text-6xl break-words">Play Now</h2>
      <div class="mx-auto flex w-1/2 h-1/2 lg:w-3/4 lg:h-3/4 items-center justify-center overflow-hidden rounded-md bg-[#0d2551]">
        <img src="/pong.svg" alt="Example" class="w-full h-full object-contain invert" />
      </div>
    </div>

    <div class="flex flex-col justify-between w-full max-h-[400px] lg:max-h-none lg:h-full lg:aspect-[4/5] bg-[#0d2551] p-8 text-white rounded-xl shadow-xl/20 backdrop-blur-sm">
      <h2 class="mb-6 text-center font-bold text-4xl sm:text-5xl md:text-6xl break-words">Play with Friends</h2>
      <div class="mx-auto flex w-1/2 h-1/2 lg:w-3/4 lg:h-3/4 items-center justify-center overflow-hidden rounded-md bg-[#0d2551]">
        <img src="/multiplayer.svg" alt="Example" class="w-full h-full object-contain invert" />
      </div>
    </div>

    <div class="flex flex-col justify-between w-full max-h-[400px] lg:max-h-none lg:h-full lg:aspect-[4/5] bg-[#0d2551] p-8 text-white rounded-xl shadow-xl/20 backdrop-blur-sm">
      <h2 class="mb-6 text-center font-bold text-4xl sm:text-5xl md:text-6xl break-words">Chatrooms</h2>
      <div class="mx-auto flex w-1/2 h-1/2 lg:w-3/4 lg:h-3/4 items-center justify-center overflow-hidden rounded-md bg-[#0d2551]">
        <img src="/chatroom.svg" alt="Example" class="w-full h-full object-contain invert" />
      </div>
    </div>

  </div>
</div>`
}