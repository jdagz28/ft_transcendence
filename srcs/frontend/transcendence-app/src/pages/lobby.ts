import { type RouteParams, DEFAULT, ROUTE_MAIN, deletePastLobby } from "../router";
import { setupAppLayout, type userData, whoAmI } from "../setUpLayout";
import { getGameOptions, getGamePlayers, isGameCreator, updateGameOptions } from "../api/game";

type user = {
  username: string;
  userID: string;
  pfp: Blob;
  token: string;
  connected: boolean;
};

// type gameState = {
//  id: number;
//  game_id: number;
//  player_id: number;
//  is_remote: boolean;
//  joined_at: string;
//  paddle_loc: string;
//  paddle_side: string;
// }

// function renderLobbyError(root: HTMLDivElement) {
//   root.innerHTML = "";
//   root.className =
//     "flex flex-col items-center justify-center flex-grow text-white";

//   root.innerHTML = `
//     <h1 class="text-6xl md:text-8xl font-extrabold tracking-wider">
//       ERROR&nbsp;403
//     </h1>
//     <p class="mt-4 text-2xl md:text-3xl opacity-80">
//       Invalid&nbsp;Pemission
//     </p>
//   `;
// }

function clearGameLocalStorage() {
  const userKeys = ["user", "username", "id", "pfp"];
  for (let i = 1; i <= 4; i++) {
    userKeys.forEach(key => {
      localStorage.removeItem(`${key}${i}`);
    });
  }
  localStorage.removeItem("gamemode");
}

function renderLobbyHTML(root: HTMLDivElement, user1: user, user2: user, user3: user, user4: user, playerCount: string) {
  let playersHTML: string;
  if (playerCount === "1" || playerCount === "Training") {
    playersHTML = `
<div class="relative z-10 flex min-h-[calc(100vh-64px)] items-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-32 selection:bg-blue-400 selection:text-white">

    <div class="relative flex flex-col items-start -mt-40">
        <div id="avatar1" class="h-35 w-35 rounded-full bg-white"></div>
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
    <div class="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-between bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-32 selection:bg-blue-400 selection:text-white">
  
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
    <div class="relative z-10 grid grid-cols-2 gap-x-32 gap-y-20 min-h-[calc(100vh-64px)] items-center justify-items-center bg-gradient-to-b from-[#0a1d3b] to-[#0f2a4e] px-12 py-40 selection:bg-blue-400 selection:text-white">

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
          <button id="con2" class="absolute left-1/2 top-full mt-6 -translate-x-1/2 bg-white  hover:bg-gray-100  text-gray-800 text-sm font-semibold px-6.25 py-1 rounded shadow transition duration-200">
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
    // renderLobbyError(root);
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
      <button
        id="cancelBtn"
        class="bg-red-500 hover:bg-red-600 text-white font-semibold text-lg text-[40px] px-12 py-1 rounded-lg shadow transition duration-200"
      >
        CANCEL
      </button>
    </div>

  <div id="optionsModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-transparent">
    <div class="relative w-96 max-w-full rounded-lg border-4 border-[rgba(20,50,90,1)] bg-white p-8">
      <button id="closeOptions" class="absolute top-3 right-3 text-xl font-bold text-gray-600 hover:text-gray-900" aria-label="Close Options Modal">&times;</button>
      <h2 class="mb-4 text-2xl text-black font-bold">Game Options</h2>
      
      <!-- <label class="mb-4 block text-gray-700"> -->
      <!--  <span class="text-gray-700">Number of Players</span> -->
      <!--  <select id="numPlay" class="mt-1 block w-full rounded border-gray-300"> -->
      <!--    <option>1</option> -->
      <!--    <option>2</option> -->
      <!--    <option>4</option> -->
      <!--    <option>Training</option> -->
      <!--  </select> -->
      <!-- </label> -->

      <label class="mb-4 block text-gray-700">
        <span class="text-gray-700">Score to Win </span>
        <input id="scTW" type="text" inputmode="numeric" pattern="[0-9]*" value="10" maxlength="2" class="mt-1 block w-full rounded border-gray-300" autocomplete="off" />
      </label>
      <label class="mb-4 block text-gray-700">
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
        <input type="text" id="username" placeholder="Username" class="w-full text-white rounded-md border border-transparent bg-[#081a37] px-4 py-2 placeholder-gray-400 focus:ring-2 focus:ring-sky-400 focus:outline-none" />
        <input type="password" id="password" placeholder="Password" class="w-full text-white rounded-md border border-transparent bg-[#081a37] px-4 py-2 placeholder-gray-400 focus:ring-2 focus:ring-sky-400 focus:outline-none" />
        <button type="submit" class="w-full rounded-md bg-gradient-to-r from-orange-500 to-orange-400 py-3 text-xl font-semibold text-white transition hover:opacity-90">Login</button>
      </form>
  <div id="loginError" class="text-red-400 text-sm mt-3 hidden text-center"></div>
    </div>
  </div>
  <div id="mfaModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-transparent">
    <div class="relative w-96 max-w-full rounded-lg border-4 border-white bg-[rgba(20,50,90,1)] p-8">
      <button id="closeMFA" class="absolute top-3 right-3 text-xl font-bold text-gray-600 hover:text-gray-900" aria-label="Close Options Modal">&times;</button>
      <div class="bg-[rgba(20,50,90,1)] p-8 rounded-xl shadow-xl w-full max-w-md text-white backdrop-blur-sm bg-opacity-90">
        <div class="flex flex-col items-center mb-6">
          <img src="/icons8-rocket.svg" class="w-24 h-24 mb-4" />
          <h2 class="text-3xl font-bold">Enter 2FA Code</h2>
          <p class="mt-2 text-sm text-gray-300">Enter your 6-digit code</p>
        </div>

        <div id="code-inputs" class="flex justify-center space-x-2 mb-8">
          ${Array(6).fill(0).map(() => `
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="1"
              class="w-12 h-12 text-center text-xl bg-[#0c1f4a] rounded-md border border-[#1e376f] focus:outline-none focus:ring-2 focus:ring-[#2DB9FF]"
            />
          `).join("")}
        </div>

        <button id="verify-btn" type="button"
          class="w-full text-xl bg-gradient-to-r from-orange-500 to-orange-400 font-semibold py-3 rounded-md hover:opacity-90 transition">
          Verify
        </button>
      </div>
    </div>
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

function setUpEventListeners(root: HTMLDivElement, user1: user, user2: user, user3: user, user4: user, playerCount: string, game: string) {
  const optionsBtn = document.getElementById('optionsBtn') as HTMLButtonElement;
  const optionsModal = document.getElementById('optionsModal') as HTMLDivElement;
  const closeOptions = document.getElementById('closeOptions') as HTMLButtonElement;
  
  // const numPlay = document.getElementById('numPlay') as HTMLSelectElement;

  const scTW = document.getElementById('scTW') as HTMLInputElement;
  const boG = document.getElementById("boG") as HTMLInputElement;

    optionsBtn.addEventListener('click', () => {
      optionsModal.classList.remove('hidden');
      optionsModal.classList.add('flex');
    });

    closeOptions.addEventListener('click', async () => {
      optionsModal.classList.add('hidden');
      optionsModal.classList.remove('flex');

      await updateGameOptions(Number(game), Number(boG.value), Number(scTW.value));
      /*
      if (numPlay.value !== playerCount) {
        playerCount = numPlay.value;
        localStorage.setItem("gamemode", playerCount);
        if (playerCount !== "4") {
          user3.connected = false;
          user3.userID = "-1";
          user3.token = "";
          user3.username = "Waiting...";
          user4.connected = false;
          user4.userID = "-1";
          user4.token = "";
          user4.username = "Waiting...";
        }
        if (playerCount === "1" || playerCount === "Training") {
          user2.connected = false;
          user2.userID = "-1";
          user2.token = "";
          user2.username = "Waiting...";
        }
        renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
        setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
      }
      */
    });

    optionsModal.addEventListener('click', async (e) => {
      if (e.target === optionsModal) {
          optionsModal.classList.add('hidden');
          optionsModal.classList.remove('flex');

          await updateGameOptions(Number(game), Number(boG.value), Number(scTW.value));
          /*
          if (numPlay.value !== playerCount) {
            playerCount = numPlay.value;
            localStorage.setItem("gamemode", playerCount);
            if (playerCount !== "4") {
              user3.connected = false;
              user3.userID = "-1";
              user3.token = "";
              user3.username = "Waiting...";
              localStorage.removeItem("user3");
              user4.connected = false;
              user4.userID = "-1";
              user4.token = "";
              user4.username = "Waiting...";
              localStorage.removeItem("user4");
            }
            if (playerCount === "1" || playerCount === "Training") {
              user2.connected = false;
              user2.userID = "-1";
              user2.token = "";
              user2.username = "Waiting...";
              localStorage.removeItem("user2");
            }
            renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
            setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
          }
          */
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

  closeLogin.addEventListener('click', () => {
      loginModal.classList.remove('flex');
    loginModal.classList.add('hidden');
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = "";
          errorDiv.classList.add('hidden');
    }
  });

  if (con2 && dis2) {
    con2.addEventListener('click', () => {
      loginModal.classList.remove('hidden');
      loginModal.classList.add('flex');
      userlog = 2;
    });
    dis2.addEventListener('click', async () => {
			const response = await fetch(`/games/${game}/leave`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${user2.token}`
				},
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error('Error leaving game');
			}
      user2.connected = false;
      user2.userID = "-1";
      user2.username = "Waiting...";
      user2.token = "";
      localStorage.removeItem("user2");
      renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
      setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
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
    dis3.addEventListener('click', async () => {
			const response = await fetch(`/games/${game}/leave`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${user3.token}`
				},
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error('Error leaving game');
			}
      user3.connected = false;
      user3.userID = "-1";
      user3.username = "Waiting...";
      user3.token = "";
      localStorage.removeItem("user3");
      renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
      setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
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
    dis4.addEventListener('click', async () => {
			const response = await fetch(`/games/${game}/leave`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${user4.token}`
				},
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error('Error leaving game');
			}
      user4.connected = false;
      user4.userID = "-1";
      user4.username = "Waiting...";
      user4.token = "";
      localStorage.removeItem("user4");
      renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
      setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
    });
    if (user4.connected) {
      con4.classList.add('hidden');
      dis4.classList.remove('hidden');
    }
  }
  let userId = "1";

  const mfaModal = document.getElementById('mfaModal') as HTMLDivElement;
    const closeMFA = document.getElementById('closeMFA') as HTMLButtonElement;

  closeMFA.addEventListener('click', () => {
      mfaModal.classList.remove('flex');
    mfaModal.classList.add('hidden');
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = "";
          errorDiv.classList.add('hidden');
    }
  });

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("#code-inputs input"));
  inputs.forEach((input, i) => {
  input.addEventListener("input", () => {
      if (input.value.match(/[0-9]/) && i < inputs.length - 1) {
        inputs[i + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) {
        inputs[i - 1].focus();
      }
    });
  });
      
  document.getElementById("verify-btn")!.addEventListener("click", async () => {
    const token = inputs.map((i) => i.value).join("");
    if (token.length < 6) {
      alert("Please enter all 6 digits.");
      return;
    }
  
    try {
      const response = await fetch(`/auth/${userId}/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
  
      if (!response.ok) {
        alert("Invalid code. Please try again.");
        return;
      }
      const mfa = await response.json();
      let temp:user = {username: "", userID: "", pfp: new Blob, token: mfa.token, connected: true};
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

    //   const players = await fetch(`/games/${game}/players`, {
    //  method: 'GET',
      //  credentials: 'include',
      //  headers: { 'Content-Type': 'application/json',
    //  'Authorization': `Bearer ${mfa.token}`,
    //  },
      // });
    // if (!players.ok) {
    //  const errorData = await players.json();
        //   throw new Error(errorData.message || 'Invalid Permissions');
    // }
    const perm = await fetch(`/games/${game}/join`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 
      'Authorization': `Bearer ${mfa.token}`
        },
      });

    if (!perm.ok) {
          const error = await perm.json();
      throw new Error(error.message || 'Invalid Permissions');
    }

      const json: userData = await getUser.json();
      const pfp = await fetch(json.avatar, {
      method: 'get',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${temp.token}`,
        },
      });
      temp.pfp = await pfp.blob();
      temp.username = json.username;
      temp.userID = json.id.toString();
      if (userlog === 2) {
      user2 = temp;
      localStorage.setItem("user2", user2.token);
      localStorage.setItem("username2", user2.username);
      localStorage.setItem("id2", user2.userID);
      localStorage.setItem("pfp2", json.avatar);
      }
      else if (userlog === 3) {
      user3 = temp;
      localStorage.setItem("user3", user3.token);
      localStorage.setItem("username3", user3.username);
      localStorage.setItem("id3", user3.userID);
      localStorage.setItem("pfp3", json.avatar);
      }
      else if (userlog === 4) {
      user4 = temp;
      localStorage.setItem("user4", user4.token);
      localStorage.setItem("username4", user4.username);
      localStorage.setItem("id4", user4.userID);
      localStorage.setItem("pfp4", json.avatar);
      }
      const errorDiv = document.getElementById('loginError');
      if (errorDiv) {
        errorDiv.textContent = "";
              errorDiv.classList.add('hidden');
      }
      renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
      setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
    } catch (err) {
      console.error("Error verifying MFA code:", err);
      alert("An error occurred while verifying the code. Please try again.");
    }
  });

  document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = (document.getElementById('username') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      if (!username || !password) {
        return;
      }

      const user = await whoAmI();
      if (!user.success) {
        window.location.hash = "#/";
        return;
      }
      const currUsername = user.data.username;
      if (currUsername === username) {
        alert("User already logged in and part of the game!");
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
        if (!data.token && data.mfaRequired) {
          loginModal.classList.remove('flex');
      loginModal.classList.add('hidden');
      mfaModal.classList.remove('hidden');
      mfaModal.classList.add('flex');
      userId = data.userId;
      return ;
    }

    // const players = await fetch(`/games/${game}/players`, {
    //  method: 'GET',
      //  credentials: 'include',
      //  headers: { 'Content-Type': 'application/json',
    //  'Authorization': `Bearer ${data.token}`,
    //  },
      // });
    // if (!players.ok) {
    //  const errorData = await players.json();
        //   throw new Error(errorData.message || 'Invalid Permissions');
    // }
    const perm = await fetch(`/games/${game}/join`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 
      'Authorization': `Bearer ${data.token}`
        },
      });

    if (!perm.ok) {
          const error = await perm.json();
      throw new Error(error.message || 'Invalid Permissions');
    }


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
      const pfp = await fetch(json.avatar, {
      method: 'get',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${temp.token}`,
        },
      });
      temp.pfp = await pfp.blob();
      temp.username = json.username;
      temp.userID = json.id.toString();
      if (userlog === 2) {
      user2 = temp;
      localStorage.setItem("user2", user2.token);
      localStorage.setItem("username2", user2.username);
      localStorage.setItem("id2", user2.userID);
      localStorage.setItem("pfp2", json.avatar);
      }
      else if (userlog === 3) {
      user3 = temp;
      localStorage.setItem("user3", user3.token);
      localStorage.setItem("username3", user3.username);
      localStorage.setItem("id3", user3.userID);
      localStorage.setItem("pfp3", json.avatar);
      }
      else if (userlog === 4) {
      user4 = temp;
      localStorage.setItem("user4", user4.token);
      localStorage.setItem("username4", user4.username);
      localStorage.setItem("id4", user4.userID);
      localStorage.setItem("pfp4", json.avatar);
      }
      renderLobbyHTML(root, user1, user2, user3, user4, playerCount);
      setUpEventListeners(root, user1, user2, user3, user4, playerCount, game);
      } catch (err: unknown) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv && err instanceof Error) {
          errorDiv.textContent = err.message;
          errorDiv.classList.remove('hidden');
        }
      }
    });

  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

  startBtn.addEventListener('click', async () => {
    //start game <--------------------------- IMPLEMENT!
	localStorage.removeItem("gameId");
    let body;
		if (playerCount === "1") {
      body = { options: [
        {
          "userId": user1.userID,
          "paddle_loc": "left",
        }
      ]}
		} else if (playerCount === "2") {
      body = { options: [
        {
          "userId": user1.userID,
          "paddle_loc": "left",
        },
        {
          "userId": user2.userID,
          "paddle_loc": "right",
        }
      ]}
    } else if (playerCount === "4") {
        body = { options: [
          {
            "userId": user1.userID,
            "paddle_loc": "left",
            "paddle_side": "top"
          },
          {
            "userId": user2.userID,
            "paddle_loc": "right",
            "paddle_side": "bottom"
          },
          {
            "userId": user3.userID,
            "paddle_loc": "left",
            "paddle_side": "top"
          },
          {
            "userId": user4.userID,
            "paddle_loc": "right",
            "paddle_side": "bottom"
          }
        ]
      }
    }
    const response = await fetch(`/games/${game}/start`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1.token}`
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error('Error starting game');
    }
    clearGameLocalStorage();
    window.location.hash = `#/games/${game}/play`;
  });

  const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
  cancelBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to cancel this game?')) {
      return; 
    }
	localStorage.removeItem("gameId");
    const response = await fetch(`/games/${game}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user1.token}`
      },
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Error cancelling game');
    }
    clearGameLocalStorage();
    window.location.hash = ROUTE_MAIN;
  });
  
}

export async function renderLobbyPage(params: RouteParams): Promise<void> {
  const root = setupAppLayout()
  const gameId = params.gameId;
  if (!gameId) {
    window.location.hash = "#/404";
    return;
  }
  const tempId = localStorage.getItem("gameId");
  if (tempId && tempId !== params.gameId)
	await deletePastLobby();
  localStorage.setItem("gameId", gameId);
  const token = localStorage.getItem("token") ?? "";
	const user = await whoAmI();
  if (!user.success) {
    window.location.hash = "#/";
    return;
  }
  const userId = user.data.id;
  console.log("User ID:", userId);
  const isCreator = await isGameCreator(Number(gameId), userId);
	console.log("Is Creator:", isCreator);
  if (!isCreator) {
		window.location.hash = "#/403";
		return;
	}

  const players = await getGamePlayers(Number(gameId));
  if (!players) {
    window.location.hash = DEFAULT;
    return;
  }

  const gameSettings = await getGameOptions(Number(gameId));
  if (!gameSettings) {
    window.location.hash = DEFAULT;
    return; 
  }
  if (gameSettings.status !== "pending") {
    window.location.hash = '#/403';
    return;
  }

	if (gameSettings.mode === "training") {
		const body = { options : [
				{
				"userId": userId,
				"paddle_loc": "left",
				}
			]
		};
		const response = await fetch(`/games/${gameId}/start`, {
			method: 'PATCH',
			headers: { 
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			credentials: 'include',
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			throw new Error('Error starting game');
		}
		window.location.hash = `#/games/${gameId}/play`;
	}

  const playerCount = String(gameSettings.max_players); 

    // const response = await fetch(`/games/${game}/join`, {
    //   method: 'PATCH',
    //   credentials: 'include',
    //   headers: { 
  //  'Authorization': `Bearer ${token}`
  //    },
    // });

    // if (!response.ok) {
    //   const error = await response.json();
    //   console.error('Access check failed:', error);
    //   hasAccess =  false;
    // } else
    //  hasAccess = true;
  // if (!hasAccess) {
  //  renderLobbyError(root.contentContainer);
  //  return ;
  // }
  const pfp = await fetch(localStorage.getItem("userPFP") ?? "", {
    method: 'get',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    },
  });
  const rawpfp:Blob = await pfp.blob();
  let user1:user = {username: localStorage.getItem("userName") ?? "Waiting...", userID: localStorage.getItem("userID") ?? "-1", pfp: rawpfp, token: localStorage.getItem("token") ?? "", connected: true};
  const user2tok = localStorage.getItem("user2");
  let user2:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
  if (user2tok){
    user2.username = localStorage.getItem("username2") ?? "Error Loading";
    user2.userID = localStorage.getItem("id2") ?? "-1";
    user2.token = user2tok;
    user2.connected = true;
    const pfp = await fetch(localStorage.getItem("pfp2") ?? "", {
      method: 'get',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    });
    user2.pfp = await pfp.blob();
  }
  const user3tok = localStorage.getItem("user3");
  let user3:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
  if (user3tok){
    user3.username = localStorage.getItem("username3") ?? "Error Loading";
    user3.userID = localStorage.getItem("id3") ?? "-1";
    user3.token = user3tok;
    user3.connected = true;
    const pfp = await fetch(localStorage.getItem("pfp3") ?? "", {
      method: 'get',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    });
    user3.pfp = await pfp.blob();
  }
  const user4tok = localStorage.getItem("user4");
  let user4:user = {username: "Waiting...", userID: '-1', pfp: new Blob, token: "", connected: false};
  if (user4tok){
    user4.username = localStorage.getItem("username4") ?? "Error Loading";
    user4.userID = localStorage.getItem("id4") ?? "-1";
    user4.token = user4tok;
    user4.connected = true;
    const pfp = await fetch(localStorage.getItem("pfp4") ?? "", {
      method: 'get',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    });
    user4.pfp = await pfp.blob();
  }
  
  renderLobbyHTML(root.contentContainer, user1, user2, user3, user4, playerCount);
  setUpEventListeners(root.contentContainer, user1, user2, user3, user4, playerCount, gameId)
}
