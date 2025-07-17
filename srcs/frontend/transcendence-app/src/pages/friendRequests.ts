import { setupAppLayout } from '../setUpLayout';
import { getFriendRequests, handleFriendRequest } from '../api/friendRequests';


export async function renderFriendRequestsPage() {
    const { contentContainer } = setupAppLayout();
    contentContainer.innerHTML = "";
    contentContainer.className = "flex-grow flex flex-col items-center p-4 sm:p-8";

    const requests = await getFriendRequests();

    const requestsContainer = document.createElement("div");
    requestsContainer.className = "bg-[#0f2a4e] p-6 md:p-8 rounded-lg shadow-lg w-full max-w-5xl mx-auto mt-8";

    const title = document.createElement("h2");
    title.className = "text-3xl font-bold text-white mb-6 text-center";
    title.textContent = "Friend Requests";
    requestsContainer.appendChild(title);

    const tableContainer = document.createElement("div");
    tableContainer.className = "overflow-x-auto w-full";
    requestsContainer.appendChild(tableContainer);

    const table = document.createElement("table");
    table.className = "w-full text-left text-gray-300";
    tableContainer.appendChild(table);

    table.innerHTML = `
        <thead>
            <tr class="border-b border-gray-600">
                <th class="p-3 font-semibold">User</th>
                <th class="p-3 font-semibold text-right">Actions</th>
            </tr>
        </thead>
        <tbody>
          ${requests.length === 0
            ? `
              <tr>
                <td colspan="2" class="p-8 text-center text-gray-400">
                  You have no pending friend requests.
                </td>
              </tr>
            `
            : requests.map((request: any) => `
                <tr class="border-b border-gray-700 last:border-b-0">
                    <td class="p-3">
                        <div class="flex items-center">
                            <img src="${request.avatar}" alt="${request.requesterUsername}'s avatar" class="w-10 h-10 rounded-full mr-4">
                            <span class="font-semibold text-white">${request.requesterUsername}</span>
                        </div>
                    </td>
                    <td class="p-3 text-right">
                        <button data-action="accept" data-username="${request.requesterUsername}" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 transition-colors">Accept</button>
                        <button data-action="decline" data-username="${request.requesterUsername}" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">Decline</button>
                    </td>
                </tr>
            `).join('')
          }
        </tbody>
    `;
    
    table.querySelectorAll('button[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const action = target.dataset.action as 'accept' | 'decline';
            const username = target.dataset.username as string;
            if (action && username) {
                handleFriendRequest(username, action);
            }
        });
    });

    contentContainer.appendChild(requestsContainer);
}