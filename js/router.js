import { renderDashboard } from "./views/dashboard.js";
import { renderDailyEntry } from "./views/daily-entry.js";
import { renderBodyFat } from "./views/body-fat.js";
import { renderTrends } from "./views/trends.js";
import { renderProgressPhotos } from "./views/progress-photos.js";
import { renderGoals } from "./views/goals.js";
import { renderSettings } from "./views/settings.js";
import { renderTrainingDashboard } from "./views/training-dashboard.js";

export const routes = {
  dashboard: {
    title: "Dashboard",
    render: renderDashboard
  },
  daily: {
    title: "Tagesdaten",
    render: renderDailyEntry
  },
  training: {
    title: "Training",
    render: renderTrainingDashboard
  },
  "body-fat": {
    title: "KFA-Messung",
    parentNav: "daily",
    parentLabel: "Log",
    render: renderBodyFat
  },
  trends: {
    title: "Trends",
    render: renderTrends
  },
  "progress-photos": {
    title: "Fortschrittsbilder",
    parentNav: "trends",
    parentLabel: "Trends",
    render: renderProgressPhotos
  },
  goals: {
    title: "Ziele",
    parentNav: "settings",
    parentLabel: "More",
    render: renderGoals
  },
  settings: {
    title: "Einstellungen",
    render: renderSettings
  }
};

export function getRouteFromHash(hash = window.location.hash) {
  const route = hash.replace(/^#\/?/, "").split("?")[0];
  return routes[route] ? route : "dashboard";
}

export function getNavigationRoute(routeName) {
  return routes[routeName]?.parentNav || routeName;
}

function setActiveNavigation(routeName) {
  const activeRoute = getNavigationRoute(routeName);
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.route === activeRoute) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function renderRoute() {
  const routeName = getRouteFromHash();
  const route = routes[routeName];
  const view = document.querySelector("#app-view");
  const title = document.querySelector("#view-title");

  if (routeName !== "training") document.body.classList.remove("workout-focus");
  title.textContent = route.title;
  view.innerHTML = "";
  if (route.parentNav) {
    view.insertAdjacentHTML("beforeend", `<a class="route-context-link" href="#/${route.parentNav}">← Zurück zu ${route.parentLabel}</a>`);
  }
  view.append(route.render());
  setActiveNavigation(routeName);
  view.focus({ preventScroll: true });

  if (!window.location.hash) {
    window.history.replaceState(null, "", "#/dashboard");
  }
}

export function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
