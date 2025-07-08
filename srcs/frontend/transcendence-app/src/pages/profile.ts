import { setupAppLayout } from '../setUpLayout';
import { getUserProfile } from '../api/profile';
import { DEFAULT } from '../router';

export async function renderProfilePage(username: string): Promise<any> {
  const { contentContainer } = setupAppLayout();
  contentContainer.innerHTML = ""; 
  contentContainer.className = "flex-grow flex flex-col items-center gap-8 px-4 sm:px-8 py-10 text-white";

  const user = await getUserProfile(username);
  if (!user.success) {
    window.location.hash = DEFAULT;
    return
  }

  const profile = user.data;

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
}