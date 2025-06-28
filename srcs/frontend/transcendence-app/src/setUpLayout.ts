import { ROUTE_LOGIN_HASH } from "./router"

type userData = {
	username: string;
	email:string;
	created: string;
	avatar: {
		url:string;
	}
};

type loggedIn =
	| { success: true; data: userData; pfp: Blob}
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
	return { success: true, data: json, pfp: rawpfp};
  } catch (err) {
	console.error('Fetch error:', err);
	return { success: false, error: err};
  }
}

export function renderNavBar(root: HTMLElement) {
	let data;
	data = whoAmI().then((data) => {
	if (!data.success) {
		localStorage.setItem('loginredir', window.location.href);
		window.location.replace(window.location.origin + ROUTE_LOGIN_HASH);
		return ;
	}
	const user = data.data.username;
	root.innerHTML = /*html*/`
	<nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-sm font-semibold text-white">
  		<div class="flex items-center gap-6">
    		<div class="text-xl font-bold">🌊</div>
    		<a href="#">Dashboard</a>
    		<a href="#">Games</a>
    		<a href="#">Tournament</a>
    		<a href="#">Leaderboard</a>
    		<a href="#">Chat</a>
  		</div>
  		<div class="flex items-center gap-6">
    		<span class="text-xl">${user} 🔔</span>
   			<div id="avatar" class="h-8 w-8 overflow-hidden rounded-full bg-white"></div>
  		</div>
	</nav>`;
	const userAvatar = document.getElementById('avatar');
	if (userAvatar) {
		const img = document.createElement('img');
		img.src = URL.createObjectURL(data.pfp);
		img.alt = 'User Avatar';
		img.className = 'w-full h-full object-cover';
		userAvatar.innerHTML = '';
		userAvatar.appendChild(img);
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
  renderNavBar(navContainer);

  return { contentContainer };
}