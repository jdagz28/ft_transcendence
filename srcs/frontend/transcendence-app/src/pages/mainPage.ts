import { ROUTE_MAIN } from "../router"
import { ROUTE_LOGIN } from "../router"
import type { RouteParams } from "../router";

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

export function renderMainPage(params: RouteParams): void {
	const root = document.getElementById("app");
	if (!root) return;

	let data;
	data = whoAmI().then((data) => {
	if (!data.success) {
		localStorage.setItem('loginredir', ROUTE_MAIN);
		window.location.replace(window.location.origin + ROUTE_LOGIN);
		return;
	}
	const user = data.data.username;
	root.innerHTML = /*html*/`
	<nav class="flex items-center justify-between bg-blue-950 px-6 py-2 text-white text-sm font-semibold">
    	<div class="flex items-center gap-6">
    		<div class="text-xl font-bold">🌊</div>
    			<a href="#">Dashboard</a>
				<a href="#">Games</a>
				<a href="#">Tournament</a>
				<a href="#">Leaderboard</a>
				<a href="#">Chat</a>
			</div>
		<div class="flex items-center gap-6">
			<span class="text-xl">${user}  🔔</span>
			<div id="avatar" class="w-8 h-8 rounded-full overflow-hidden bg-white"></div>
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
	if (!data)
		return ;
	if (!params)
		return ;
}