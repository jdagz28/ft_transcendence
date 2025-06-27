import { renderGamePage } from "./pages/game";
import { renderLoginPage } from "./pages/login";
import { renderRegisterPage } from "./pages/register";
import { renderMainPage } from "./pages/mainPage";
import { renderLobbyPage } from "./pages/lobby";
import { renderDefault } from "./pages/default";
import { renderCreateTournamentPage } from "./pages/createTournament";

export const ROUTE_GAMES_PAGE = "/#games";
export const ROUTE_LOGIN = "/#login";
export const ROUTE_REGISTER = "/#register";
export const ROUTE_MAIN = "/#main";
export const ROUTE_LOBBY = "/#lobby";
export const DEFAULT = "/#404";
export const ROUTE_TOURNAMENT_CREATE = "/#tournaments/create";


export type RouteParams = Record<string, string | undefined>;
type RouteHandler = (params: RouteParams) => void;


const routes: Record<string, RouteHandler> = {
  [ROUTE_GAMES_PAGE]: (params) => renderGamePage(params),
  [ROUTE_LOGIN]: () => renderLoginPage(),
  [ROUTE_REGISTER]: () => renderRegisterPage(),
  [ROUTE_MAIN]: (params) => renderMainPage(params),
  [ROUTE_LOBBY]: (params) => renderLobbyPage(params),
  [DEFAULT]: () => renderDefault(),
  [ROUTE_TOURNAMENT_CREATE]: () => renderCreateTournamentPage(),
};

/**
 * Split the hash into a “path” and a query-string, then convert
 * the query part to a plain object.
 */
function parseRoute(full: string): [string, RouteParams] {
  const routeQuery: string = full.substring(window.location.origin.length);
  const [path, queryString] = routeQuery.split("?");
  const params: RouteParams = {};
  if (queryString) {
    for (const [key, value] of new URLSearchParams(queryString).entries()) {
      params[key] = value;
    }
  }
 return [path, params];
}

export function initRouter() {
  const render = () => {
    const [path, params] = parseRoute(window.location.href);
    const view = routes[path] ?? routes[DEFAULT];
    view(params);
  };

  window.addEventListener("hashchange", render);
  render(); 
}
