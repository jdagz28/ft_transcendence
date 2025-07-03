import type { RouteParams } from "../router";
import type { userData } from "../setUpLayout";
import { setupAppLayout } from "../setUpLayout";

/*interface CreateGameLobby {
  mode:
    | "training"
    | "single-player"
    | "local-multiplayer"
    | "online-multiplayer";
  maxPlayers: number;
  priv: boolean;
  invitedPlayers: string[];
  loggedInPlayers: string[];
  gameId: string;
}*/

type user = {
	username: string;
	userID: string;
	pfp: Blob;
	token: string;
	connected: boolean;
};

// async function checkLobbyAccess(lobbyId: string) {
//   try {
// 	const token = localStorage.getItem("token") ?? "";
//     const response = await fetch(`/games/${lobbyId}/join`, {
//       method: 'PATCH',
//       credentials: 'include',
//       headers: { 'Content-Type': 'application/json',
// 		'Authorization': `Bearer ${token}`,
// 	   },
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       console.error('Access check failed:', error);
//       return false;
//     }
//     return true;
//   } catch (err) {
//     console.error('Fetch error:', err);
//     return false;
//   }
// }

function renderLobbyError(root: HTMLDivElement) {
	root.innerHTML = 'ERROR LOADING PAGE'
}

function renderLobbyHTML(root: HTMLDivElement, user1: user, user2: user, user3: user, user4: user, playerCount: string) {
	let playersHTML: string;
	if (playerCount === "1" || playerCount === "Training") {
		playersHTML = `
<div class="relative z-10 flex [min-height:calc(100vh-3.5rem)] items-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-32 selection:bg-blue-400 selection:text-white">

    <div class="relative flex flex-col items-center w-full -mt-40">
      <div id="avatar1" class="h-35 w-35 rounded-full bg-white mx-auto"></div>
      	<h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
        	<div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        		<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">W</div>
        		<span class="flex-1 mx-2 truncate text-center text-[25px]">${user1.username}</span>
        		<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">S</div>
      		</div>
    	</h2>
    </div>`;
	} else if (playerCount === "2") {
		playersHTML = `
		<div class="relative z-10 flex [min-height:calc(100vh-3.5rem)] items-center justify-between bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-32 selection:bg-blue-400 selection:text-white">
  
  		<div class="relative flex flex-col items-start -mt-40">
    		<div id="avatar1" class="h-35 w-35 rounded-full bg-white"></div>
    		<h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      			<div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        			<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">W</div>
        			<span class="flex-1 mx-2 truncate text-center text-[25px]">${user1.username}</span>
        			<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">S</div>
      			</div>
    		</h2>
  		</div>

  		<div class="relative flex flex-col items-start -mt-40">
    		<div id="avatar2" class="h-35 w-35 rounded-full bg-white"></div>
    		<h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      			<div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        			<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">↑</div>
        			<span class="flex-1 mx-2 truncate text-center text-[25px]">${user2.username}</span>
        			<div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">↓</div>
      			</div>
    		</h2>
			<button id="dis2" class="absolute left-1/2 top-full mt-6 hidden -translate-x-1/2 bg-red-500  hover:bg-red-400  text-white text-sm font-semibold px-4 py-1 rounded shadow transition duration-200">
          		Disconnect
        	</button>
        	<button id="con2" class="absolute left-1/2 top-full mt-6 -translate-x-1/2 bg-white  hover:bg-gray-100  text-gray-800 text-sm font-semibold px-6.25 py-1 rounded shadow transition duration-200">
          		Connect
        	</button>
  		</div>`;
	} else if (playerCount === "4") {
		playersHTML = `
		<div class="relative z-10 grid grid-cols-2 gap-x-32 gap-y-20 [min-height:calc(100vh-3.5rem)] items-center justify-items-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-12 py-40 selection:bg-blue-400 selection:text-white">

  <!-- Player 1 -->
  <div class="relative flex flex-col items-center -mt-40">
    <div id="avatar1" class="h-35 w-35 rounded-full bg-white"></div>
    <h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      <div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">W</div>
        <span class="flex-1 mx-2 truncate text-center text-[25px]">${user1.username}</span>
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">W</div>
      </div>
    </h2>
  </div>

  <!-- Player 2 -->
  <div class="relative flex flex-col items-center -mt-40">
    <div id="avatar2" class="h-35 w-35 rounded-full bg-white"></div>
    <h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      <div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">↑</div>
        <span class="flex-1 mx-2 truncate text-center text-[25px]">${user2.username}</span>
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">↑</div>
      </div>
    </h2>
	<button id="dis2" class="absolute left-1/2 top-full mt-6 hidden -translate-x-1/2 bg-red-500  hover:bg-red-400  text-white text-sm font-semibold px-4 py-1 rounded shadow transition duration-200">
          		Disconnect
        	</button>
        	<button id="con3" class="absolute left-1/2 top-full mt-6 -translate-x-1/2 bg-white  hover:bg-gray-100  text-gray-800 text-sm font-semibold px-6.25 py-1 rounded shadow transition duration-200">
          		Connect
        	</button>
  </div>

  <!-- Player 3 -->
  <div class="relative flex flex-col items-center -mt-20">
    <div id="avatar3" class="h-35 w-35 rounded-full bg-white"></div>
    <h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      <div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">L</div>
        <span class="flex-1 mx-2 truncate text-center text-[25px]">${user3.username}</span>
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">L</div>
      </div>
    </h2>
	<button id="dis3" class="absolute left-1/2 top-full mt-6 hidden -translate-x-1/2 bg-red-500  hover:bg-red-400  text-white text-sm font-semibold px-4 py-1 rounded shadow transition duration-200">
          		Disconnect
        	</button>
        	<button id="con3" class="absolute left-1/2 top-full mt-6 -translate-x-1/2 bg-white  hover:bg-gray-100  text-gray-800 text-sm font-semibold px-6.25 py-1 rounded shadow transition duration-200">
          		Connect
        	</button>
  </div>

  <!-- Player 4 -->
  <div class="relative flex flex-col items-center -mt-20">
    <div id="avatar4" class="h-35 w-35 rounded-full bg-white"></div>
    <h2 class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-4xl font-bold text-white">
      <div class="bg-[rgba(20,50,90,0.70)] rounded-md px-2 py-2 w-64 flex items-center justify-between">
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">5</div>
        <span class="flex-1 mx-2 truncate text-center text-[25px]">${user4.username}</span>
        <div class="h-10 w-10 border-2 border-white bg-transparent rounded-sm flex items-center justify-center text-white font-bold text-[30px]">5</div>
      </div>
    </h2>
	<button id="dis4" class="absolute left-1/2 top-full mt-6 hidden -translate-x-1/2 bg-red-500  hover:bg-red-400  text-white text-sm font-semibold px-4 py-1 rounded shadow transition duration-200">
          		Disconnect
        	</button>
        	<button id="con4" class="absolute left-1/2 top-full mt-6 -translate-x-1/2 bg-white  hover:bg-gray-100  text-gray-800 text-sm font-semibold px-6.25 py-1 rounded shadow transition duration-200">
          		Connect
        	</button>
  </div>`;
	} else {
		renderLobbyError(root);
		return;
	}
	const btnHTML = ` 
	<div class="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
      <button
        id="startBtn"
        class="bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-[40px] px-15 py-1 rounded-lg shadow-md transition duration-200"
      >
        Start
      </button>
      <button
        id="optionsBtn"
        class="bg-white hover:bg-gray-100 text-gray-800 font-semibold text-lg text-[40px] px-12 py-1 rounded-lg shadow transition duration-200"
      >
        Options
      </button>
    </div>

	<div id="optionsModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-transparent">
    <div class="relative w-96 max-w-full rounded-lg border-4 border-[rgba(20,50,90,1)] bg-white p-8">
      <button id="closeOptions" class="absolute top-3 right-3 text-xl font-bold text-gray-600 hover:text-gray-900" aria-label="Close Options Modal">&times;</button>
      <h2 class="mb-4 text-2xl font-bold">Game Options</h2>
      <label class="mb-4 block">
        <span class="text-gray-700">Number of Players</span>
        <select id="numPlay" class="mt-1 block w-full rounded border-gray-300">
          <option>1</option>
          <option>2</option>
          <option>4</option>
          <option>Training</option>
        </select>
      </label>
      <label class="mb-4 block">
        <span class="text-gray-700">Score to Win</span>
        <input id="scTW" type="text" inputmode="numeric" pattern="[0-9]*" value="10" maxlength="2" class="mt-1 block w-full rounded border-gray-300" autocomplete="off" />
      </label>
      <label class="mb-4 block">
        <span class="text-gray-700">Number of Matches</span>
        <input id="boG" type="text" inputmode="numeric" pattern="[0-9]*" value="1" maxlength="2" class="mt-1 block w-full rounded border-gray-300" autocomplete="off" />
      </label>
    </div>
  </div>

  <div id="loginModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-transparent">
    <div class="relative w-96 max-w-full rounded-lg border-4 border-white bg-[rgba(20,50,90,1)] p-8">
      <button id="closeLogin" class="absolute top-3 right-3 text-xl font-bold text-gray-600 hover:text-gray-900" aria-label="Close Options Modal">&times;</button>
      <div class="flex flex-col items-center">
        <img src="/icons8-rocket.svg" class="mb-6 h-22 w-22" />
        <h2 class="mb-8 text-4xl font-bold text-white">LOGIN</h2>
      </div>
      <form id="loginForm" class="space-y-5">
        <input type="text" id="username" placeholder="Username" class="w-full rounded-md border border-transparent bg-[#081a37] px-4 py-2 placeholder-gray-400 focus:ring-2 focus:ring-sky-400 focus:outline-none" />
        <input type="password" id="password" placeholder="Password" class="w-full rounded-md border border-transparent bg-[#081a37] px-4 py-2 placeholder-gray-400 focus:ring-2 focus:ring-sky-400 focus:outline-none" />
        <button type="submit" class="w-full rounded-md bg-gradient-to-r from-orange-500 to-orange-400 py-3 text-xl font-semibold text-white transition hover:opacity-90">Login</button>
      </form>
	<div id="loginError" class="text-red-400 text-sm mt-3 hidden text-center"></div>
    </div>
  </div>
	</div>`;
	root.innerHTML = playersHTML + btnHTML;
	const userAvatar1 = document.getElementById('avatar1');
    if (userAvatar1  && user1.connected === true) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(user1.pfp);
      img.alt = 'User Avatar';
      img.className = 'w-full h-full object-cover';
      userAvatar1.innerHTML = '';
      userAvatar1.appendChild(img);
    }
	const userAvatar2 = document.getElementById('avatar2');
    if (userAvatar2 && user2.connected === true) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(user2.pfp);
      img.alt = 'User Avatar';
      img.className = 'w-full h-full object-cover';
      userAvatar2.innerHTML = '';
      userAvatar2.appendChild(img);
    }
	const userAvatar3 = document.getElementById('avatar3');
    if (userAvatar3 && user3.connected === true) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(user3.pfp);
      img.alt = 'User Avatar';
      img.className = 'w-full h-full object-cover';
      userAvatar3.innerHTML = '';
      userAvatar3.appendChild(img);
    }
	const userAvatar4 = document.getElementById('avatar4');
    if (userAvatar4 && user4.connected === true) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(user4.pfp);
      img.alt = 'User Avatar';
      img.className = 'w-full h-full object-cover';
      userAvatar4.innerHTML = '';
      userAvatar4.appendChild(img);
    }
}

function setUpEventListeners(root: HTMLDivElement, user1: user, user2: user, user3: user, user4: user, playerCount: string) {
	const optionsBtn = document.getElementById('optionsBtn') as HTMLButtonElement;
    const optionsModal = document.getElementById('optionsModal') as HTMLDivElement;
    const closeOptions = document.getElementById('closeOptions') as HTMLButtonElement;
	const numPlay = document.getElementById('numPlay') as HTMLSelectElement;
	const scTW = document.getElementById('scTW') as HTMLInputElement;
	const boG = document.getElementById("boG") as HTMLInputElement;

    optionsBtn.addEventListener('click', () => {
    	optionsModal.classList.remove('hidden');
		optionsModal.classList.add('flex');
    });

    closeOptions.addEventListener('click', () => {
    	optionsModal.classList.add('hidden');
		optionsModal.classList.remove('flex');
		if (numPlay.value !== playerCount) {
			playerCount = numPlay.value;
			renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
			setUpEventListeners(root, user1, user2, user3, user4, playerCount);
		}
    });

    optionsModal.addEventListener('click', (e) => {
    	if (e.target === optionsModal) {
        	optionsModal.classList.add('hidden');
			optionsModal.classList.remove('flex');
			if (numPlay.value !== playerCount) {
			playerCount = numPlay.value;
			renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
			setUpEventListeners(root, user1, user2, user3, user4, playerCount);
			if (scTW != boG)
				 alert(boG);
		}
    	}
    });

	const loginModal = document.getElementById('loginModal') as HTMLDivElement;
    const closeLogin = document.getElementById('closeLogin') as HTMLButtonElement;
	const con2 = document.getElementById("con2") as HTMLButtonElement;
	const dis2 = document.getElementById("dis2") as HTMLButtonElement;
	const con3 = document.getElementById("con3") as HTMLButtonElement;
	const dis3 = document.getElementById("dis3") as HTMLButtonElement;
	const con4 = document.getElementById("con4") as HTMLButtonElement;
	const dis4 = document.getElementById("dis4") as HTMLButtonElement;
	let userlog:number = 1;

	if (con2 && dis2) {
		con2.addEventListener('click', () => {
			loginModal.classList.remove('hidden');
			loginModal.classList.add('flex');
			userlog = 2;
		});
		closeLogin.addEventListener('click', () => {
	    	loginModal.classList.remove('flex');
			loginModal.classList.add('hidden');
	    });
		dis2.addEventListener('click', () => {
			user2.connected = false;
			user2.userID = "-1";
			user2.username = "Waiting...";
			user2.token = "";
			renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
			setUpEventListeners(root, user1, user2, user3, user4, playerCount);
		});
		if (user2.connected) {
			con2.classList.add('hidden');
			dis2.classList.remove('hidden');
		}
	}

	if (con3 && dis3) {
		con3.addEventListener('click', () => {
			loginModal.classList.remove('hidden');
			loginModal.classList.add('flex');
			userlog = 3;
		});
		closeLogin.addEventListener('click', () => {
	    	loginModal.classList.remove('flex');
			loginModal.classList.add('hidden');
	    });
		dis3.addEventListener('click', () => {
			user3.connected = false;
			user3.userID = "-1";
			user3.username = "Waiting...";
			user3.token = "";
			renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
			setUpEventListeners(root, user1, user2, user3, user4, playerCount);
		});
		if (user3.connected) {
			con3.classList.add('hidden');
			dis3.classList.remove('hidden');
		}
	}

	if (con4 && dis4) {
		con4.addEventListener('click', () => {
			loginModal.classList.remove('hidden');
			loginModal.classList.add('flex');
			userlog = 4;
		});
		closeLogin.addEventListener('click', () => {
	    	loginModal.classList.remove('flex');
			loginModal.classList.add('hidden');
	    });
		dis4.addEventListener('click', () => {
			user4.connected = false;
			user4.userID = "-1";
			user4.username = "Waiting...";
			user4.token = "";
			renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
			setUpEventListeners(root, user1, user2, user3, user4, playerCount);
		});
		if (user4.connected) {
			con4.classList.add('hidden');
			dis4.classList.remove('hidden');
		}
	}

	document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = (document.getElementById('username') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      if (!username || !password) {
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
        /*if (!data.token && data.mfaRequired) {
          const userId = data.userId;
          window.location.hash = `#/login/${userId}/mfa/verify`;
        }
        else {*/
          let temp:user = {username: "", userID: "", pfp: new Blob, token: data.token, connected: true};
		  const getUser = await fetch('/users/me', {
	  	  method: 'get',
	  	  credentials: 'include',
		  headers: { 'Content-Type': 'application/json',
	      'Authorization': `Bearer ${temp.token}`,
	  	  }});


		  if (!getUser.ok) {
	  		const errorData = await getUser.json();
          	throw new Error(errorData.message || 'Error Fetching User Data');
		  }
		  const json: userData = await getUser.json();
		  const pfp = await fetch(json.avatar.url, {
			method: 'get',
	  		credentials: 'include',
	  		headers: { 'Content-Type': 'application/json',
	  		'Authorization': `Bearer ${temp.token}`,
	  		},
		  });
		  temp.pfp = await pfp.blob();
		  temp.username = json.username;
		  temp.userID = json.id.toString();
		  if (userlog === 2)
			user2 = temp;
		  else if (userlog === 3)
			user3 = temp;
		  else if (userlog === 4)
			user4 = temp;
		  renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
		  setUpEventListeners(root, user1, user2, user3, user4, playerCount);
        //}
      } catch (err: unknown) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv && err instanceof Error) {
          errorDiv.textContent = err.message;
          errorDiv.classList.remove('hidden');
        }
      }
    });

	const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

	startBtn.addEventListener('click', () => {
		//start game
	});
}

export async function renderLobbyPage(params: RouteParams): Promise<void> {
	const root = setupAppLayout()
	const game = (params.gameId ?? "");
	let hasAccess;
	const token = localStorage.getItem("token") ?? "";
    const response = await fetch(`/games/${game}/join`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json',
		'Authorization': `Bearer ${token}`,
	   },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Access check failed:', error);
      hasAccess =  false;
    } else
    	hasAccess = true;
	if (!hasAccess) {
		renderLobbyError(root.contentContainer);
	}
	const pfp = await fetch(localStorage.getItem("userPFP") ?? "", {
		method: 'get',
	  credentials: 'include',
	  headers: { 'Content-Type': 'application/json',
	  'Authorization': `Bearer ${token}`,
	  },
	});
	const rawpfp:Blob = await pfp.blob();
	let user1:user = {username: localStorage.getItem("userName") ?? "Waiting...", userID: localStorage.getItem("userID") ?? "-1", pfp: rawpfp, token: localStorage.getItem("token") ?? "", connected: true};
	let user2:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
	let user3:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
	let user4:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
	let playerCount = "1";

	renderLobbyHTML(root.contentContainer, user1, user2, user3, user4, playerCount);
	setUpEventListeners(root.contentContainer, user1, user2, user3, user4, playerCount)
	//invite button and leave
}
