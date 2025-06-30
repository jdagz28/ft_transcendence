import { setupAppLayout, whoAmI } from "../setUpLayout";

export async function renderAccountSettingsPage(username: string): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className = "flex-grow flex flex-col text-white";

  const pageHeader = document.createElement("div");
  pageHeader.className = "text-center py-6";
  const pageTitle = document.createElement("h1");
  pageTitle.textContent = "Account Settings";
  pageTitle.className = "text-3xl md:text-4xl font-bold mb-2";
  pageHeader.appendChild(pageTitle);
  contentContainer.appendChild(pageHeader);

  const userData = await whoAmI();
  if (!userData.success) {
    console.error("Failed to fetch user data:", userData.error);
    contentContainer.textContent = "Error loading user data.";
    return;
  }
  const { id: userId, email: userEmail, avatar, created } = userData.data;

  const userInfoSection = document.createElement("div");
  userInfoSection.className = "flex flex-col items-center space-y-4";

  const avatarImg = document.createElement("img");
  avatarImg.src = avatar.url;
  avatarImg.alt = "User Avatar";
  avatarImg.className = "w-52 h-52 rounded-full border-4 border-gray-700 shadow";
  userInfoSection.appendChild(avatarImg);

  const userDetails = document.createElement("div");
  userDetails.className = "text-center text-lg text-gray-200 space-y-1";
  userDetails.innerHTML = `
    <div><strong>Username:</strong> ${username}</div>
    <div><strong>Email:</strong> ${userEmail}</div>
    <div><strong>User ID:</strong> ${userId}</div>
    <div><strong>Account Created:</strong> ${new Date(created).toLocaleDateString()}</div>
  `;
  userInfoSection.appendChild(userDetails);
  contentContainer.appendChild(userInfoSection);

  const changeHeader = document.createElement("h2");
  changeHeader.textContent = "Change Information";
  changeHeader.className = "text-2xl font-semibold text-white text-center justify-center ml-8 mt-8";
  contentContainer.appendChild(changeHeader);

  const formsContainer = document.createElement("div");
  formsContainer.className = "flex-grow flex flex-col items-center px-8 mt-4 space-y-6";
;

  formsContainer.appendChild(createIndividualForm({
    label: "Username",
    value: username,
    inputType: "text",
    inputName: "username"
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Email",
    value: userEmail,
    inputType: "email",
    inputName: "email"
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Password",
    value: "",
    inputType: "password",
    inputName: "password"
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Avatar",
    value: "",
    inputType: "file",
    inputName: "avatar"
  }));

  contentContainer.appendChild(formsContainer);
}

function createIndividualForm({
  label,
  value,
  inputType,
  inputName
}: {
  label: string;
  value: string;
  inputType: string;
  inputName: string;
}): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "flex flex-col w-full max-w-md overflow-hidden shadow-lg";

  const labelEl = document.createElement("label");
  labelEl.htmlFor = inputName;
  labelEl.textContent = label;
  labelEl.className = "mb-2 text-lg font-medium text-white self-start";
  form.appendChild(labelEl);

  const input = document.createElement("input");
  input.type = inputType;
  input.name = inputName;
  input.id = inputName;
  if (inputType === 'file') {
    input.accept = ".png,.jpg,.jpeg";
  } else {
    input.value = value;
  }
  input.className =
    "flex-grow px-4 py-3 bg-white text-gray-900 " +
    "placeholder-gray-400 focus:outline-none";
  form.appendChild(input);

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = "Set";
  btn.className = 
    "bg-orange-500 hover:bg-orange-600 text-white font-semibold " +
    "px-5 md:px-6 whitespace-nowrap";
  form.appendChild(btn);

  return form;
}
