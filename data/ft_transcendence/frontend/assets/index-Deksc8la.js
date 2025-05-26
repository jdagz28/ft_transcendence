(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))e(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&e(a)}).observe(document,{childList:!0,subtree:!0});function r(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerPolicy&&(n.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?n.credentials="include":t.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function e(t){if(t.ep)return;t.ep=!0;const n=r(t);fetch(t.href,n)}})();function w(i){const s=document.getElementById("app");if(!s)return;const r=i.mode??"training",e=i.maxPlayers??"1";s.innerHTML=`
    <div class="mx-auto max-w-5xl p-6">
      <div class="rounded-lg border border-gray-300 bg-white p-8 shadow-sm overflow-x-auto">
        <form id="create-form" class="flex flex-col items-center gap-6 md:flex-row md:justify-center">
          <!-- MODE -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="mode">Mode</label>
            <select id="mode" name="mode"
                    class="block w-full rounded-md border-gray-300 shadow-sm"
                    required>
              ${["training","single-player","local-multiplayer","online-multiplayer"].map(l=>`<option value="${l}" ${l===r?"selected":""}>${l.replace("-"," ")}</option>`).join("")}
            </select>
          </div>

          <!-- MAX PLAYERS -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="maxPlayers">Max players</label>
            <input id="maxPlayers" name="maxPlayers" type="number"
                   min="1" max="10"
                   value="${e}"
                   class="block w-full rounded-md border-gray-300 shadow-sm" required />
          </div>

          <!-- SUBMIT -->
          <button id="submit-btn" type="submit"
                  class="h-10 w-full md:w-40 rounded-md bg-blue-600 text-white transition hover:bg-blue-700">
            Create
          </button>
        </form>
      </div>
    </div>
  `;const t=document.getElementById("create-form"),n=document.getElementById("mode"),a=document.getElementById("maxPlayers"),d=document.getElementById("submit-btn"),h='<svg class="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-linecap="round"/></svg>',f=()=>{const l=n.value,m=l==="training"||l==="single-player";a.disabled=m,a.min=m?"1":"2",a.max="10",a.value=m?"1":Math.max(2,Number(a.value)).toString()};f(),n.addEventListener("change",f),t.onsubmit=async l=>{l.preventDefault();const m={mode:n.value,maxPlayers:Number(a.value)};d.disabled=!0,d.innerHTML=`${h}Creating…`;try{const u=await fetch("/games/createGame",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6InRlc3QiLCJqdGkiOiIxNzQ4MjQ3NzU2NTYwIiwiaWF0IjoxNzQ4MjQ3NzU2LCJleHAiOjE3NDgyNTEzNTZ9.rNEd3qCb_pPzqCulEbrC-KA4YtPeZO6VlWg_39Vf_kY"},credentials:"include",body:JSON.stringify(m)});if(!u.ok)throw new Error(await u.text());const o=await u.json();window.location.hash=`#dashboard?gameId=${encodeURIComponent(o.gameId)}`}catch(u){alert(u.message)}finally{d.disabled=!1,d.textContent="Create"}}}function y(i){const s=i.gameId;if(console.log("Params:",i),!s){document.body.innerHTML='<h1 style="color:white;font-family:sans-serif">Missing gameId in URL!</h1>';return}const r=document.createElement("canvas");document.body.appendChild(r);const e=r.getContext("2d");let t=window.innerWidth,n=window.innerHeight;r.width=t,r.height=n,r.style.backgroundColor="black",window.addEventListener("resize",()=>{t=window.innerWidth,n=window.innerHeight,r.width=t,r.height=n});const a=window.location.protocol==="https:"?"wss":"ws",d=new WebSocket(`${a}://${window.location.host}/sessions/${s}`);d.onopen=()=>{console.log(`✅ Connected to game session: ${s}`)},d.onmessage=o=>{try{const c=JSON.parse(o.data);c.type==="STATE"&&h(c)}catch(c){console.error("❌ Failed to parse state:",c)}},d.onerror=o=>{console.error("❌ WebSocket error:",o)};function h(o){e.clearRect(0,0,t,n),u(),o.ball&&f(o.ball),o.players&&l(o.players),o.score&&m(o.score)}function f(o){e.beginPath(),e.arc(o.x,o.y,o.width||15,0,Math.PI*2),e.fillStyle="white",e.fill(),e.closePath()}function l(o){for(const c of Object.values(o))e.fillStyle="white",e.fillRect(c.x,c.y,c.width,c.height)}function m(o){e.font="100px sans-serif",e.fillStyle="white",e.textAlign="right",e.fillText(String(o.p1),t/2-50,100),e.textAlign="left",e.fillText(String(o.p2),t/2+50,100)}function u(){e.strokeStyle="white",e.lineWidth=3,e.setLineDash([10,10]),e.beginPath(),e.moveTo(t/2,0),e.lineTo(n/2,n),e.stroke(),e.setLineDash([])}}const p="#games-new",b="#games",g={[p]:i=>w(i),[b]:i=>y(i)};function x(i){const[s,r]=i.split("?"),e={};if(r)for(const[t,n]of new URLSearchParams(r).entries())e[t]=n;return[s,e]}function v(){const i=()=>{const[s,r]=x(window.location.hash);(g[s]??g[""])(r)};window.addEventListener("hashchange",i),i()}document.addEventListener("DOMContentLoaded",()=>{v()});
