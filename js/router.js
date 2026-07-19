import { renderDashboard } from "./views/dashboard.js";
import { renderDailyEntry } from "./views/daily-entry.js";
import { renderBodyFat } from "./views/body-fat.js";
import { renderTrends } from "./views/trends.js";
import { renderProgressPhotos } from "./views/progress-photos.js";
import { renderGoals } from "./views/goals.js";
import { renderSettings } from "./views/settings.js";
import { renderTrainingDashboard } from "./views/training-dashboard.js";

const routes = {
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
    render: renderBodyFat
  },
  trends: {
    title: "Trends",
    render: renderTrends
  },
  "progress-photos": {
    title: "Fortschrittsbilder",
    render: renderProgressPhotos
  },
  goals: {
    title: "Ziele",
    render: renderGoals
  },
  settings: {
    title: "Einstellungen",
    render: renderSettings
  }
};

function getRouteFromHash() {
  const route = window.location.hash.replace(/^#\/?/, "");
  return routes[route] ? route : "dashboard";
}

function setActiveNavigation(routeName) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.route === routeName) {
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

  title.textContent = route.title;
  view.innerHTML = "";
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
