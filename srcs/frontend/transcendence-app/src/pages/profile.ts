import { setupAppLayout, whoAmI } from '../setUpLayout';
import { getUserProfile, getMatchHistory, getFriendsList, getUserFriendsList } from '../api/profile';
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
    const currentUserFriends = await getFriendsList();

    const profile = await getUserProfile(username);
    if (!profile) {
        window.location.hash = DEFAULT;
        return;
    }

    let friends = [];
    if (profile.username === userData.data.username) {
        friends = await getFriendsList();
    } else {
        friends = await getUserFriendsList(profile.username);
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

    if (profile.id !== currentUser && !currentUserFriends.some(friend => friend.id === profile.id)) {
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
    } else if (profile.id === currentUser) {
        const friendRequestsButton = document.createElement("button");
        friendRequestsButton.className = "bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200";
        friendRequestsButton.textContent = "Friend Requests";
        friendRequestsButton.onclick = () => {
            window.location.hash = `#/users/me/friend-requests`;
        };
        usernameRow.appendChild(friendRequestsButton);
    }

    const nicknameEl = document.createElement("p");
    nicknameEl.className = "text-2xl text-gray-300 mt-2 mb-1";
    nicknameEl.textContent =  profile.nickname || "";

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

    const mainContent = document.createElement('div');
    mainContent.className = 'w-full max-w-7xl flex flex-col lg:flex-row gap-8';

    const matchHistoryContainer = document.createElement("div");
    matchHistoryContainer.className = "flex-grow bg-[#0f2a4e] p-6 rounded-lg shadow-lg";

    const title = document.createElement("h2");
    title.className = "text-2xl font-bold text-white mb-4";
    title.textContent = "Match History";
    matchHistoryContainer.appendChild(title);

    if (matchHistory.length === 0) {
        const noMatchesText = document.createElement('p');
        noMatchesText.className = 'text-gray-400 text-center py-8';
        noMatchesText.textContent = 'No match history found.';
        matchHistoryContainer.appendChild(noMatchesText);
    } else {
        const tableContainer = document.createElement("div");
        tableContainer.className = "overflow-x-auto";
        matchHistoryContainer.appendChild(tableContainer);

        const table = document.createElement("table");
        table.className = "w-full text-left text-gray-300 min-w-[700px]";
        tableContainer.appendChild(table);

		const thead = document.createElement("thead");
		const tr = document.createElement("tr");
		tr.className = "border-b border-gray-600";
		const dateTh = document.createElement("th");
		dateTh.className = "p-3 font-semibold";
		dateTh.textContent = "Date";
		tr.appendChild(dateTh);
		const opponentTh = document.createElement("th");
		opponentTh.className = "p-3 font-semibold";
		opponentTh.textContent = "Opponent";
		tr.appendChild(opponentTh);
		const totalScoreTh = document.createElement("th");
		totalScoreTh.className = "p-3 font-semibold";
		totalScoreTh.textContent = "Total Score";
		tr.appendChild(totalScoreTh);
		const gameScoresTh = document.createElement("th");
		gameScoresTh.className = "p-3 font-semibold";
		gameScoresTh.textContent = "Game Scores";
		tr.appendChild(gameScoresTh);
		const durationTh = document.createElement("th");
		durationTh.className = "p-3 font-semibold";
		durationTh.textContent = "Duration";
		tr.appendChild(durationTh);
		const resultTh = document.createElement("th");
		resultTh.className = "p-3 font-semibold text-right";
		resultTh.textContent = "Result";
		tr.appendChild(resultTh);
		thead.appendChild(tr);
		table.appendChild(thead);

		matchHistory.forEach(match => {
			const date = new Date(match.ended)
			date.setHours(date.getHours() + 2);
			const timeStamp = date.toLocaleTimeString([], {year: 'numeric', month: 'long' , day: 'numeric' , hour: '2-digit', minute: '2-digit' });
			const tbody = document.createElement("tbody");
			const tbodyTr = document.createElement("tr");
			tbodyTr.className = "border-b border-gray-700 last:border-b-0 hover:bg-[#1a3a5e]";
			const dateTd = document.createElement("td");
			dateTd.className = "p-3";
			dateTd.textContent = timeStamp;
			tbodyTr.appendChild(dateTd);
			const opponentTd = document.createElement("td");
			opponentTd.className = "p-3";
			opponentTd.textContent = match.opponent;
			tbodyTr.appendChild(opponentTd);
			const totalScoreTd = document.createElement("td");
			totalScoreTd.className = "p-3";
			totalScoreTd.textContent = match.finalScore;
			tbodyTr.appendChild(totalScoreTd);
			const gameScoresTd = document.createElement("td");
			gameScoresTd.className = "p-3";
			gameScoresTd.textContent = match.matchScores.map(s => s.scoreString).join(' , ');
			tbodyTr.appendChild(gameScoresTd);
			const durationTd = document.createElement("td");
			durationTd.className = "p-3";
			durationTd.textContent = match.duration;
			tbodyTr.appendChild(durationTd);
			const resultTd = document.createElement("td");
			resultTd.className = `p-3 text-right font-bold ${match.result === 'W' ? 'text-green-400' : 'text-red-400'}`;
			resultTd.textContent = match.result;
			tbodyTr.appendChild(resultTd);
			tbody.appendChild(tbodyTr);
			table.appendChild(tbody);
		});
	}
    //     table.innerHTML = `
    //         <thead>
    //             <tr class="border-b border-gray-600">
	// 				<th class="p-3 font-semibold">Date</th>
    //                 <th class="p-3 font-semibold">Opponent</th>
    //                 <th class="p-3 font-semibold">Total Score</th>
    //                 <th class="p-3 font-semibold">Game Scores</th>
    //                 <th class="p-3 font-semibold">Duration</th>
    //                 <th class="p-3 font-semibold text-right">Result</th>
    //             </tr>
    //         </thead>
    //         <tbody>
    //             ${matchHistory.map(match => `
    //                 <tr class="border-b border-gray-700 last:border-b-0 hover:bg-[#1a3a5e]">
    //                     <td class="p-3">${match.opponent}</td>
    //                     <td class="p-3">${match.finalScore}</td>
    //                     <td class="p-3">${match.matchScores.map(s => s.scoreString).join(' , ')}</td>
    //                     <td class="p-3">${match.duration}</td>
    //                     <td class="p-3 text-right font-bold ${match.result === 'W' ? 'text-green-400' : 'text-red-400'}">
    //                         ${match.result}
    //                     </td>
    //                 </tr>
    //             `).join('')}
    //         </tbody>
    //     `;
    // }

    const friendsContainer = document.createElement("div");
    friendsContainer.className = "lg:w-72 w-full flex-shrink-0 bg-[#0f2a4e] p-6 rounded-lg shadow-lg";

    const friendsTitle = document.createElement("h2");
    friendsTitle.className = "text-2xl font-bold text-white mb-4";
    friendsTitle.textContent = "Friends";
    friendsContainer.appendChild(friendsTitle);

    let onlineStatusSet = new Set();
    try {
        const token = localStorage.getItem("token");
        const response = await fetch('/users/online', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            onlineStatusSet = new Set(data.onlineUsers);
            console.log("Online users:", onlineStatusSet);
        }
    } catch (error) {
        console.error("Failed to fetch online users:", error);
    }

    if (friends.length === 0) {
        const noFriendsText = document.createElement('p');
        noFriendsText.className = 'text-gray-400 text-center py-8';
        noFriendsText.textContent = 'No friends found.';
        friendsContainer.appendChild(noFriendsText);
    } else {
        const friendsList = document.createElement("ul");
        friendsList.className = "space-y-2";
        friends.forEach(friend => {
            const friendItem = document.createElement("li");
            friendItem.className = "flex justify-between items-center text-gray-300";
            
            const friendInfo = document.createElement('div');
            friendInfo.className = 'flex items-center';

            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'w-5 h-5 rounded-full mr-3 flex-shrink-0';

            if (onlineStatusSet.has(String(friend.id))) {
                statusIndicator.classList.add('bg-green-500');
            } else {
                statusIndicator.classList.add('bg-gray-500');
            }
            const friendName = document.createElement('span');
            friendName.textContent = friend.username;
            
            const friendProfileLink = document.createElement('a');
            friendProfileLink.href = `#/users/${friend.username}`;
            friendProfileLink.className = 'hover:underline'; 
            friendProfileLink.textContent = friend.username;

            friendInfo.appendChild(statusIndicator);
            friendInfo.appendChild(friendProfileLink);

            friendItem.appendChild(friendInfo);
            friendsList.appendChild(friendItem);

            if (profile.id === currentUser) {
                const removeFriendButton = document.createElement("button");
                removeFriendButton.className = "ml-4 text-red-500 hover:text-red-700 text-sm";
                removeFriendButton.textContent = "Remove";
                removeFriendButton.onclick = async () => {
                    const token = localStorage.getItem("token");
                    await fetch(`/users/me/friends`, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        credentials: "include",
                        body: JSON.stringify({ friend: friend.username })
                    });
                    alert(`Removed friend: ${friend.username}`);
                    window.location.reload();
                };
                friendItem.appendChild(removeFriendButton);
            }
            friendsList.appendChild(friendItem);
        });
        friendsContainer.appendChild(friendsList);
    }

    mainContent.appendChild(matchHistoryContainer);
    mainContent.appendChild(friendsContainer);
    contentContainer.appendChild(mainContent);
}
