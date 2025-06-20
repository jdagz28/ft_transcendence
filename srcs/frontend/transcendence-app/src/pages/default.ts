import { whoAmI } from "./mainPage";
import { ROUTE_LOGIN } from "../router"

export function renderDefault(): void {
	const root = document.getElementById("app");
	if (!root) return;

	let data;
	data = whoAmI().then((data) => {
	if (!data.success) {
		localStorage.setItem('loginredir', "");
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
	</nav>
	ERROR 404`;
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
}