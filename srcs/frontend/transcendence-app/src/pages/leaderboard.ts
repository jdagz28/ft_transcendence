import { setupAppLayout } from "../setUpLayout";
import { getLeaderboard } from "../api/leaderboard";  

export async function renderLeaderboardPage() {
  const { contentContainer } = setupAppLayout();
  contentContainer.innerHTML = ""

  const leaderboard = await getLeaderboard();
  
  const leaderboardContainer = document.createElement("div");
  leaderboardContainer.className = "bg-[#0f2a4e] p-6 md:p-8 rounded-lg shadow-lg w-full max-w-5xl mx-auto mt-8";

  const title = document.createElement("h2");
  title.className = "text-3xl font-bold text-white mb-6 text-center";
  title.textContent = "Leaderboard";
  const subtitle = document.createElement("p");
  subtitle.textContent = "Based on number of wins and win percentage";
  subtitle.className = "text-lg text-gray-400 mb-4 text-center";
  leaderboardContainer.appendChild(title);
  leaderboardContainer.appendChild(subtitle);

  const tableContainer = document.createElement("div");
  tableContainer.className = "overflow-x-auto w-full";
  leaderboardContainer.appendChild(tableContainer);

  const table = document.createElement("table");
  table.className = "w-full text-left text-gray-300 min-w-[700px]";
  tableContainer.appendChild(table);

  table.innerHTML = `
      <thead>
          <tr class="border-b border-gray-600">
              <th class="p-3 font-semibold">Rank</th>
              <th class="p-3 font-semibold">Username</th>
              <th class="p-3 font-semibold">Total Games</th>
              <th class="p-3 font-semibold">Wins</th>
              <th class="p-3 font-semibold">Loses</th>
              <th class="p-3 font-semibold text-right">Win Percentage</th>
          </tr>
      </thead>
      <tbody>
          ${leaderboard.map((player, index) => `
              <tr class="border-b border-gray-700 last:border-b-0 hover:bg-[#1a3a5e]">
                  <td class="p-3 font-bold text-white">${index + 1}</td>
                  <td class="p-3">${player.username}</td>
                  <td class="p-3">${player.totalGames}</td>
                  <td class="p-3">${player.wins}</td>
                  <td class="p-3">${player.losses}</td>
                  <td class="p-3 text-right font-bold ${player.winPercentage >= 50 ? 'text-green-400' : 'text-red-400'}">
                      ${player.winPercentage.toFixed(1)}%
                  </td>
              </tr>
          `).join('')}
      </tbody>
  `;
  contentContainer.appendChild(leaderboardContainer); 
}
