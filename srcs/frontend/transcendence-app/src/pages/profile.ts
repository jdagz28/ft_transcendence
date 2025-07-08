import { setupAppLayout, whoAmI } from '../setUpLayout';
import { getUserProfile, getMatchHistory } from '../api/profile';
import { DEFAULT } from '../router';

export async function renderProfilePage(username: string): Promise<any> {
    const { contentContainer } = setupAppLayout();
    contentContainer.innerHTML = ""; 
    contentContainer.className = "flex-grow flex flex-col items-center gap-8 px-4 sm:px-8 py-10 text-white";

    const userData = await whoAmI();
    if (!userData.success) {
        window.location.hash = DEFAULT;
        return;
    }
    const currentUser = userData.data.id;


    const profile = await getUserProfile(username);
    if (!profile) {
        window.location.hash = DEFAULT;
        return;
    }

    const matchHistory = await getMatchHistory(username);

    const headerContainer = document.createElement("div");
    headerContainer.className = "w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 px-4 py-2";

    const avatarSection = document.createElement("div");
    avatarSection.className = "flex flex-col sm:flex-row items-center gap-6";

    const avatar = document.createElement("img");
    avatar.src = profile.avatar;
    avatar.alt = `${profile.username} avatar`;
    avatar.className = "w-48 h-48 rounded-full bg-[#0f2a4e] border-4 border-white object-cover";

    const userInfo = document.createElement("div");
    userInfo.className = "text-center sm:text-left flex flex-col gap-2";

    const usernameRow = document.createElement("div");
    usernameRow.className = "flex items-center gap-4 justify-center sm:justify-start";

    const usernameEl = document.createElement("h1");
    usernameEl.className = "text-5xl font-bold text-white m-0";
    usernameEl.textContent = profile.username;
    usernameRow.appendChild(usernameEl);

    if (profile.id !== currentUser) {
        const addFriendButton = document.createElement("button");
        addFriendButton.className = "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200";
        addFriendButton.textContent = "Add Friend";
        addFriendButton.onclick = async() => {
            const token = localStorage.getItem("token");
            await fetch(`/users/${profile.username}/addFriend`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                credentials: "include"
            })
            alert(`Friend request sent to ${profile.username}`);
        };
        usernameRow.appendChild(addFriendButton);
    }

    const nicknameEl = document.createElement("p");
    nicknameEl.className = "text-2xl text-gray-300 mt-2 mb-1";
    nicknameEl.textContent = "No preferred nickname set";

    const emailEl = document.createElement("p");
    emailEl.className = "text-gray-400 mb-1";
    emailEl.textContent = profile.email;

    const joinDateEl = document.createElement("p");
    joinDateEl.className = "text-gray-400 mb-0";
    joinDateEl.textContent = `Joined on ${new Date(profile.created).toLocaleDateString()}`;

    userInfo.appendChild(usernameRow);
    userInfo.appendChild(nicknameEl);
    userInfo.appendChild(emailEl);
    userInfo.appendChild(joinDateEl);


    avatarSection.appendChild(avatar);
    avatarSection.appendChild(userInfo);

    const statsContainer = document.createElement('div');
    statsContainer.className = 'flex items-center justify-center lg:justify-end gap-6 md:gap-10 text-white text-center lg:mt-8';
    const winPercentageColor = profile.successRate >= 50 ? 'text-green-400' : 'text-red-400';
    statsContainer.innerHTML = `
        <div>
            <p class="text-4xl font-bold">${profile.gamesPlayed}</p>
            <p class="text-xl text-gray-300">Games Played</p>
        </div>
        <div>
            <p class="text-4xl font-bold">${profile.record.wins}–${profile.record.losses}</p>
            <p class="text-xl text-gray-300">Record</p>
        </div>
        <div>
            <p class="text-4xl font-bold ${winPercentageColor}">${profile.successRate} %</p>
            <p class="text-xl text-gray-300">Success Rate</p>
        </div>
    `;

    headerContainer.appendChild(avatarSection);
    headerContainer.appendChild(statsContainer);
    contentContainer.appendChild(headerContainer);

    const container = document.createElement("div");
    container.className = "w-full max-w-7xl flex-grow bg-[#0f2a4e] p-6 rounded-lg shadow-lg";

    const title = document.createElement("h2");
    title.className = "text-2xl font-bold text-white mb-4";
    title.textContent = "Match History";
    container.appendChild(title);

    if (matchHistory.length === 0) {
        const noMatchesText = document.createElement('p');
        noMatchesText.className = 'text-gray-400 text-center py-8';
        noMatchesText.textContent = 'No match history found.';
        container.appendChild(noMatchesText);
        return container;
    }

    const matchTable = document.createElement("div");
    matchTable.className = "w-full max-w-7xl flex-grow bg-[#0f2a4e] p-6 rounded-lg shadow-lg";

    const matchTitle = document.createElement("h2");
    matchTitle.className = "text-2xl font-bold text-white mb-4";
    matchTitle.textContent = "Match History";
    matchTable.appendChild(matchTitle);

    if (!matchHistory || matchHistory.length === 0) {
        const noMatchesText = document.createElement('p');
        noMatchesText.className = 'text-gray-400 text-center py-8';
        noMatchesText.textContent = 'No match history found.';
        matchTable.appendChild(noMatchesText);
    } else {
        const tableContainer = document.createElement("div");
        tableContainer.className = "overflow-x-auto";
        matchTable.appendChild(tableContainer);

        const table = document.createElement("table");
        table.className = "w-full text-left text-gray-300 min-w-[700px]";
        tableContainer.appendChild(table);

        table.innerHTML = `
            <thead>
                <tr class="border-b border-gray-600">
                    <th class="p-3 font-semibold">Opponent</th>
                    <th class="p-3 font-semibold">Total Score</th>
                    <th class="p-3 font-semibold">Game Scores</th>
                    <th class="p-3 font-semibold">Duration</th>
                    <th class="p-3 font-semibold text-right">Result</th>
                </tr>
            </thead>
            <tbody>
                ${matchHistory.map(match => `
                    <tr class="border-b border-gray-700 last:border-b-0 hover:bg-[#1a3a5e]">
                        <td class="p-3">${match.opponent}</td>
                        <td class="p-3">${match.finalScore}</td>
                        <td class="p-3">${match.matchScores.map(s => s.scoreString).join('  ,  ')}</td>
                        <td class="p-3">${match.duration}</td>
                        <td class="p-3 text-right font-bold ${match.result === 'W' ? 'text-green-400' : 'text-red-400'}">
                            ${match.result}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

  contentContainer.appendChild(matchTable);
}