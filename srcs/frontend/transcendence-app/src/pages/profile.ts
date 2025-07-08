import { setupAppLayout } from '../setUpLayout';
import { getUserProfile, getMatchHistory } from '../api/profile';
import { DEFAULT } from '../router';

export async function renderProfilePage(username: string): Promise<any> {
  const { contentContainer } = setupAppLayout();
  contentContainer.innerHTML = ""; 
  contentContainer.className = "flex-grow flex flex-col items-center gap-8 px-4 sm:px-8 py-10 text-white";

  const profile = await getUserProfile(username);
  if (!profile) {
    window.location.hash = DEFAULT;
    return
  }

  const matchHistory = await getMatchHistory(username);

  const headerContainer = document.createElement("div");
  headerContainer.className = "w-full max-w-7xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-6 px-4 py-2";

  const avatar = document.createElement("img");
  avatar.src = profile.avatar;
  avatar.alt = `${profile.username} avatar`;
  avatar.className = "w-48 h-48 rounded-full bg-[#0f2a4e] border-4 border-white object-cover";

  const userInfo = document.createElement("div");
  userInfo.className = "text-center sm:text-left";

  const usernameEl = document.createElement("h1");
  usernameEl.className = "text-5xl font-bold text-white";
  usernameEl.textContent = profile.username;

  const nicknameEl = document.createElement("p");
  nicknameEl.className = "text-2xl text-gray-300 mt-2";
  nicknameEl.textContent = "No preferred nickname set";  //profile.nickname

  const emailEl = document.createElement("p");
  emailEl.className = "text-gray-400 mt-1";
  emailEl.textContent = profile.email

  const joinDateEl = document.createElement("p");
  joinDateEl.className = "text-gray-400 mt-1";
  joinDateEl.textContent = `Joined on ${new Date(profile.created).toLocaleDateString()}`;

  userInfo.appendChild(usernameEl);
  userInfo.appendChild(nicknameEl);
  userInfo.appendChild(emailEl);
  userInfo.appendChild(joinDateEl);

  headerContainer.appendChild(avatar);
  headerContainer.appendChild(userInfo);
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