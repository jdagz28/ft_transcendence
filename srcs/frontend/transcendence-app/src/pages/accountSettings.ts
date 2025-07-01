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

  let userData = await whoAmI();
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
  userDetails.id = "user-details";
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
  formsContainer.className = "flex flex-col items-center px-8 mt-4 space-y-6";

  formsContainer.appendChild(createIndividualForm({
    label: "Username",
    value: username,
    inputType: "text",
    inputName: "newUsername",
    endpoint: '/users/me/settings/changeUsername'
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Email",
    value: userEmail,
    inputType: "email",
    inputName: "newEmail",
    endpoint: '/users/me/settings/changeEmail'
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Password",
    value: "",
    inputType: "password",
    inputName: "newPassword",
    endpoint: '/users/me/settings/changePassword'
  }));

  formsContainer.appendChild(createIndividualForm({
    label: "Avatar",
    value: "",
    inputType: "file",
    inputName: "avatar",
    endpoint: '/users/me/settings/avatar'
  }));

  contentContainer.appendChild(formsContainer);

  const mfaSection = document.createElement("div");
  mfaSection.className = "flex flex-col items-center mt-12"; 
  const mfaHeader = document.createElement("h2");
  mfaHeader.textContent = "Multi-Factor Authentication (MFA)";
  mfaHeader.className = "text-2xl font-semibold text-white mb-4";
  mfaSection.appendChild(mfaHeader);

  const mfaEnabled = false; //! API
  const qrCodeUrl = "";       //! API
  let qrImg: HTMLImageElement | null = null;

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "relative inline-flex items-center cursor-pointer";
  toggleLabel.innerHTML = `
    <input type="checkbox" id="mfa-toggle" class="sr-only peer" ${mfaEnabled ? 'checked' : ''}>
    <div class="w-14 h-8 bg-gray-200 rounded-full peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors"></div>
    <div class="absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6"></div>
    <span class="ml-3 text-lg font-medium text-white">Enable MFA</span>
  `; 
  mfaSection.appendChild(toggleLabel);

  const qrContainer = document.createElement("div");
  qrContainer.className = "flex flex-col items-center mt-6";

  const qrBox = document.createElement("div");
  qrBox.id = "mfa-qr-box";
  qrBox.className = "w-48 h-48 mb-4 border-2 border-gray-700 rounded flex items-center justify-center text-gray-400";
  if (qrCodeUrl) {
    qrImg = document.createElement("img");
    qrImg.src = qrCodeUrl;
    qrImg.alt = "MFA QR Code";
    qrImg.className = "w-full h-full object-cover rounded";
    qrBox.appendChild(qrImg);
  } else {
    const placeholder = document.createElement("span");
    placeholder.textContent = "No QR Code";
    qrBox.appendChild(placeholder);
  }
  qrContainer.appendChild(qrBox);

  const regenerateBtn = document.createElement("button");
  regenerateBtn.id = "regenerate-qr";
  regenerateBtn.textContent = "Regenerate QR Code";
  regenerateBtn.className = "bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded";
  regenerateBtn.disabled = !mfaEnabled; 
  mfaSection.appendChild(qrContainer);
  mfaSection.appendChild(regenerateBtn);

  contentContainer.appendChild(mfaSection);


  const toggleInput = document.getElementById("mfa-toggle") as HTMLInputElement;
  toggleInput.addEventListener("change", async () => {
    if (toggleInput.checked) {
      let codeUrl = qrCodeUrl;
      if (!codeUrl) {
        const res = await fetch(`/api/user/${userId}/mfa/setup`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          codeUrl = data.qrCodeUrl;
          if (qrImg) {
            qrImg.src = codeUrl;
          } else {
            qrImg = document.createElement("img");
            qrImg.src = codeUrl;
            qrImg.alt = "MFA QR Code";
            qrImg.className = "w-full h-full object-cover rounded";
            qrBox.innerHTML = "";
            qrBox.appendChild(qrImg);
          }
        } else {
          console.error("Failed to enable MFA");
          toggleInput.checked = false;
          return;
        }
      }
      regenerateBtn.disabled = false;
    } else {
      await fetch(`/api/user/${userId}/mfa/disable`, { method: "POST" }).catch(() => console.error("Failed to disable MFA"));
      regenerateBtn.disabled = true;
    }
  });

  regenerateBtn.addEventListener("click", async () => {
    const res = await fetch(`/api/user/${userId}/mfa/setup`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (qrImg) qrImg.src = data.qrCodeUrl;
    } else {
      console.error("Failed to regenerate QR code");
    }
  });
}

function createIndividualForm({ label, value, inputType, inputName, endpoint }: {
  label: string;
  value: string;
  inputType: string;
  inputName: string;
  endpoint: string;
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

  form.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (inputType === "file") {
        const data = new FormData();
        const fileInput = form.querySelector(`input[name="${inputName}"]`) as HTMLInputElement;
        if (fileInput.files?.length) 
          data.append(inputName, fileInput.files[0]);
        const res = await fetch(endpoint, { method: "PUT", body: data, credentials: "include" });
        if (!res.ok) 
          throw new Error(await res.text());
      } else {
        const payload = { [inputName]: (form.querySelector(`input[name="${inputName}"]`) as HTMLInputElement).value };
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }) },
          credentials: "include",
          body: JSON.stringify(payload)
        });
        if (!res.ok) 
          throw new Error(await res.text());
      }
      alert(`${label} updated!`);
      await refreshUserInfo(); 
    } catch (err) {
      console.error("Update failed:", err);
      alert(`Failed to update ${label}`);
    }
  });

  return form;
}

async function refreshUserInfo() {
  const res = await whoAmI();
  if (!res.success) return;
  const { data } = res;
  (document.querySelector("img[alt='User Avatar']") as HTMLImageElement)
    .src = data.avatar.url;
  const details = document.getElementById("user-details")!;
  details.innerHTML = `
    <div><strong>Username:</strong> ${data.username}</div>
    <div><strong>Email:</strong> ${data.email}</div>
    <div><strong>User ID:</strong> ${data.id}</div>
    <div><strong>Account Created:</strong> ${new Date(data.created).toLocaleDateString()}</div>
  `;
}
