import { whoAmI } from "../setUpLayout";


let notificationWS: WebSocket | null = null;

type wsNotif =
	| { type: "game.invite"; senderId: string; gameId: string; message: string; img: "/icons8-game-controller.svg"; title: "Game Invitation"}
	| { type: "tournament.invite"; senderId: string; tournamentId: string; message: string; img: "/icons8-tournament.svg"; title: "Tournament Invitation"}
	| { type: "friend.request"; requesterId: string; requesterName: string, message: string; img: "/icons8-invite.svg"; title: "Friend Request"}
	| { type: "tournament.update"; tournamentId: string; message: string; img: "/icons8-sync.svg"; title: "Tournament Update"}
	| { type: "game.turn"; gameId: string; message: string; img: "/icons8-double-left.svg"; title: "Game Turn"};

type APINotif = {
	id: number;
	user_id: number;
	sender_id: number;
	type: string;
	type_id: number | null;
	content: string;
	is_read: number;
	created: string;
	img: string;
	title: string;
};

/*
	{
		"userId": 2,
		"notifications": [
			{
				"id": 2,
				"user_id": 2,
				"sender_id": 4,
				"type": "friend.request",
				"type_id": null,
				"content": "testcortiz sent you a friend request",
				"is_read": 0,
				"created": "2025-07-11 16:23:05"
			},
			{
				"id": 3,
				"user_id": 2,
				"sender_id": 3,
				"type": "friend.request",
				"type_id": null,
				"content": "testjdagoy sent you a friend request",
				"is_read": 0,
				"created": "2025-07-11 16:24:52"
			}
		]
	}
*/

function setAnsweredButtons(contentWrapper:HTMLDivElement) {
	const div = document.createElement("div");
	div.className = "mt-1 flex gap-2 text-[8px] text-gray-500 font-semibold";
	div.textContent = "You have already answered this notification";
	contentWrapper.appendChild(div);
}

function generateFriendRequestButtons(contentWrapper:HTMLDivElement, sender_id:number, sender:string, token: string, user_id:number, notif_id:number) {
	const btnDiv = document.createElement("div");
	btnDiv.className = "mt-1 flex gap-2";
	const acceptBtn = document.createElement("button");
	acceptBtn.className = "rounded bg-green-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-green-600";
	acceptBtn.textContent = "Accept";
	btnDiv.appendChild(acceptBtn);
	const denyBtn = document.createElement("button");
	denyBtn.className = "rounded bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-600";
	denyBtn.textContent = "Deny";
	btnDiv.appendChild(denyBtn);
	const blockBtn = document.createElement("button");
	blockBtn.className = "rounded bg-red-800 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-950";
	blockBtn.textContent = "Block";
	btnDiv.appendChild(blockBtn);
	contentWrapper.appendChild(btnDiv);
	acceptBtn.onclick = async () => {
		const response = await fetch(`/users/me/friends`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ friend: `${sender}`, action: "accept" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	denyBtn.onclick = async () => {
		const response = await fetch(`/users/me/friends`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ friend: `${sender}`, action: "decline" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
}

function generateGameInviteButtons(contentWrapper:HTMLDivElement, gameId:number | null, sender_id: number, token: string, user_id: number, notif_id:number) {
	if (!gameId) {
		console.error("Game ID is null, cannot generate game invite buttons");
		return;
	}
	const btnDiv = document.createElement("div");
	btnDiv.className = "mt-1 flex gap-2";
	const acceptBtn = document.createElement("button");
	acceptBtn.className = "rounded bg-green-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-green-600";
	acceptBtn.textContent = "Accept";
	btnDiv.appendChild(acceptBtn);
	const denyBtn = document.createElement("button");
	denyBtn.className = "rounded bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-600";
	denyBtn.textContent = "Deny";
	btnDiv.appendChild(denyBtn);
	const blockBtn = document.createElement("button");
	blockBtn.className = "rounded bg-red-800 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-950";
	blockBtn.textContent = "Block";
	btnDiv.appendChild(blockBtn);
	contentWrapper.appendChild(btnDiv);
	acceptBtn.onclick = async () => {
		const response = await fetch(`/games/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ gameId: gameId, response: "accept" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	denyBtn.onclick = async () => {
		const response = await fetch(`/games/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ gameId: gameId, response: "decline" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
}

function generateTournamentInviteButtons(contentWrapper:HTMLDivElement, tournamentId:number | null, sender_id: number, token: string, user_id: number, notif_id:number) {
	if (!tournamentId) {
		console.error("Tournament ID is null, cannot generate tournament invite buttons");
		return;
	}
	const btnDiv = document.createElement("div");
	btnDiv.className = "mt-1 flex gap-2";
	const acceptBtn = document.createElement("button");
	acceptBtn.className = "rounded bg-green-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-green-600";
	acceptBtn.textContent = "Accept";
	btnDiv.appendChild(acceptBtn);
	const denyBtn = document.createElement("button");
	denyBtn.className = "rounded bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-600";
	denyBtn.textContent = "Deny";
	btnDiv.appendChild(denyBtn);
	const blockBtn = document.createElement("button");
	blockBtn.className = "rounded bg-red-800 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-950";
	blockBtn.textContent = "Block";
	btnDiv.appendChild(blockBtn);
	contentWrapper.appendChild(btnDiv);
	acceptBtn.onclick = async () => {
		const response = await fetch(`/tournaments/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ tournamentId: tournamentId, response: "accept" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	denyBtn.onclick = async () => {
		const response = await fetch(`/tournaments/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ tournamentId: tournamentId, response: "decline" })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		if (response.ok) {
			fetch(`/notifications/${user_id}/${notif_id}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (res.ok) {
					btnDiv.remove();
					setAnsweredButtons(contentWrapper);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif_id} as read:`, err);
			});
		}
	}
}


function generateNotifDiv(notif: wsNotif): HTMLDivElement {
	/*`<div class="notif-item flex items-center gap-3 rounded-md border border-gray-200 p-1 transition hover:bg-gray-50">
        <div class="notif-icon flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[rgb(18,22,68)]  text-white">
           <img src="/icons8-google.svg" class="w-6 h-6" alt="Google logo" />
        </div>
        <div class="notif-content flex-grow">
            <p class="text-[10px] font-semibold text-gray-800">Friend Request</p>
            <p class="text-[10px] text-gray-600">Test has sent you a friend request</p>
        </div>
    </div>` */

	const notifItem = document.createElement("div");
	notifItem.className = "notif-item flex items-center gap-3 rounded-md border border-gray-200 p-1 transition hover:blue-300";

	const iconWrapper = document.createElement("div");
	iconWrapper.className = "notif-icon flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-950 text-white";

	if (notif.type === "game.invite") {
		notif.img = "/icons8-game-controller.svg";
	} else if (notif.type === "tournament.invite") {
		notif.img = "/icons8-tournament.svg";
	} else if (notif.type === "friend.request") {
		notif.img = "/icons8-invite.svg";
	} else if (notif.type === "tournament.update") {
		notif.img = "/icons8-sync.svg";
	} else if (notif.type === "game.turn") {
		notif.img = "/icons8-double-left.svg";
	}
	const iconImg = document.createElement("img");
	iconImg.src = notif.img;
	iconImg.className = "w-5 h-5 invert";

	iconWrapper.appendChild(iconImg);

	const contentWrapper = document.createElement("div");
	contentWrapper.className = "notif-content flex-grow";

	const title = document.createElement("p");
	title.className = "text-[10px] font-semibold text-gray-800";
	title.textContent = notif.title;

	const desc = document.createElement("p");
	desc.className = "text-[10px] text-gray-600";
	desc.textContent = notif.message;

	const timeStamp = document.createElement("p");
	timeStamp.className = "text-[8px] text-black";
	timeStamp.textContent = "Right now";

	contentWrapper.appendChild(title);
	contentWrapper.appendChild(desc);
	contentWrapper.appendChild(timeStamp);

	notifItem.appendChild(iconWrapper);
	notifItem.appendChild(contentWrapper);

	return notifItem;
}

function generateAPINotifDiv(notif: APINotif, token: string, id:number): HTMLDivElement {
	console.log("Generating notification div for:", notif);
	const notifItem = document.createElement("div");
	notifItem.className = "notif-item flex items-center gap-3 rounded-md border border-gray-200 p-1 transition hover:bg-blue-100";

	const iconWrapper = document.createElement("div");
	iconWrapper.className = "notif-icon flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-950 text-white";

	if (notif.type === "game.invite") {
		notif.img = "/icons8-game-controller.svg";
	} else if (notif.type === "tournament.invite") {
		notif.img = "/icons8-tournament.svg";
	} else if (notif.type === "friend.request") {
		notif.img = "/icons8-invite.svg";
	} else if (notif.type === "tournament.update") {
		notif.img = "/icons8-sync.svg";
	} else if (notif.type === "game.turn") {
		notif.img = "/icons8-double-left.svg";
	}

	const iconImg = document.createElement("img");
	iconImg.src = notif.img;
	iconImg.className = "w-5 h-5 invert";

	iconWrapper.appendChild(iconImg);

	const contentWrapper = document.createElement("div");
	contentWrapper.className = "notif-content flex-grow";

	if (notif.type === "friend.request") {
		notif.title = "Friend Request";
	}
	else if (notif.type === "game.invite") {
		notif.title = "Game Invitation";
	} else if (notif.type === "tournament.invite") {
		notif.title = "Tournament Invitation";
	} else if (notif.type === "tournament.update") {
		notif.title = "Tournament Update";
	} else if (notif.type === "game.turn") {
		notif.title = "Game Turn";
	}

	const title = document.createElement("p");
	title.className = "text-[10px] font-semibold text-gray-800";
	title.textContent = notif.title;

	const desc = document.createElement("p");
	desc.className = "text-[10px] text-gray-600";
	desc.textContent = notif.content;

	const timeStamp = document.createElement("p");
	timeStamp.className = "text-[8px] text-black";
	const date = new Date(notif.created)
	date.setHours(date.getHours() + 2);
	timeStamp.textContent = date.toLocaleTimeString([], {year: 'numeric', month: 'long' , day: 'numeric' , hour: '2-digit', minute: '2-digit' });

	if (notif.is_read === 0) {
		if (notif.type !== "game.invite" && notif.type !== "tournament.invite" && notif.type !== "friend.request") {
			fetch(`/notifications/${id.toString()}/${notif.id.toString()}`, {
    			method: 'PATCH',
   				headers: {
      				'Authorization': `Bearer ${token}`,
      				'Content-Type': 'application/json'
    			},
    			credentials: 'include',
    			body: JSON.stringify({status: "read"})
			}).then((res) => {
				if (!res.ok) {
					console.error(`Failed to mark notification ${notif.id} as read`);
				}
			}).catch((err) => {
				console.error(`Error marking notification ${notif.id} as read:`, err);
			});
		}
	} else {
		iconWrapper.classList.add("bg-[rgb(27,33,55)]");
		iconWrapper.classList.remove("bg-blue-950");
		notifItem.classList.add("bg-gray-100");
		notifItem.classList.remove("hover:bg-blue-100");
		notifItem.classList.add("hover:bg-gray-200");
	}

	contentWrapper.appendChild(title);
	contentWrapper.appendChild(desc);
	contentWrapper.appendChild(timeStamp);

	if (notif.type === "friend.request" && notif.is_read === 0) {
		generateFriendRequestButtons(contentWrapper, notif.sender_id, notif.content.replace(/ .*/,''), token, id, notif.id);
	} else if (notif.type === "game.invite" && notif.is_read === 0) {
		generateGameInviteButtons(contentWrapper, notif.type_id, notif.sender_id, token, id, notif.id);
	} else if (notif.type === "tournament.invite" && notif.is_read === 0) {
		generateTournamentInviteButtons(contentWrapper, notif.type_id, notif.sender_id, token, id, notif.id);
	} else if (notif.is_read !== 0 && (notif.type === "game.invite" || notif.type === "tournament.invite" || notif.type === "friend.request")) {
		setAnsweredButtons(contentWrapper);
	}

	notifItem.appendChild(iconWrapper);
	notifItem.appendChild(contentWrapper);

	return notifItem;
}

async function populateNotifContainer(container: HTMLElement, id: number): Promise<void> {
	const token = localStorage.getItem("token");
	if (!token) {
		console.warn("No token found, cannot fetch notifications");
		container.innerHTML = '<span class="text-xs text-gray-400 absolute inset-0 flex items-center justify-center">No Notifications</span>';
		return;
	}
	const response = await fetch(`/notifications/${id.toString()}`, {
		method: 'get',
	  	credentials: 'include',
	  	headers: { 'Content-Type': 'application/json',
	  		'Authorization': `Bearer ${token}`,
	  	},
	});

	if (!response.ok) {
		console.error('Failed to fetch notifications:', response.statusText);
		container.innerHTML = '<span class="text-xs text-gray-400 absolute inset-0 flex items-center justify-center">No Notifications</span>';
		return;
	}
	const data = await response.json();
	if (!data || !data.notifications || data.notifications.length === 0) {
		console.warn('No notifications found for user:', id);
		container.innerHTML = '<span class="text-xs text-gray-400 absolute inset-0 flex items-center justify-center">No Notifications</span>';
		return;
	}
	container.innerHTML = '';
	data.notifications.forEach((notif: APINotif) => {
		const notifDiv = generateAPINotifDiv(notif, token, id);
		container.prepend(notifDiv);
	});
}

export async function connectNotifications(): Promise<WebSocket | null> {
  const user = await whoAmI();
  if (!user.success) {
    console.warn('User is not authenticated, cannot connect to notifications WebSocket');
    return null;
  }

  	let notificationCount = 0;
	const token = localStorage.getItem("token");
	if (token) {
		const response = await fetch(`/notifications/${user.data.id.toString()}`, {
			method: 'get',
	  		credentials: 'include',
	  		headers: { 'Content-Type': 'application/json',
	  			'Authorization': `Bearer ${token}`,
	 	 	},
		});
		if (response.ok) {
			const data = await response.json();
			data.notifications.forEach((notif: APINotif) => {
				if (notif.is_read === 0) {
					notificationCount++;
				}	
			});
		}
	}
  	
	let notifString:string = notificationCount.toString();
	if (notifString.length > 1)
		notifString = '9+';

	const badge = document.getElementById('notification-badge');

	if (badge) {
		if (notificationCount > 0) {
			badge.classList.remove('hidden');
			badge.classList.add('flex');
			badge.textContent = notifString;
		} else {
			badge.classList.add('hidden');
			badge.classList.remove('flex');
			badge.textContent = '';
		}
	}

	const notifBtn = document.getElementById('notifBtn');
	const notifModal = document.getElementById('notifModal');
	const notifContainer = document.getElementById('notifContainer');
	let open = false;
	console.log('Open is', open);
	if (notifBtn && notifModal && badge) {
		notifBtn.addEventListener('click', (event) => {
			if (notifModal.classList.contains('hidden')) {
				badge.classList.add('hidden');
				badge.classList.remove('flex');
				badge.textContent = '';
				notificationCount = 0;
				open = true;
    			notifModal.classList.remove('hidden', 'pointer-events-none', 'scale-95');
    			notifModal.classList.add('pointer-events-auto', 'scale-100');
				if (notifContainer) {
					notifContainer.innerHTML = '';
					populateNotifContainer(notifContainer, user.data.id);
				}
    		} else if (!notifModal.contains(event.target as Node)) {
				open = false;
    			notifModal.classList.add("hidden", 'pointer-events-none', 'scale-95');
    			notifModal.classList.remove('pointer-events-auto', 'scale-100');
			}
		});
	}
	document.addEventListener('click', (event) => {
		if (notifBtn && notifModal) {
			if (!notifBtn.contains(event.target as Node) && !notifModal.contains(event.target as Node)) {
				open = false;
				notifModal.classList.add('hidden', 'pointer-events-none', 'scale-95');
    			notifModal.classList.remove('pointer-events-auto', 'scale-100');
	  		}
		}
	});

  const userId = user.data.id;
  
  if (notificationWS && notificationWS.readyState === WebSocket.OPEN) {
    return notificationWS;
  }

  if (notificationWS) {
    notificationWS.close();
    notificationWS = null;
  }

  try {
    notificationWS = new WebSocket(
      `wss://${location.host}/notifications/ws?userId=${userId}`
    );

	

    notificationWS.onopen = () => {
      console.log('Notifications WebSocket connected');
    };

    notificationWS.onmessage = (event) => {
    	const msg: wsNotif = JSON.parse(event.data);
		notificationCount++;
		notifString = notificationCount.toString();
		if (notifString.length > 1)
			notifString = '9+';
		if (badge) {
			if (notificationCount > 0) {
				badge.classList.remove('hidden');
				badge.classList.add('flex');
				badge.textContent = notifString;
			} else {
				badge.classList.add('hidden');
				badge.classList.remove('flex');
				badge.textContent = '';
			}
			if (open && notifContainer) {
				notifContainer.prepend(generateNotifDiv(msg));
			}
		}
      console.log('WebSocket message received:', msg);
    };

    notificationWS.onclose = (event) => {
      console.log('Notifications WebSocket closed:', event.code, event.reason);
      notificationWS = null;

      if (event.code !== 1000) {
        setTimeout(() => connectNotifications(), 5000);
      }
    };

    notificationWS.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return notificationWS;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
}

export function disconnectNotifications(): void {
  if (notificationWS) {
    notificationWS.close(1000, 'User logout');
    notificationWS = null;
  }
}