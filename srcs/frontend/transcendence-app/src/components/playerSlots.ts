export interface Player {
  id: number;
  name: string;
  avatarUrl: string;
}

export type SlotState = | {kind: "open" } | { kind: "filled"; player: Player }


export interface SlotOptions {
  slotIndex: number;
  state: SlotState;
  fetchCandidates?: (slotIndex: number) => Promise<Player[]>;
  onInvite?: (slotIndex: number, userId: number) => void;
  onClick?: () => void;
}

function statusDot(color: string) {
  return `<span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${color}"></span>`;
}

export function buildPlayerSlot(opts: SlotOptions): {
  el: HTMLDivElement;
  update: (state: SlotState) => void;
} {
  const box = document.createElement("div"); 
  box.className = 
    "relative w-48 h-16 rounded-lg bg-[#0d2551] text-white " +
    "flex items-center justify-between px-4 shadow-md";

  const content = document.createElement("div");
  content.className = "flex items-center gap-3";
  const label = document.createElement("span");
  label.className = "font-semibold capitalize";
  content.appendChild(label);
  box.appendChild(content);

  const caret = document.createElement("div");
  caret.innerHTML = 
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width=2" ' +
    'viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>';
  caret.className = "opacity- 70";
  box.appendChild(caret);

  // dropdown
  const menu = document.createElement("div");
  menu.className = 
    "absolute left-0 top-full mt-1 w-48 rounded-lg bg-white text-gray-900 " +
    "shadow-lg overflow-y auto max-h-60 z-20 hidden";
  box.appendChild(menu);

  // render dropdown
  const showMenu = (players: Player[]) => {
    if (!players.length) return;
    menu.innerHTML = "";
    players.forEach(p => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = 
        "w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100";
      item.innerHTML = 
        `${statusDot("#10b981")}<img src="${p.avatarUrl}" ` +
        'class="w-6 h-6 rounded-full" alt=""/>' + 
        `<span class="flex-1 text-left">${p.name}</span>`;
      item.onclick = e => {
        e.stopPropagation();
        menu.classList.add("hidden");
        opts.onInvite?.(opts.slotIndex, p.id);
      };
      menu.appendChild(item);     
    });
    menu.classList.remove("hidden");
  };

  const render = (state: SlotState) => {
    box.onclick = null;
    menu.classList.add("hidden");
    content.querySelectorAll("img").forEach(n => n.remove());

    if (state.kind === "open") {
      label.textContent = "open";
      caret.style.visibility = "visible";

      // fetch and show users
      if (opts.onClick) {
        // Handle onClick if provided
        box.onclick = (e) => {
          e.stopPropagation();
          opts.onClick!();
        };
      } else if (opts.fetchCandidates) {
        box.onclick = async (e) => {
          e.stopPropagation();
          const list = await opts.fetchCandidates!(opts.slotIndex);
          if (list.length) showMenu(list); 
        };
      }
    } else {
      const p = state.player;
      label.textContent = p.name;
      caret.style.visibility = "hidden";
      const img = new Image(32, 32);
      img.src = p.avatarUrl;
      img.className = "rounded-full";
      content.prepend(img);
    }
  };

  document.addEventListener("click", () => menu.classList.add("hidden"));

  render(opts.state);
  return { el: box, update: render };
}