
export function renderPasswordReset(): void {
  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = /*html*/ `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] selection:bg-blue-400 selection:text-white relative z-10">
      <div class="bg-[#0d2551] p-8 rounded-xl shadow-xl/20 w-full max-w-md text-white backdrop-blur-sm bg-opacity-90">
        <div class="flex flex-col items-center">
          <img src="/icons8-rocket.svg" class="w-22 h-22 mb-6" />
          <h2 class="text-4xl font-bold mb-8">RESET PASSWORD</h2>
        </div>

        <form id="resetForm" class="space-y-5">
        </form>
    </div>
    `;

   
}