import { whoAmI } from "../setUpLayout";
import { openSidebarChat } from "../sidebarChat";
import { chatWebSocket } from "../chat/chatWebSocket";
import { chatSwitcher } from "../chat/chatSwitcher";
import { ROUTE_MAIN } from "../router";
import { refreshSidebarChat } from "../sidebarChat";
import { chatUI } from "../chat/chatUI";
import { isGamePending } from "../api/game";


let notificationWS: WebSocket | null = null;

type wsNotif =
	| { type: "game.invite"; senderId: string; gameId: string; chat: boolean; message: string; id:number; img: "/icons8-game-controller.svg"; title: "Game Invitation"}
	| { type: "tournament.invite"; senderId: string; tournamentId: string; message: string; id:number; img: "/icons8-tournament.svg"; title: "Tournament Invitation"}
	| { type: "friend.request"; requesterId: string; requesterName: string, message: string; id:number; img: "/icons8-invite.svg"; title: "Friend Request"}
	| { type: "tournament.update"; tournamentId: string; message: string; id:number; img: "/icons8-sync.svg"; title: "Tournament Update"}
	| { type: "game.turn"; gameId: string; message: string; id:number; img: "/icons8-double-left.svg"; title: "Game Turn"}
	| { type: "chat.invite"; senderId: number; message: string; groupId: number; groupName: string; id: number; img: "/chatroom.svg"; title: "Chat Invitation"};

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
	name: string | null;
	chat: boolean;
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

let emptyNotif = true;

function setAnsweredButtons(contentWrapper:HTMLDivElement) {
	const div = document.createElement("div");
	div.className = "mt-1 flex gap-2 text-[8px] text-gray-500 font-semibold";
	div.textContent = "You have already answered this notification";
	contentWrapper.appendChild(div);
}

function setErrorButtons(contentWrapper:HTMLDivElement) {
	const div = document.createElement("div");
	div.className = "mt-1 flex gap-2 text-[8px] text-red-500 font-semibold";
	div.textContent = "An error occurred while processing this notification";
	contentWrapper.appendChild(div);
}

function generateFriendRequestButtons(contentWrapper:HTMLDivElement, sender:string, token: string, user_id:number, notif_id:number) {
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
	// const blockBtn = document.createElement("button");
	// blockBtn.className = "rounded bg-red-800 px-1 py-0.5 text-[8px] font-semibold text-white hover:bg-red-950";
	// blockBtn.textContent = "Block";
	// btnDiv.appendChild(blockBtn);
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
			await chatWebSocket.joinAllAvailableRooms();

			const dropdown = document.getElementById('chatSwitcherDropdown');
			if (dropdown && !dropdown.classList.contains('hidden')) {
				await chatSwitcher.loadChatSwitcher();
			}
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
	// blockBtn.onclick = async () => {
	// 	const response = await fetch(`/chat/block-user`, {
	// 		method: 'PUT',
	// 		headers: {
	// 			'Authorization': `Bearer ${token}`,
	// 			'Content-Type': 'application/json'
	// 		},
	// 		credentials: 'include',
	// 		body: JSON.stringify({ blockedUserId: sender_id })
	// 	});
	// 	fetch(`/notifications/${user_id}/${notif_id}`, {
    // 		method: 'PATCH',
   	// 		headers: {
    //   			'Authorization': `Bearer ${token}`,
    //   			'Content-Type': 'application/json'
    // 		},
    // 		credentials: 'include',
    // 		body: JSON.stringify({status: "read"})
	// 	})
	// 	if (response.ok) {
	// 		btnDiv.remove();
	// 		setAnsweredButtons(contentWrapper);
	// 	} else {
	// 		btnDiv.remove();
	// 		setErrorButtons(contentWrapper);
	// 	}
	// }
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			chatUI.gameInviteFromNotif(String(gameId), "accept", String(sender_id), String(user_id), String(notif_id));
			setAnsweredButtons(contentWrapper);
				refreshSidebarChat();
				const overlay = document.createElement('div');
			overlay.className = "absolute inset-0 flex justify-center items-center bg-black bg-opacity-50 z-10";
			
			const box = document.createElement('div');
			box.className = "w-full max-w-md rounded-xl shadow-xl/20 bg-[#0d2551] text-white backdrop-blur-sm bg-opacity-90 p-8 space-y-6";
			
			const h = document.createElement("h1");
			h.textContent = `Remote Multiplayer:
												Not Implemented`;
			h.className = "text-2xl font-bold text-center";

			const p = document.createElement("p");
			p.textContent = "Invitation Accepted! Game will be in creator's browser.";
			p.className = "text-center"
			box.appendChild(h);
			box.appendChild(p);

			let buttonLabel = "Return to Main Menu";
			const btn = document.createElement("button");
			btn.textContent = buttonLabel;
			btn.className = "w-full py-3 rounded-md text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-400 hover:opacity-90 transition";
			btn.onclick = () => {
				window.location.hash = ROUTE_MAIN;
				overlay.remove();
			};
			box.appendChild(btn);
			overlay.appendChild(box);
			document.body.appendChild(overlay);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
				refreshSidebarChat();
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			chatUI.gameInviteFromNotif(String(gameId), "decline", String(sender_id), String(user_id), String(notif_id));
			setAnsweredButtons(contentWrapper);
				refreshSidebarChat();
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
				refreshSidebarChat();
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/games/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ gameId: gameId, response: "decline" })
		});
		await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
				refreshSidebarChat();
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
				refreshSidebarChat();
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
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
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/tournaments/invites/respond`, {
			method: 'PATCH',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ tournamentId: tournamentId, response: "decline" })
		});
		await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
}

function generateChatInviteButtons(contentWrapper:HTMLDivElement, chatId:number | null, sender_id: number, token: string, user_id: number, notif_id:number, groupName: string) {
	if (!chatId) {
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
		const response = await fetch(`/chat/invite/accept`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ groupId: chatId })
		});
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
			openSidebarChat(chatId, groupName, "group");
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
	denyBtn.onclick = async () => {
		const response = await fetch(`/chat/invite/refuse`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ groupId: chatId })
		});
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
	blockBtn.onclick = async () => {
		const response = await fetch(`/chat/invite/refuse`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ groupId: chatId })
		});
		await fetch(`/chat/block-user`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ blockedUserId: sender_id })
		});
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
      			'Authorization': `Bearer ${token}`,
      			'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		})
		if (response.ok) {
			btnDiv.remove();
			setAnsweredButtons(contentWrapper);
		} else {
			btnDiv.remove();
			setErrorButtons(contentWrapper);
		}
	}
}


function generateNotifDiv(notif: wsNotif, user_id:number, token:string): HTMLDivElement {
	/*`<div class="notif-item flex items-center gap-3 rounded-md border border-gray-200 p-1 transition hover:bg-gray-50">
        <div class="notif-icon flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[rgb(18,22,68)]  text-white">
           <img src="/icons8-google.svg" class="w-6 h-6" alt="Google logo" />
        </div>
        <div class="notif-content flex-grow">
            <p class="text-[10px] font-semibold text-gray-800">Friend Request</p>
            <p class="text-[10px] text-gray-600">Test has sent you a friend request</p>
        </div>
    </div>` */


	const notif_id = notif.id;
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
	} else if (notif.type === "chat.invite") {
		notif.img = "/chatroom.svg";
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

	if (notif.type !== "game.invite" && notif.type !== "tournament.invite" && notif.type !== "friend.request" && notif.type !== "chat.invite") {
		fetch(`/notifications/${user_id}/${notif_id}`, {
    		method: 'PATCH',
   			headers: {
     				'Authorization': `Bearer ${token}`,
     				'Content-Type': 'application/json'
    		},
    		credentials: 'include',
    		body: JSON.stringify({status: "read"})
		}).then((res) => {
			if (!res.ok) {
				console.error(`Failed to mark notification ${notif_id} as read`);
			} else {
				const notifContainer = document.getElementById('notifContainer');
				if (notifContainer) {
					populateNotifContainer(notifContainer, user_id);
				}
			}
		}).catch((err) => {
			console.error(`Error marking notification ${notif_id} as read:`, err);
		});
	}

	if (notif.type === "friend.request") {
		generateFriendRequestButtons(contentWrapper, notif.message.replace(/ .*/,''), token, user_id, notif.id);
	} else if (notif.type === "game.invite") {
		generateGameInviteButtons(contentWrapper, Number(notif.gameId), Number(notif.senderId), token, user_id, notif.id);
	} else if (notif.type === "tournament.invite") {
		generateTournamentInviteButtons(contentWrapper, Number(notif.tournamentId), Number(notif.senderId), token, user_id, notif.id);
	} else if (notif.type === "chat.invite") {
		generateChatInviteButtons(contentWrapper, Number(notif.groupId), Number(notif.senderId), token, user_id, notif.id, notif.groupName);
	}

	notifItem.appendChild(iconWrapper);
	notifItem.appendChild(contentWrapper);

	return notifItem;
}

function generateAPINotifDiv(notif: APINotif, token: string, id:number): HTMLDivElement {
	// console.log("Generating notification div for:", notif);
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
	} else if (notif.type === "chat.invite") {
		notif.img = "/chatroom.svg";
	}

	const iconImg = document.createElement("img");
	iconImg.src = notif.img;
	iconImg.className = "w-5 h-5 invert";

	iconWrapper.appendChild(iconImg);

	const contentWrapper = document.createElement("div");
	contentWrapper.className = "notif-content flex-grow";

	if (notif.type === "friend.request") {
		notif.title = "Friend Request";
	} else if (notif.type === "game.invite") {
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
		if (notif.type !== "game.invite" && notif.type !== "tournament.invite" && notif.type !== "friend.request" && notif.type !== "chat.invite") {
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
		generateFriendRequestButtons(contentWrapper, notif.content.replace(/ .*/,''), token, id, notif.id);
	} else if (notif.type === "game.invite" && notif.is_read === 0) {
		generateGameInviteButtons(contentWrapper, notif.type_id, notif.sender_id, token, id, notif.id);
	} else if (notif.type === "tournament.invite" && notif.is_read === 0) {
		generateTournamentInviteButtons(contentWrapper, notif.type_id, notif.sender_id, token, id, notif.id);
	} else if (notif.type === "chat.invite" && notif.is_read === 0) {
		generateChatInviteButtons(contentWrapper, notif.type_id, notif.sender_id, token, id, notif.id, notif.name || "Group Chat");
	} else if (notif.is_read !== 0 && (notif.type === "game.invite" || notif.type === "tournament.invite" || notif.type === "friend.request" || notif.type === "chat.invite")) {
		setAnsweredButtons(contentWrapper);
	}

	notifItem.appendChild(iconWrapper);
	notifItem.appendChild(contentWrapper);

	return notifItem;
}

export async function populateNotifContainer(container: HTMLElement, id: number): Promise<void> {
	const token = localStorage.getItem("token");
	if (!token) {
		emptyNotif = true;
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
		emptyNotif = true;
		console.error('Failed to fetch notifications:', response.statusText);
		container.innerHTML = '<span class="text-xs text-gray-400 absolute inset-0 flex items-center justify-center">No Notifications</span>';
		return;
	}
	const data = await response.json();
	if (!data || !data.notifications || data.notifications.length === 0) {
		emptyNotif = true;
		console.warn('No notifications found for user:', id);
		container.innerHTML = '<span class="text-xs text-gray-400 absolute inset-0 flex items-center justify-center">No Notifications</span>';
		return;
	}
	container.innerHTML = '';
	emptyNotif = false;
	// data.notifications.forEach((notif: APINotif) => {
	// 	const notifDiv = generateAPINotifDiv(notif, token, id);
	// 	container.prepend(notifDiv);
	// });
	for (const raw of data.notifications) {
		if (raw.type === "game.invite" && !(await isGamePending(raw.type_id))) {
			await fetch(`notifications/${id.toString()}/${raw.id.toString()}`, {
				method: "PATCH",
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({status: "read"})
			});
			continue;
		}
		const notifDiv = generateAPINotifDiv(raw, token, id);
		container.prepend(notifDiv);
	}
}

export async function connectNotifications(): Promise<WebSocket | null> {
  const user = await whoAmI();
  // console.log('User data:', user);
  if (!user.success) {
    console.warn('User is not authenticated, cannot connect to notifications WebSocket');
    return null;
  }
  // console.log('Connecting to notifications WebSocket for user:', user.data.id);
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
	// console.log('Open is', open);
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
  
  /*if (notificationWS && notificationWS.readyState === WebSocket.OPEN) {
	console.log('Notifications WebSocket is already connected');
    return notificationWS;
  }

  if (notificationWS) {
    notificationWS.close();
    notificationWS = null;
  }*/

  try {
    notificationWS = new WebSocket(
      `wss://${location.host}/notifications/ws?userId=${userId}`
    );

	

    notificationWS.onopen = () => {
      // console.log('Notifications WebSocket connected');
    };

    notificationWS.onmessage = (event) => {
    	const msg: wsNotif = JSON.parse(event.data);
		notificationCount++;
		if (open && notifContainer) {
			notificationCount--;
			if (emptyNotif)
				notifContainer.innerHTML = '';
			emptyNotif = false;
			notifContainer.prepend(generateNotifDiv(msg, user.data.id, token || ''));
			
		}
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
		}
      // console.log('WebSocket message received:', msg);
    };

    notificationWS.onclose = (event) => {
      // console.log('Notifications WebSocket closed:', event.code, event.reason);
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
