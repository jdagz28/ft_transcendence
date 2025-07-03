
export interface Player {
  id: number;
  username: string;
  alias: string;
  avatarUrl: string;
  slotIndex?: number;
  status?: "accepted" | "pending";
}

export type SlotState = | {kind: "open" } | { kind: "filled"; player: Player } | { kind: "pending"; player: Player };


export interface SlotOptions {
  slotIndex: number;
  state: SlotState;
  fetchCandidates?: (slotIndex: number) => Promise<Player[]>;
  onInvite?: (slotIndex: number, userId: number) => void;
  onClick?: () => void;
  invitedPlayerIds?: Set<number>; 
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
    "relative w-72 h-24 rounded-lg bg-[#0d2551] text-white " +
    "flex items-center justify-between px-6 shadow-md text-xl font-semibold";

  const content = document.createElement("div");
  content.className = "flex items-center gap-3";
  const label = document.createElement("span");
  label.className = "font-semibold capitalize";
  content.appendChild(label);
  box.appendChild(content);

  const caret = document.createElement("div");
  caret.innerHTML = 
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" ' +
    'viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>';
  caret.className = "opacity-70";
  box.appendChild(caret);

  // dropdown
  const menu = document.createElement("div");
  menu.className = 
    "absolute left-0 top-full mt-1 w-64 rounded-lg bg-white text-gray-900 " +
    "shadow-lg overflow-y-auto max-h-60 z-20 hidden";
  box.appendChild(menu);

  // render dropdown
  const showMenu = (players: Player[], invitedPlayerIds: Set<number> = new Set())  => {
    if (!players.length) return;
    menu.innerHTML = "";
    players.forEach(p => {
      const item = document.createElement("button");
      item.type = "button";
      const isInvited = invitedPlayerIds.has(p.id);
      item.className = 
        "w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100";
      const statusColor = isInvited ? "#fbbf24" : "#10b981"; 
      const displayText = isInvited ? `${p.username} (invited)` : p.username;
      
      item.innerHTML = 
        `${statusDot(statusColor)}<img src="${p.avatarUrl}" ` +
        'class="w-6 h-6 rounded-full" alt=""/>' + 
        `<span class="flex-1 text-left">${displayText}</span>`;
      
      if (!isInvited) {
        item.onclick = e => {
          e.stopPropagation();
          menu.classList.add("hidden");
          opts.onInvite?.(opts.slotIndex, p.id);
        };
      }
      menu.appendChild(item);     
    });
    menu.classList.remove("hidden");
  };

  const render = (state: SlotState) => {
    box.onclick = null;
    menu.classList.add("hidden");
    content.querySelectorAll("img").forEach(n => n.remove());
    content.querySelectorAll(".pending-indicator").forEach(n => n.remove());

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
          if (list.length)
            showMenu(list);
        };
      }
    } else if (state.kind === "pending") {
      const p = state.player;
      const displayName = p.alias || p.username;
      label.textContent = displayName;
      label.className = "text-xl font-semibold text-yellow-400";
      caret.style.visibility = "hidden";


      const pendingIndicator = document.createElement("span");
      pendingIndicator.textContent = "(invited)";
      pendingIndicator.className = "pending-indicator text-sm text-yellow-300 ml-2";
      content.appendChild(pendingIndicator);

      const img = new Image(48, 48);
      img.src = p.avatarUrl;
      img.className = "rounded-full opacity-60"; 
      content.prepend(img);


      box.className = box.className.replace("bg-[#0d2551]", "bg-yellow-900/30 border border-yellow-600/50");
    } else {
      const p = state.player;
      label.textContent = p.username;
      label.className = "text-2xl font-bold";
      caret.style.visibility = "hidden";
      
      const img = new Image(48, 48);
      img.src = p.avatarUrl;
      img.className = "rounded-full";
      content.prepend(img);
    }
  };

  document.addEventListener("click", () => menu.classList.add("hidden"));
  render(opts.state);
  return { el: box, update: render };
}

export function assignSlots(
  players: Player[],
  maxPlayers: number,
  creatorId: number,
  invitedIndexes: Record<number, number>
): Array<Player & { slotIndex: number }> {
  const taken = new Set<number>();
  const result: Array<Player & { slotIndex: number }> = [];

  const creator = players.find(p => p.id === creatorId);
  if (creator) {
    result.push({ ...creator, slotIndex: 0 });
    taken.add(0);
  }

  for (const [pid, idx] of Object.entries(invitedIndexes)) {
    const player = players.find(p => p.id === Number(pid));
    if (player && !taken.has(idx) && idx < maxPlayers) {
      result.push({ ...player, slotIndex: idx });
      taken.add(idx);
    }
  }

  let next = 0;
  for (const player of players) {
    if (result.some(p => p.id === player.id)) continue;
    while (taken.has(next)) next++;
    if (next < maxPlayers) {
      result.push({ ...player, slotIndex: next });
      taken.add(next);
    }
  }
  return result;
}
