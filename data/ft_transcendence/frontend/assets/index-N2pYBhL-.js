(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const o of t.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function a(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function s(e){if(e.ep)return;e.ep=!0;const t=a(e);fetch(e.href,t)}})();function y(r){const n=document.getElementById("app");if(!n)return;const a=r.mode??"training",s=r.maxPlayers??"1";n.innerHTML=`
    <div class="mx-auto max-w-5xl p-6">
      <div class="rounded-lg border border-gray-300 bg-white p-8 shadow-sm overflow-x-auto">
        <form id="create-form" class="flex flex-col items-center gap-6 md:flex-row md:justify-center">
          <!-- MODE -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="mode">Mode</label>
            <select id="mode" name="mode"
                    class="block w-full rounded-md border-gray-300 shadow-sm"
                    required>
              ${["training","single-player","local-multiplayer","online-multiplayer"].map(i=>`<option value="${i}" ${i===a?"selected":""}>${i.replace("-"," ")}</option>`).join("")}
            </select>
          </div>

          <!-- MAX PLAYERS -->
          <div class="w-full md:w-64">
            <label class="mb-2 block text-sm font-medium text-gray-700" for="maxPlayers">Max players</label>
            <input id="maxPlayers" name="maxPlayers" type="number"
                   min="1" max="10"
                   value="${s}"
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
  `;const e=document.getElementById("create-form"),t=document.getElementById("mode"),o=document.getElementById("maxPlayers"),c=document.getElementById("submit-btn"),f='<svg class="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-linecap="round"/></svg>',m=()=>{const i=t.value,l=i==="training"||i==="single-player";o.disabled=l,o.min=l?"1":"2",o.max="10",o.value=l?"1":Math.max(2,Number(o.value)).toString()};m(),t.addEventListener("change",m),e.onsubmit=async i=>{i.preventDefault();const l={mode:t.value,maxPlayers:Number(o.value)};c.disabled=!0,c.innerHTML=`${f}Creating…`;try{const d=await fetch("/games/createGame",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6InRlc3QiLCJqdGkiOiIxNzQ4MjQ3NzU2NTYwIiwiaWF0IjoxNzQ4MjQ3NzU2LCJleHAiOjE3NDgyNTEzNTZ9.rNEd3qCb_pPzqCulEbrC-KA4YtPeZO6VlWg_39Vf_kY"},credentials:"include",body:JSON.stringify(l)});if(!d.ok)throw new Error(await d.text());const p=await d.json();window.location.hash=`#dashboard?gameId=${encodeURIComponent(p.gameId)}`}catch(d){alert(d.message)}finally{c.disabled=!1,c.textContent="Create"}}}const g="#games-new",u={[g]:r=>y(r)};function b(r){const[n,a]=r.split("?"),s={};if(a)for(const[e,t]of new URLSearchParams(a).entries())s[e]=t;return[n,s]}function h(){const r=()=>{const[n,a]=b(window.location.hash);(u[n]??u[""])(a)};window.addEventListener("hashchange",r),r()}document.addEventListener("DOMContentLoaded",()=>{h()});
