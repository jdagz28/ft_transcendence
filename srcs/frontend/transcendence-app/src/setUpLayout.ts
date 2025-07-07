import { ROUTE_LOGIN } from "./router"

export type userData = {
  id: number;
	username: string;
	email:string;
	created: string;
	avatar: {
		url:string;
	}
};

type loggedIn =
	| { success: true; data: userData; pfp: Blob; pfpString: string}
	| { success: false; error: any};

export async function whoAmI(): Promise<loggedIn>{
  try {
	const token = localStorage.getItem('token');
	const response = await fetch('/users/me', {
	  method: 'get',
	  credentials: 'include',
	  headers: { 'Content-Type': 'application/json',
	  'Authorization': `Bearer ${token}`,
	  },
	});

	const json = await response.json();

	if (!response.ok) {
	  console.error('Access check failed:', json);
	  return { success: false, error: json};
	}
	const pfp = await fetch(json.avatar.url, {
		method: 'get',
	  credentials: 'include',
	  headers: { 'Content-Type': 'application/json',
	  'Authorization': `Bearer ${token}`,
	  },
	});
	const rawpfp:Blob = await pfp.blob();
	return { success: true, data: json, pfp: rawpfp, pfpString: json.avatar.url };
  } catch (err) {
	console.error('Fetch error:', err);
	return { success: false, error: err};
  }
}

export function renderNavBar(root: HTMLElement) {
  let data;
  data = whoAmI().then((data) => {
    if (!data.success) {
      window.location.hash = ROUTE_LOGIN;
      return;
    }
    const user = data.data.username;
	localStorage.setItem("userName", data.data.username);
	localStorage.setItem("userID", data.data.id.toString());
    root.innerHTML = /*html*/`
    <nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-sm font-semibold text-white">
        <div class="flex items-center gap-6">
          <div class="text-xl font-bold">🌊</div>
          <a href="#">Dashboard</a>
          <a href="#">Games</a>
          <a href="#/tournaments">Tournament</a>
          <a href="#">Leaderboard</a>
          <a href="/#/chat">Chat</a>
        </div>
        <div class="flex items-center gap-6">
          <span class="text-xl">${user} 🔔</span>
          <div class="relative ml-3">
            <div>
              <button type="button" class="relative flex rounded-full bg-gray-800 text-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                <span class="absolute -inset-1.5"></span>
                <span class="sr-only">Open user menu</span>
                <div id="avatar" class="h-8 w-8 overflow-hidden rounded-full bg-white"></div>
              </button>
            </div>
            <div class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden opacity-0 scale-95 pointer-events-none transition ease-in duration-75" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1" id="user-menu">
              <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#2DB9FF] transition-colors duration-150" role="menuitem" tabindex="-1" id="user-menu-item-0">Your Profile</a>
              <a href="#/users/${user}/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#2DB9FF] transition-colors duration-150" role="menuitem" tabindex="-1" id="user-menu-item-1">Account Settings</a>
              <button class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#2DB9FF] transition-colors duration-150" role="menuitem" tabindex="-1" id="user-menu-item-2">Sign out</button>
            </div>
          </div>
        </div>
    </nav>`;

    const userAvatar = document.getElementById('avatar');
    if (userAvatar) {
      const img = document.createElement('img');
	  localStorage.setItem("userPFP", data.pfpString);
      img.src = URL.createObjectURL(data.pfp);
      img.alt = 'User Avatar';
      img.className = 'w-full h-full object-cover';
      userAvatar.innerHTML = '';
      userAvatar.appendChild(img);
    }

    const btn = document.getElementById('user-menu-button')!;
    const menu = document.getElementById('user-menu')!;
    let open = false;

    btn.addEventListener('click', () => {
      open = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        menu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        menu.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
        menu.classList.remove('ease-in', 'duration-75');
        menu.classList.add('ease-out', 'duration-100');
      } else {
        menu.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
        menu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        menu.classList.remove('ease-out', 'duration-100');
        menu.classList.add('ease-in', 'duration-75');
      }
    });

    document.addEventListener('click', (event) => {
      if (!btn.contains(event.target as Node) && !menu.contains(event.target as Node)) {
        if (open) {
          open = false;
          btn.setAttribute('aria-expanded', 'false');
          menu.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
          menu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        }
      }
    });

		const logoutBtn = document.getElementById('user-menu-item-2');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', async () => {
				try {
					const token = localStorage.getItem('token');
					const response = await fetch('/auth/logout', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${token}`,
						},
					});
					if (!response.ok) {
						throw new Error('Logout failed');
					}
					localStorage.removeItem('token');
					window.location.hash = ROUTE_LOGIN;
				} catch (err) {
					console.error('Logout error:', err);
				}
			});
		}

  });
	data = false;
	if (!data) return;
}

export function setupAppLayout() {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app root element not found');

  app.innerHTML = '';

  if (!document.getElementById('global-background')) {
    const bg = document.createElement('div');
    bg.id = 'global-background';
    bg.className = 'fixed inset-0 bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] bg-cover bg-center selection:bg-blue-400 selection:text-white -z-10';
    document.body.appendChild(bg);
  }

  const root = document.createElement('div');
  root.id = 'root';
  root.className = 'relative z-10 min-h-screen flex flex-col';

  const navContainer = document.createElement('div');
  navContainer.id = 'nav-container';

  const contentContainer = document.createElement('div');
  contentContainer.id = 'content-container';
  contentContainer.className = 'flex-grow';

  root.appendChild(navContainer);
  root.appendChild(contentContainer);
  app.appendChild(root);

	const token = localStorage.getItem("token");
	if (token) {
  	renderNavBar(navContainer);
	}
	
  return { contentContainer };
}