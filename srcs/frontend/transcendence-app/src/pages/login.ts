
export function renderLoginPage(): void {
  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = /*html*/ `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e]">
      <div class="bg-[#0d2551] p-8 rounded-xl shadow-lg w-full max-w-sm text-white">
        <div class="flex flex-col items-center">
          <img src="/icons8-rocket.svg" class="w-12 h-12 mb-4" />
          <h2 class="text-2xl font-bold mb-6">LOGIN</h2>
        </div>

        <form id="loginForm" class="space-y-4">
          <input type="text" id="username" placeholder="Username"
            class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400" />
          <input type="password" id="password" placeholder="Password"
            class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400" />
          <button type="submit"
            class="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-2 rounded-md hover:opacity-90 transition">
            Login
          </button>
        </form>

        <div class="flex items-center justify-center my-4 text-gray-400 text-sm">or</div>


        <div id="loginError" class="text-red-400 text-sm mt-3 hidden text-center"></div>

        <div class="text-sm text-center mt-6 text-gray-400">
          Don’t have an account? <a href="#register" class="text-orange-400 hover:underline">Register</a>
        </div>
      </div>
    </div>
    `;

    document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = (document.getElementById('username') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      if (!username || !password) {
        alert('Username and password are required.');
        return;
      }

      try {
        const response = await fetch('/auth/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid credentials');
        }

        alert(`Logged in as ${username}`);
        
        //TODO: Redirect to the main page 

      } catch (err: unknown) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv && err instanceof Error) {
          errorDiv.textContent = err.message;
          errorDiv.classList.remove('hidden');
        }
      }
    });
}