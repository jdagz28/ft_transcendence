import { setupAppLayout, whoAmI } from "../setUpLayout";


function displayGameCreationError(message: string) {
    let errorDiv = document.getElementById('game-creation-error');
    const btnContainer = document.getElementById('game-mode-buttons');

    if (!errorDiv && btnContainer) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'game-creation-error';
        errorDiv.className = "text-red-400 text-center mt-4 w-full max-w-xs p-3 bg-red-900/50 rounded-lg";
        btnContainer.insertAdjacentElement('afterend', errorDiv);
    }

    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideGameCreationError() {
    const errorDiv = document.getElementById('game-creation-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

async function createGame(mode: string, maxPlayers: number, clickedButton: HTMLButtonElement) {
    const originalText = clickedButton.textContent;
    const allButtons = document.querySelectorAll<HTMLButtonElement>('#game-mode-buttons button');

    hideGameCreationError();
    allButtons.forEach(btn => btn.disabled = true);
    clickedButton.textContent = 'Creating...';
    clickedButton.classList.add('opacity-75', 'cursor-not-allowed');

    try {
        const token = localStorage.getItem("token");
        const gameMode = "private";
        const gameType = "local";
        if (!token) {
            throw new Error("You are not logged in.");
        }

        const response = await fetch('/games/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ mode, maxPlayers, gameMode, gameType })
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create the game.');
        }

        const gameId = responseData;
        if (gameId) {
            window.location.hash = `#/games/${gameId}`;
        } else {
            throw new Error("Game created, but the server did not return a game ID.");
        }
        allButtons.forEach(btn => btn.disabled = false);
        clickedButton.textContent = originalText;
        clickedButton.classList.remove('opacity-75', 'cursor-not-allowed');

    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error("Error creating game:", errorMessage);
        displayGameCreationError(errorMessage);
    }
}



export async function renderCreateGameLobby(): Promise<void> {
    try {
        await whoAmI();
    } catch (error) {
        console.error("Authentication check failed, redirecting.", error);
        return;
    }

    const { contentContainer } = setupAppLayout();
    contentContainer.innerHTML = '';
    contentContainer.className = "flex-grow flex flex-col items-center justify-center gap-8 px-8 py-10 text-white";

    const main = document.createElement("div");
    main.className = "flex flex-col items-center gap-8 w-full";
    contentContainer.appendChild(main);

    const header = document.createElement("div");
    header.className = "text-center";
    const title = document.createElement("h1");
    title.textContent = "Create Game";
    title.className = "text-4xl md:text-5xl font-bold text-white tracking-wide";
    header.appendChild(title);
    main.appendChild(header);

    const btnContainer = document.createElement("div");
    btnContainer.id = "game-mode-buttons"; 
    btnContainer.className = "flex flex-col items-center gap-4 w-full max-w-xs";
    main.appendChild(btnContainer);


    const gameModes = [
        { text: "Training", action: (e: Event) => createGame("training", 1, e.currentTarget as HTMLButtonElement) },
        { text: "Single Player", action: (e: Event) => createGame("single-player", 1, e.currentTarget as HTMLButtonElement) },
        { text: "1 vs 1", action: (e: Event) => createGame("multiplayer", 2, e.currentTarget as HTMLButtonElement) },
        { text: "2 vs 2", action: (e: Event) => createGame("multiplayer", 4, e.currentTarget as HTMLButtonElement) }
    ];

 
    const commonButtonStyles = "w-full text-xl font-semibold py-3 px-10 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-opacity-75 disabled:opacity-50";
    const colorStyles = "bg-[#0d2551] hover:bg-orange-400";

    gameModes.forEach(mode => {
        const button = document.createElement("button");
        button.textContent = mode.text;
        button.className = `${commonButtonStyles} ${colorStyles}`;
        button.onclick = mode.action;
        btnContainer.appendChild(button);
    });
}