export function renderChat(): void {
  const root = document.getElementById('app');
  if (!root)
      return;
  root.innerHTML = `
    <div class="flex justify-end h-screen">
      <div class="flex justify-end w-[30%] h-full bg-red-500">
        <span class="text-center w-full">AAAAAAAHHHAHAHA!!! FUCK THE FRONT</span>
      </div>
    </div>
    `
  ;
}
