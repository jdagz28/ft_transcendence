import { ROUTE_MAIN } from "../router"

export function renderLoginPage(): void {
	 alert("IN LOGIN");
  const root = document.getElementById("app");

  alert("PRE FIRST RETURN");
  if (!root) return;

  localStorage.setItem('loginredir', "");
  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth');
  const username = urlParams.get('username');
  const provider = urlParams.get('provider');
  
  if (authSuccess === 'success' && username) {
    let providerName;
    
    switch (provider) {
      case 'google':
        providerName = 'Google';
        break;
      case '42':
        providerName = '42 Intra';
        break;
      default:
        providerName = provider;
    }
    
    alert(`Logged in as ${username}${providerName ? ` via ${providerName}` : ''}`); //! DELETE
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
alert("PAST PROVIDERS");
  root.innerHTML = /*html*/ `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] selection:bg-blue-400 selection:text-white relative z-10">
      <div class="bg-[#0d2551] p-8 rounded-xl shadow-xl/20 w-full max-w-md text-white backdrop-blur-sm bg-opacity-90">
        <div class="flex flex-col items-center">
          <img src="/icons8-rocket.svg" class="w-22 h-22 mb-6" />
          <h2 class="text-4xl font-bold mb-8">LOGIN</h2>
        </div>

        <form id="loginForm" class="space-y-5">
          <input type="text" id="username" placeholder="Username"
            class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400" />
          <input type="password" id="password" placeholder="Password"
            class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400" />
          <button type="submit"
            class="w-full text-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-3 rounded-md hover:opacity-90 transition">
            Login
          </button>
        </form>

        <div class="flex items-center justify-center my-3 text-gray-400 text-md">or</div>
        <div class="flex gap-3">
          <button class="google-btn ring flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-md flex items-center justify-center gap-3 hover:bg-gray-700 hover:shadow-md hover:text-white transition-all shadow-sm">
            <img src="/icons8-google.svg" class="w-7 h-7" alt="Google logo" />
            <span class="font-medium text-sm"> Google</span>
          </button>
          <button class="intra-btn ring flex-1 bg-gray-800 text-white py-3 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-gray-700 transition">
            <span class="font-bold">42</span> Intra
          </button>
        </div>

        <div id="loginError" class="text-red-400 text-sm mt-3 hidden text-center"></div>

        <div class="text-md text-center mt-6 text-gray-400">
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
        // alert('Username and password are required.');
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

		const data = await response.json();
		localStorage.setItem('token', data.token);
		const redir = localStorage.getItem('loginredir') ?? "";
		if (redir !== "") {
			localStorage.setItem('loginredir', "");
			window.location.replace(window.location.origin + redir);
		}
		else
        	window.location.replace(window.location.origin + ROUTE_MAIN);

      } catch (err: unknown) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv && err instanceof Error) {
          errorDiv.textContent = err.message;
          errorDiv.classList.remove('hidden');
        }
      }
    });


    document.querySelector('.google-btn')!.addEventListener('click', () => {
      window.location.href = '/auth/google';
    });

    document.querySelector('.intra-btn')!.addEventListener('click', () => {
      window.location.href = '/auth/42';
    });
}
