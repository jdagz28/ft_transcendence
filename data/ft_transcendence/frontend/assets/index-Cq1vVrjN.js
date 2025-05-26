(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))e(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&e(s)}).observe(document,{childList:!0,subtree:!0});function r(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(t){if(t.ep)return;t.ep=!0;const o=r(t);fetch(t.href,o)}})();function g(i){const a=document.getElementById("app");if(!a)return;const r=i.mode??"training",e=i.maxPlayers??"1";a.innerHTML=`
    <div class="mx-auto max-w-5xl p-6">
      <div class="rounded-lg border border-gray-300 bg-white p-8 shadow-sm overflow-x-auto">
        <form id="create-form" class="flex flex-col items-center gap-6 md:flex-row md:justify-center">
          <!-- MODE -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="mode">Mode</label>
            <select id="mode" name="mode"
                    class="block w-full rounded-md border-gray-300 shadow-sm"
                    required>
              ${["training","single-player","local-multiplayer","online-multiplayer"].map(d=>`<option value="${d}" ${d===r?"selected":""}>${d.replace("-"," ")}</option>`).join("")}
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
  `;const t=document.getElementById("create-form"),o=document.getElementById("mode"),s=document.getElementById("maxPlayers"),m=document.getElementById("submit-btn"),f='<svg class="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-linecap="round"/></svg>',u=()=>{const d=o.value,c=d==="training"||d==="single-player";s.disabled=c,s.min=c?"1":"2",s.max="10",s.value=c?"1":Math.max(2,Number(s.value)).toString()};u(),o.addEventListener("change",u),t.onsubmit=async d=>{d.preventDefault();const c={mode:o.value,maxPlayers:Number(s.value)};m.disabled=!0,m.innerHTML=`${f}Creating…`;try{const n=await fetch("/games/createGame",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6InRlc3QiLCJqdGkiOiIxNzQ4MjQ3NzU2NTYwIiwiaWF0IjoxNzQ4MjQ3NzU2LCJleHAiOjE3NDgyNTEzNTZ9.rNEd3qCb_pPzqCulEbrC-KA4YtPeZO6VlWg_39Vf_kY"},credentials:"include",body:JSON.stringify(c)});if(!n.ok)throw new Error(await n.text());const l=await n.json();window.location.hash=`#dashboard?gameId=${encodeURIComponent(l.gameId)}`}catch(n){alert(n.message)}finally{m.disabled=!1,m.textContent="Create"}}}function y(i){const a=i.gameId;if(console.log("Params:",i),!a){document.body.innerHTML='<h1 style="color:white;font-family:sans-serif">Missing gameId in URL!</h1>';return}const r=document.createElement("canvas");document.body.appendChild(r);const e=r.getContext("2d");let t=window.innerWidth,o=window.innerHeight;r.width=t,r.height=o,r.style.backgroundColor="black",window.addEventListener("resize",()=>{t=window.innerWidth,o=window.innerHeight,r.width=t,r.height=o});const s=new WebSocket(`wss://${window.location.hostname}:${window.location.port}/sessions/${a}`);s.onopen=()=>{console.log(`✅ Connected to game session: ${a}`)},s.onmessage=n=>{try{const l=JSON.parse(n.data);l.type==="STATE"&&m(l)}catch(l){console.error("❌ Failed to parse state:",l)}},s.onerror=n=>{console.error("❌ WebSocket error:",n)};function m(n){e.clearRect(0,0,t,o),c(),n.ball&&f(n.ball),n.players&&u(n.players),n.score&&d(n.score)}function f(n){e.beginPath(),e.arc(n.x,n.y,n.width||15,0,Math.PI*2),e.fillStyle="white",e.fill(),e.closePath()}function u(n){for(const l of Object.values(n))e.fillStyle="white",e.fillRect(l.x,l.y,l.width,l.height)}function d(n){e.font="100px sans-serif",e.fillStyle="white",e.textAlign="right",e.fillText(String(n.p1),t/2-50,100),e.textAlign="left",e.fillText(String(n.p2),t/2+50,100)}function c(){e.strokeStyle="white",e.lineWidth=3,e.setLineDash([10,10]),e.beginPath(),e.moveTo(t/2,0),e.lineTo(o/2,o),e.stroke(),e.setLineDash([])}}const w="#games-new",p="#games",h={[w]:i=>g(i),[p]:i=>y(i)};function b(i){const[a,r]=i.split("?"),e={};if(r)for(const[t,o]of new URLSearchParams(r).entries())e[t]=o;return[a,e]}function x(){const i=()=>{const[a,r]=b(window.location.hash);(h[a]??h[""])(r)};window.addEventListener("hashchange",i),i()}document.addEventListener("DOMContentLoaded",()=>{x()});
