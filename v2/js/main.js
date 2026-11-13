import { ensureDailyBackup } from "./backup.js";
import { installActions } from "./pages/actions.js";
import { renderRoute } from "./pages/render.js";
import { currentRoute } from "./router.js";
import { initSync, paintSyncChrome } from "./sync.js";
import { initStore, subscribe } from "./store.js";
import { esc } from "./util.js";

function typing() {
  const el = document.activeElement;
  if (!el || !document.getElementById("app")?.contains(el)) return false;
  if (el.isContentEditable) return true;
  if (el.matches("textarea")) return true;
  if (el.matches("input")) {
    return !["checkbox", "radio", "file", "date", "time", "datetime-local", "button", "submit"].includes(el.type);
  }
  return false;
}

let held = false;

function render() {
  if (typing()) {
    held = true;
    return;
  }
  held = false;
  const route = currentRoute();
  const app = document.getElementById("app");
  try {
    app.innerHTML = renderRoute(route);
    paintSyncChrome();
    if (route.name === "course" && route.section === "modules" && route.id) {
      document.getElementById(`module-${route.id}`)?.scrollIntoView({ block: "start" });
    }
  } catch (error) {
    console.error(error);
    app.innerHTML = `<main id="main" class="main"><h1>Study Hub hit a problem</h1><p>${esc(error.message || "Unknown error")}</p></main>`;
  }
}

if (!location.hash) location.replace("#/dashboard");

await initStore();
installActions();
subscribe(() => render());
window.addEventListener("hashchange", () => {
  held = false;
  render();
});
document.addEventListener("focusout", () => {
  if (!held) return;
  setTimeout(() => {
    if (held && !typing()) render();
  }, 200);
});
render();
ensureDailyBackup().catch((error) => console.error(error));
initSync().catch((error) => console.error(error));

if ("serviceWorker" in navigator) {
  const register = () => navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Service worker:", error.message));
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}
