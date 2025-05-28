
export function renderRegisterPage(): void {
  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = /*html*/ `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] selection:bg-blue-400 selection:text-white relative z-10">
      <div class="bg-[#0d2551] p-8 rounded-xl shadow-xl/20 w-full max-w-md text-white backdrop-blur-sm bg-opacity-90">
        <div class="flex flex-col items-center">
          <img src="/icons8-rocket.svg" class="w-22 h-22 mb-6" />
          <h2 class="text-4xl font-bold mb-8">REGISTER</h2>
        </div>

        <form id="registerForm" class="space-y-5">
          <div>
            <label for="username" class="block text-md text-gray-300">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              placeholder="Username" 
              minlength="3" 
              maxlength="10" 
              class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label for="password" class="block text-md text-gray-300">Password</label>
            <input
              type="password" 
              id="password" 
              placeholder="••••••••••••"
              pattern="^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':&quot;\\|,.<>\/?]).{8,20}$"
              title="Password must at least be 8 characters and 20 characters max with at least one uppercase letter, one number, and one special character"
              class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-md text-gray-300">Confirm Password</label>
            <input
              type="password" 
              id="confirmPassword" 
              placeholder="••••••••••••"
              class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400"
              required
            />
          </div>
          
          <div>
            <label for="email" class="block text-md text-gray-300">Email</label>
            <input
              type="email" 
              id="email" 
              placeholder="transcendence@student.s19.be"
              class="w-full px-4 py-2 bg-[#081a37] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder-gray-400"
              required
            />
          </div>

          <div class="flex items-center mb-4">
            <input 
              type="checkbox" 
              id="checkbox" 
              class="mr-2 w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              required  
            />
            <label for="checkbox" class="text-md text-gray-300">
              I agree to the <a href="/terms" class="text-blue-400 hover:underline">Terms of Service</a>
            </label>
          </div>
        
          <button type="submit"
            class="w-full text-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-3 rounded-md hover:opacity-90 transition">
            Register
          </button>
        </form>
        <div id="registerError" class="hidden mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-md text-red-300 text-sm"></div>
      </div>
    </div>
    `;

    document.getElementById('registerForm')!.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = (document.getElementById('username') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;
      const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;
      const email = (document.getElementById('email') as HTMLInputElement).value;

      if (!username || username.length < 3 || username.length > 10) {
        alert('Username must be between 3 and 10 characters.');
        return;
      }

      const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':&quot;\\|,.<>\/?]).{8,20}$/;
      if (!passwordPattern.test(password)) {
        alert('Password must at least be 8 characters and 20 characters max with at least one uppercase letter, one number, and one special character.');
        return;
      }

      if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }

      if (!email) {
        alert('Please enter a valid email address.');
        return;
      }

      const checkbox = document.getElementById('checkbox') as HTMLInputElement;
      if (!checkbox.checked) {
        alert('You must agree to the Terms of Service.');
        return;
      }

      try {
        const response = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password, email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'User registration failed');
        }

        alert(`Registering ${username}`); //! DELETE
        
        window.location.hash = '#login';

      } catch (err: unknown) {
        const errorDiv = document.getElementById('registerError');
        if (errorDiv && err instanceof Error) {
          errorDiv.textContent = err.message;
          errorDiv.classList.remove('hidden');
        }
      }
    });
}