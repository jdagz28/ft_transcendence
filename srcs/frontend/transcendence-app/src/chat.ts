export function renderChat(): void {
  const root = document.getElementById('app');
  if (!root)
      return;
  root.innerHTML = `
    <div class="flex flex-col min-h-screen bg-[#11294d]">
      <!-- Navbar -->
      <nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-white text-sm font-semibold">
          <div class="flex items-center gap-6">
            <div class="text-xl font-bold">🌊</div>
              <a href="#">Dashboard</a>
            <a href="#">Games</a>
            <a href="#">Tournament</a>
            <a href="#">Leaderboard</a>
            <a href="#">Chat</a>
          </div>
        <div class="flex items-center gap-4">
          <span class="text-xl">USERRR<span>
          <span class="text-xl">🔔</span>
          <div id="avatar" class="w-8 h-8 rounded-full overflow-hidden bg-white"></div>
          </div>
      </nav>
      <!-- Main content -->
       <main class="flex-1 flex justify-center items-center">
        <div class="flex gap-20 w-full max-w-6xl mt-16">
          <!-- Groups -->
          <div class="flex-1 bg-[#15305a] rounded-2xl p-12 shadow-2xl shadow-black/60 min-h-[600px]">
            <h2 class="text-4xl font-bold text-center text-[#f8f8e7] mb-8">Groups</h2>
            <div class="flex flex-col gap-4 mb-8">
              ${[
                "Amazing title",
                "Im alone join pls",
                "I dont know...",
                "TITLE!!!!!!"
              ].map(title => `
                <div class="flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4">
                  <span class="text-lg text-[#f8f8e7] font-semibold">${title}</span>
                  <div class="flex gap-2">
                    <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Leave</button>
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="flex justify-end">
              <button class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-bold">CREATE</button>
            </div>
          </div>
          <!-- DMs -->
          <div class="flex-1 bg-[#15305a] rounded-2xl p-12 shadow-2xl shadow-black/60 min-h-[600px]">
            <h2 class="text-4xl font-bold text-center text-[#f8f8e7] mb-8">DM</h2>
            <div class="flex flex-col gap-4">
              ${[
                "Tupac",
                "Macron",
                "La reine des neiges"
              ].map(name => `
                <div class="flex items-center justify-between bg-[#18376b] rounded-xl px-6 py-4">
                  <span class="text-lg text-[#f8f8e7] font-semibold">${name}</span>
                  <div class="flex gap-2">
                    <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded font-bold">Join</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-bold">Block</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </main>
    </div>
    `
  ;
}
