import { setupAppLayout, whoAmI } from "../setUpLayout";
import { getTournamentPlayers, getTournamentName, getTournamentBrackets} from "../api/tournament";
import { type Player, type SlotState, buildPlayerSlot } from "@/components/playerSlots";


export async function renderTournamentBracket(tournamentId: number): Promise<void> {
  const { contentContainer } = setupAppLayout();
  contentContainer.className =
    "flex-grow flex flex-col gap-8 px-8 py-10 text-white overflow-x-auto";

  const tournamentName = await getTournamentName(tournamentId);
  const slots = await getTournamentBrackets(tournamentId)
  const players = await getTournamentPlayers(tournamentId);
  const userData = await whoAmI();
  if (!userData.success) {
    console.error("Failed to get user data:", userData.error);
    window.location.hash = "#/";
    return;
  }

  const userId = userData.data.id;
  let authorized = false;
  for (const player of players) {
    if (player.id === userId) {
      authorized = true;
      break;
    }
  }
  if (!authorized) {
    window.location.hash = "/403"; 
    return;
  }

  contentContainer.innerHTML = "";

  const header = document.createElement("div");
  header.className = "text-center py-6";
  header.innerHTML = `<h1 class="text-3xl md:text-4xl font-bold mb-2">${tournamentName}</h1>`;
  contentContainer.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className =
    "relative flex justify-center gap-32 px-8 py-10 min-h-[60vh]";
  contentContainer.appendChild(wrapper);

  const col1 = document.createElement("div");
  col1.className = "flex flex-col items-center justify-center";
  wrapper.appendChild(col1);

  const col2 = document.createElement("div");
  col2.className = "flex flex-col items-center justify-center gap-32 relative"; 
  wrapper.appendChild(col2);

  const col3 = document.createElement("div");
  col3.className = "flex flex-col justify-center relative";
  wrapper.appendChild(col3);

  function getPlayerById(id: number): Player | undefined {
    return players.find(p => p.id === id);
  }

  function isPlayable(slots: any[], idx: number): boolean {
    if (idx === 0) return true;

    return slots[idx - 1].status === "finished";
  }

  const round1Slots = slots.brackets?.[0]?.slots ?? [];
  round1Slots.forEach((slot: any, idx: number) => {
    const container = document.createElement("div");
    container.className = "flex flex-col items-center";

    const header = document.createElement("div");
    header.className = "mb-2 flex items-center gap-2";
    header.innerText = `Match ${slot.slot + 1}`;

    if (slot.status === "pending" && isPlayable(round1Slots, idx)) {
      const gameId = slot.gameId;
      const playBtn = document.createElement("button");
      playBtn.className =
        "px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-sm";
      playBtn.textContent = "Play";
      playBtn.onclick = async () => {
        playBtn.disabled = true;
        window.location.hash = `#/tournaments/${tournamentId}/${gameId}`
      };
      header.appendChild(playBtn);
    } else if (slot.status === "finished") {
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "text-sm ";
      const p1 = slot.players[0];
      const p2 = slot.players[1];
      scoreSpan.textContent =
        `${slot.score[p1.playerId]} – ` +
        `${slot.score[p2.playerId]}`;
      header.appendChild(scoreSpan);
    }
    container.appendChild(header);

    slot.players.forEach((p: any, pIdx: number) => {
      const player = getPlayerById(p.playerId);
      let state: SlotState;
      if (player) {
        state = { kind: "filled", player };
      } else {
        state = { kind: "open" };
      }
      const playerSlot = buildPlayerSlot({
        slotIndex: pIdx,
        state
      });
      if (slot.status === 'finished' && player && slot.winnerId === player.id) {
        playerSlot.el.classList.add("ring-2", "ring-sky-400");
      }
      container.appendChild(playerSlot.el);

      if (pIdx === 0) {
        const spacer = document.createElement("div");
        spacer.style.height = "32px";
        container.appendChild(spacer);
      }
    });

    if (idx < round1Slots.length - 1) {
      container.style.marginBottom = "96px"; 
    }

    col1.appendChild(container);
  });

  const createTbdPlayer = (): Player => ({
    id: 0,
    username: "",
    alias: "TBD",
    avatarUrl: "https://localhost:4242/users/1/avatar",
  });


  let round2Slots = slots.brackets?.[1]?.slots ?? [];
  if (round2Slots.length === 0 && round1Slots.length > 0) {
    round2Slots = [{
        slot: 0,
        status: "pending",
        players: [],
        gameId: null,
        winnerId: null,
        score: {}
    }];
  }

  
  round2Slots.forEach((slot: any) => {
    const container = document.createElement("div");
    container.className = "flex flex-col items-center";

    const header = document.createElement("div");
    header.className = "mb-2 flex items-center gap-2";
    header.innerText = `Championship Match`;
    
    const isUserInGame = slot.players.some((p: any) => p.playerId === userId);

    if (slot.status === "pending" && isUserInGame) {
        const gameId = slot.gameId;
        const playBtn = document.createElement("button");
        playBtn.className = "px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-sm";
        playBtn.textContent = "Play";
        playBtn.onclick = () => window.location.hash = `#/tournaments/${tournamentId}/${gameId}`;
        header.appendChild(playBtn);
    } else if (slot.status === "finished") {
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "text-sm ml-2 font-bold";
        const p1 = slot.players[0];
        const p2 = slot.players[1];
        if (p1 && p2 && slot.score) {
            scoreSpan.textContent = `${slot.score[p1.playerId] ?? 0} – ${slot.score[p2.playerId] ?? 0}`;
            header.appendChild(scoreSpan);
        }
    }
    container.appendChild(header);

    for (let i = 0; i < 2; i++) {
        const playerInfo = slot.players[i];
        const player = playerInfo ? getPlayerById(playerInfo.playerId) : undefined;
        const state: SlotState = player ? { kind: "filled", player } : { kind: "filled", player: createTbdPlayer() };
        const playerSlot = buildPlayerSlot({ slotIndex: i, state });
        
        if (player) {
          if (slot.status === 'finished' && slot.winnerId === player.id) {
            playerSlot.el.classList.add("ring-2", "ring-sky-400");
          }
        }
        container.appendChild(playerSlot.el);

        if (i === 0) {
            const spacer = document.createElement("div");
            spacer.style.height = "32px";
            container.appendChild(spacer);
        }
    }
    col2.appendChild(container);
  });

  const championHeader = document.createElement("div");
  championHeader.className = "mb-2 text-lg font-bold text-amber-400";
  championHeader.textContent = "Champion";
  col3.appendChild(championHeader);

  const lastRound = slots.brackets[slots.brackets.length - 1];
  const finalMatch = lastRound?.slots[0];
  const winner = finalMatch?.status === 'finished' && finalMatch.winnerId && finalMatch.round === 2
    ? getPlayerById(finalMatch.winnerId) 
    : undefined;

  const championState: SlotState = winner
    ? { kind: "filled", player: winner }
    : { kind: "filled", player: createTbdPlayer() };

  const championSlot = buildPlayerSlot({ slotIndex: 0, state: championState });
  if (winner) {
    championSlot.el.classList.add("ring-2", "ring-amber-400");
  }
  col3.appendChild(championSlot.el);
}
