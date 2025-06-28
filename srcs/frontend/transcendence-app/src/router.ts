import { renderGamePage } from "./pages/game";
import { renderLoginPage } from "./pages/login";
import { renderRegisterPage } from "./pages/register";
import { renderMainPage } from "./pages/mainPage";
import { renderLobbyPage } from "./pages/lobby";
import { renderDefault } from "./pages/default";
import { renderCreateTournamentPage } from "./pages/createTournament";
import { renderAliasTournamentPage } from "./pages/aliasTournament";
import { renderChat } from "./chat";

export const ROUTE_GAMES_PAGE             = "/#games/:gameId";
export const ROUTE_LOGIN_HASH             = "/#login";
export const ROUTE_LOGIN_PATH             = "/login";
export const ROUTE_REGISTER_HASH          = "/#register";
export const ROUTE_REGISTER_PATH          = "/register";
export const ROUTE_MAIN                   = "/#main";
export const ROUTE_LOBBY                  = "/#lobby";
export const DEFAULT                      = "/#404";
export const ROUTE_CHAT                   = "/#chat";
export const ROUTE_TOURNAMENT_CREATE      = "/#tournaments/create";
export const ROUTE_TOURNAMENT_ALIAS       = "/#tournaments/:tournamentId/alias";



export type RouteParams = Record<string, string | undefined>;
type RouteHandler = (params: RouteParams) => void;

type RouteEntry = {
  pattern: string;
  regex: RegExp;
  handler: RouteHandler;
};

function tokenToRegex(pattern: string): RegExp {
  return new RegExp(
    "^" +
      pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/:([a-zA-Z0-9_]+)/g, "([^/]+)")
      + "$"
  );
}

function extractParams(match: RegExpExecArray, pattern: string): RouteParams {
  const keys = (pattern.match(/:([a-zA-Z0-9_]+)/g) || []).map(k => k.slice(1));
  const out: RouteParams = {};
  keys.forEach((k, i) => (out[k] = match[i + 1]));
  return out;
}


const routes: RouteEntry[] = [
  { pattern: ROUTE_LOGIN_HASH,    regex: tokenToRegex(ROUTE_LOGIN_HASH),    handler: _ => renderLoginPage() },
  { pattern: ROUTE_LOGIN_PATH,    regex: tokenToRegex(ROUTE_LOGIN_PATH),    handler: _ => renderLoginPage() },
  { pattern: ROUTE_REGISTER_HASH, regex: tokenToRegex(ROUTE_REGISTER_HASH), handler: _ => renderRegisterPage() },
  { pattern: ROUTE_REGISTER_PATH, regex: tokenToRegex(ROUTE_REGISTER_PATH), handler: _ => renderRegisterPage() },

  { pattern: ROUTE_MAIN, regex: tokenToRegex(ROUTE_MAIN), handler: p => renderMainPage(p) },
  { pattern: ROUTE_LOBBY, regex: tokenToRegex(ROUTE_LOBBY), handler: p => renderLobbyPage(p) },
  { pattern: ROUTE_TOURNAMENT_CREATE, regex: tokenToRegex(ROUTE_TOURNAMENT_CREATE), handler: _ => renderCreateTournamentPage() },

  // dynamic
  { pattern: ROUTE_GAMES_PAGE,
    regex: tokenToRegex(ROUTE_GAMES_PAGE),
    handler: ({ gameId }) => renderGamePage({ gameId }) },

  { pattern: ROUTE_TOURNAMENT_ALIAS,
    regex: tokenToRegex(ROUTE_TOURNAMENT_ALIAS),
    handler: ({ tournamentId }) => renderAliasTournamentPage(Number(tournamentId)) },

  // { pattern: ROUTE_TOURNAMENT_LOBBY,
  //   regex: tokenToRegex(ROUTE_TOURNAMENT_LOBBY),
  //   handler: ({ tournamentId }) => renderLobbyPage({ tid: Number(tournamentId) }) },

  { pattern: ROUTE_CHAT, regex: tokenToRegex(ROUTE_CHAT), handler: () => renderChat() },

  // fallback
  { pattern: DEFAULT, regex: tokenToRegex(DEFAULT), handler: () => renderDefault() }
];

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
    for (const r of routes) {
      const m = r.regex.exec(path);
      if (m) {
        r.handler({ ...params, ...extractParams(m, r.pattern) });
        return;
      }
    }
    routes.find(r => r.pattern === DEFAULT)!.handler({});
  };

  window.addEventListener("hashchange", render);
  render(); 
}
