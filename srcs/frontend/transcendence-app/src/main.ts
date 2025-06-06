import "@/style.css";

import { initRouter } from "./router"; 

/**
 * Kick things off once the DOM is ready.
 * All page-level React rendering happens inside each renderXYZPage() helper.
 */
document.addEventListener("DOMContentLoaded", () => {
  initRouter();
});
