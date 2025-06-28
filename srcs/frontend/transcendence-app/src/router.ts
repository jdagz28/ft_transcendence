import { renderGamePage } from "./pages/game";
import { renderLoginPage } from "./pages/login";
import { renderRegisterPage } from "./pages/register";
import { renderMainPage } from "./pages/mainPage";
import { renderLobbyPage } from "./pages/lobby";
import { renderDefault } from "./pages/default";
import { renderCreateTournamentPage } from "./pages/createTournament";
import { renderAliasTournamentPage } from "./pages/aliasTournament";
import { renderChat } from "./chat";

export const ROUTE_GAMES_PAGE             = "/#/games/:gameId";
export const ROUTE_LOGIN                  = "/#/login";
export const ROUTE_REGISTER               = "/#/register";
export const ROUTE_MAIN                   = "/#/main";
export const ROUTE_LOBBY                  = "/#/lobby";
export const DEFAULT                      = "/#/404";
export const ROUTE_CHAT                   = "/#/chat";
export const ROUTE_TOURNAMENT_CREATE      = "/#/tournaments/create";
export const ROUTE_TOURNAMENT_ALIAS       = "/#/tournaments/:tournamentId/alias";



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
  { pattern: ROUTE_LOGIN,  regex: tokenToRegex(ROUTE_LOGIN),  handler: () => renderLoginPage() },
  { pattern: ROUTE_REGISTER, regex: tokenToRegex(ROUTE_REGISTER), handler: () => renderRegisterPage() },
  { pattern: ROUTE_MAIN, regex: tokenToRegex(ROUTE_MAIN), handler: p => renderMainPage(p) },
 
  { pattern: ROUTE_LOBBY, regex: tokenToRegex(ROUTE_LOBBY), handler: p => renderLobbyPage(p) },
  { pattern: ROUTE_TOURNAMENT_CREATE, regex: tokenToRegex(ROUTE_TOURNAMENT_CREATE), handler: () => renderCreateTournamentPage() },

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

(function preserveOAuthParams() {
  const hash = window.location.hash;
  if (hash.includes('?')) {
    const [, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString);
    const token = params.get('token');
    const user = params.get('user');
    const provider = params.get('provider');
    
    if (token && user && token !== 'null' && user !== 'null') {
      console.log('OAuth params preserved:', { token, user, provider });
      
      sessionStorage.setItem('oauth_token', token);
      sessionStorage.setItem('oauth_user', user);
      sessionStorage.setItem('oauth_provider', provider || '');
      
      window.history.replaceState({}, '', window.location.pathname + '#/login');
    }
  }
})();

export function initRouter() {
  const render = () => {
    console.log("Router render called");
    const [path, params] = parseRoute(window.location.href);
    console.log("Parsed path:", path);
    console.log("Parsed params:", params);
    
    for (const r of routes) {
      console.log("Testing route pattern:", r.pattern);
      console.log("Route regex:", r.regex);
      const m = r.regex.exec(path);
      console.log("Regex match result:", m);
      
      if (m) {
        console.log("Route matched! Calling handler with params:", { ...params, ...extractParams(m, r.pattern) });
        r.handler({ ...params, ...extractParams(m, r.pattern) });
        return;
      }
    }
    
    console.log("No route matched, calling default handler");
    routes.find(r => r.pattern === DEFAULT)!.handler({});
  };

  window.addEventListener("hashchange", render);
  render(); 
}
