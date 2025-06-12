import type { RouteParams } from "../router";

type userData = {
	name: string;
	email:string;
	created: string;
	avatar: {
		url:string;
	}
};

type loggedIn =
	| { success: true; data: userData }
	| { success: false; error: any};

async function whoAmI(): Promise<loggedIn>{
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
    return { success: true, data: json};
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
		alert(`Redirecting to login page`); //! DELETE
		window.location.replace("#login");
		return;
	}
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
		<div class="flex items-center gap-4">
			<span class="text-xl">🔔</span>
			<div id="avatar" class="w-8 h-8 rounded-full overflow-hidden bg-white"></div>
    	</div>
	</nav>`;
	// alert(data.data.avatar.url);
	// const rawUrl = data.data.avatar.url;
	// const fixedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
  	// ? rawUrl
  	// : `http://${rawUrl.replace(/^http:?\/?/, '')}`;
	const userAvatar = document.getElementById('avatar');
	if (userAvatar) {
		const img = document.createElement('img');
		img.src = data.data.avatar.url;
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