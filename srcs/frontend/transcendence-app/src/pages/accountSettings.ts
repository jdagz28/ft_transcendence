import { setupAppLayout, whoAmI } from "../setUpLayout";
import { getMfaDetails } from "../api/mfa";

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
  const { id: userId, email: userEmail, avatar, created, nickname } = userData.data;

  const userInfoSection = document.createElement("div");
  userInfoSection.className = "flex flex-col items-center space-y-4";

  const avatarImg = document.createElement("img");
  avatarImg.src = avatar;
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
    label: "Preferred Alias / Nickname",
    value: nickname || "",
    inputType: "text",
    inputName: "newNickname",
    endpoint: '/users/me/settings/changeNickname'
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


  let { mfa_enabled: mfaEnabled, qr_code, mfa_type } = await getMfaDetails(userId);
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

  const mfaTypeRow = document.createElement("div");
  mfaTypeRow.className = "flex items-center mt-4";

  const mfaTypeLabel = document.createElement("label");
  mfaTypeLabel.textContent = "Select MFA Type:";
  mfaTypeLabel.className = "ml-3 text-lg font-medium text-white";

  const mfaTypeSelect = document.createElement("select");
  mfaTypeSelect.id = "mfa-type-select";
  mfaTypeSelect.className =
    "ml-2 text-lg font-medium text-white bg-gray-800 border border-gray-600 rounded px-3 py-1";
  mfaTypeSelect.value = mfa_type; 

  const optionTotp = document.createElement("option");
  optionTotp.value = "totp";
  optionTotp.textContent = "Authenticator App";
  const optionEmail = document.createElement("option");
  optionEmail.value = "email";
  optionEmail.textContent = "Email";
  mfaTypeSelect.appendChild(optionTotp);
  mfaTypeSelect.appendChild(optionEmail);

  mfaTypeRow.appendChild(mfaTypeLabel);
  mfaTypeRow.appendChild(mfaTypeSelect);
  mfaSection.appendChild(mfaTypeRow);

  const qrContainer = document.createElement("div");
  qrContainer.className = "flex flex-col items-center mt-6";

  const qrBox = document.createElement("div");
  qrBox.id = "mfa-qr-box";
  qrBox.className = "w-48 h-48 mb-4 border-2 border-gray-700 rounded flex items-center justify-center text-gray-400";
  const note = document.createElement("span");
  note.textContent = "Scan during initial setup only";
  note.className = "text-gray-400 text-sm mt-3 mb-4";
  qrContainer.appendChild(qrBox);
  qrContainer.appendChild(note);

  const regenerateBtn = document.createElement("button");
  regenerateBtn.id = "regenerate-qr";
  regenerateBtn.textContent = "Regenerate QR Code";
  regenerateBtn.className = "bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded";
  mfaSection.appendChild(qrContainer);
  mfaSection.appendChild(regenerateBtn);

  contentContainer.appendChild(mfaSection);


  const toggleInput = document.getElementById("mfa-toggle") as HTMLInputElement;

  function updateMfaControlsVisibility() {
    const isMfaEnabled = toggleInput.checked;
    const selectedMfaType = mfaTypeSelect.value;

    mfaTypeRow.style.display = isMfaEnabled ? "flex" : "none";

    const showTotpElements = isMfaEnabled && selectedMfaType === "totp";
    qrContainer.style.display = showTotpElements ? "flex" : "none";
    regenerateBtn.style.display = showTotpElements ? "block" : "none";
  }


  async function refreshMfaUI() {
    try {
      const details = await getMfaDetails(userId);
      mfaEnabled = details.mfa_enabled;
      qr_code = details.qr_code;
      mfa_type = details.mfa_type;

      toggleInput.checked = mfaEnabled;
      regenerateBtn.disabled = !mfaEnabled;
      mfaTypeSelect.value = mfa_type;

      qrBox.innerHTML = "";
      if (mfa_type === "totp" && qr_code) {
        qrImg = document.createElement("img");
        qrImg.src = qr_code;
        qrImg.alt = "MFA QR Code";
        qrImg.className = "w-full h-full object-cover rounded";
        qrBox.appendChild(qrImg);
      } else {
        const placeholder = document.createElement("span");
        placeholder.textContent = "No QR Code";
        qrBox.appendChild(placeholder);
      } 
      updateMfaControlsVisibility();
    } catch (error) {
      console.error("Failed to refresh MFA UI:", error);
    }
  }

  mfaTypeSelect.addEventListener("change", async () => {
    const token = localStorage.getItem("token")
    const selectedType = mfaTypeSelect.value
    try {
      const res = await fetch(`/auth/${userId}/mfa/type`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ mfa_type: selectedType })
      });
      if (!res.ok) {
        throw new Error("Failed to update MFA type.");
      }
      selectedType === "totp" ? await refreshMfaUI() : await updateMfaControlsVisibility();
    } catch (error) {
      console.error("Error updating MFA type:", error);
    }
  });

  
    if (toggleInput) {
    toggleInput.addEventListener("change", async () => {
      console.log("MFA toggle 'change' event fired. New state:", toggleInput.checked);

      const token = localStorage.getItem("token");
      const originalState = !toggleInput.checked;

      try {
        let response;
        if (toggleInput.checked) {
          response = await fetch(`/auth/${userId}/mfa/enable`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
        } else {
          response = await fetch(`/auth/${userId}/mfa/disable`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Failed to update MFA status`);
        }

        await refreshMfaUI();
      } catch (error) {
        console.error("Error during MFA toggle:", error);
        alert(`Error: ${error}`);
        toggleInput.checked = originalState;
        updateMfaControlsVisibility();
      }
    });
  } else {
    console.error("Fatal Error: MFA toggle input with ID 'mfa-toggle' not found.");
  }

  regenerateBtn.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/auth/${userId}/mfa/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`  },
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to regenerate MFA QR code.");
      }
      await refreshMfaUI();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    }
  });

  await refreshMfaUI();
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
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}` 
          },
          body: data,
          credentials: "include"
        });
        if (!res.ok)
          throw new Error(await res.text());
      } else {
        if (inputName === "newUsername" || inputName === "newNickname") {
          if (!/^[a-zA-Z0-9_!$#-]+$/.test(input.value)) {
            alert("Username/Nickname can only contain alphanumeric characters and special characters (!, $, #, -, _)");
            return;
          }
          if (input.value.length < 3 || input.value.length > 15) {
            alert("Username/Nickname must be between 3 and 15 characters");
            return;
          }
        } else if (inputName === "password") {
          if (input.value.length < 8 || input.value.length > 20) {
            alert("Password must at least be 8 characters and 20 characters max with at least one uppercase letter, one number, and one special character.");
            return;
          }
          if (!/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(input.value)) {
            alert("Password must contain at least one uppercase letter, one number, and one special character.");
            return;
          }
        }

        const payload = { [inputName]: (form.querySelector(`input[name="${inputName}"]`) as HTMLInputElement).value };
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
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
    .src = data.avatar;
  const details = document.getElementById("user-details")!;
  details.innerHTML = `
    <div><strong>Username:</strong> ${data.username}</div>
    <div><strong>Email:</strong> ${data.email}</div>
    <div><strong>User ID:</strong> ${data.id}</div>
    <div><strong>Account Created:</strong> ${new Date(data.created).toLocaleDateString()}</div>
  `;
}
