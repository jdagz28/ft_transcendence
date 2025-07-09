import { renderGamePage } from "./pages/game";
import { renderLoginPage } from "./pages/login";
import { renderRegisterPage } from "./pages/register";
import { renderLoginMFA } from "./pages/loginMFA";
import { renderMainPage } from "./pages/mainPage";
import { renderLobbyPage } from "./pages/lobby";
import { renderDefault } from "./pages/default";
import { renderTournamentPage } from "./pages/tournament";
import { renderCreateTournamentPage } from "./pages/createTournament";
import { renderOptionsTournamentPage } from "./pages/optionsTournament";
import { renderAliasTournamentPage } from "./pages/aliasTournament";
import { renderTournamentLobby } from "./pages/lobbyTournament";
import { renderTournamentBracket } from "./pages/bracketsTournament";
import { renderTournamentGameLobby } from "./pages/gameLobbyTournament";
import { renderCreateGameLobby } from "./pages/createGame";
import { renderChat } from "./chat";
import { whoAmI } from "./setUpLayout";
import { renderAccountSettingsPage } from "./pages/accountSettings";
import { renderProfilePage } from "./pages/profile";
import { renderLeaderboardPage } from "./pages/leaderboard";
import { renderError403 } from "./pages/403";

export const ROUTE_GAMES_PAGE             = "/games/:gameId";
export const ROUTE_LOGIN                  = "/login";
export const ROUTE_REGISTER               = "/register";
export const ROUTE_LOGIN_MFA              = "/login/:userId/mfa/verify";
export const ROUTE_MAIN                   = "/main";
export const DEFAULT                      = "/404";
export const ROUTE_CHAT                   = "/chat";
export const ROUTE_TOURNAMENTS            = "/tournaments";
export const ROUTE_TOURNAMENT_CREATE      = "/tournaments/create";
export const ROUTE_TOURNAMENT_OPTIONS     = "/tournaments/:tournamentId/options";
export const ROUTE_TOURNAMENT_ALIAS       = "/tournaments/:tournamentId/alias";
export const ROUTE_TOURNAMENT_LOBBY       = "/tournaments/:tournamentId/lobby";
export const ROUTE_TOURNAMENT_BRACKET     = "/tournaments/:tournamentId/bracket";
export const ROUTE_TOURNAMENT_GAME        = "/tournaments/:tournamentId/:gameId";
export const ROUTE_TOURNAMENT_GAME_PLAY   = "/tournaments/:tournamentId/:gameId/play";
export const ROUTE_CREATE_GAME            = "/games/create";
export const ROUTE_LOBBY                  = "/games/:gameId/lobby";
export const ROUTE_GAME_PLAY              = "/games/:gameId/play";
export const ROUTE_ACCOUNT_SETTINGS       = "/users/:username/settings";
export const ROUTE_PROFILE                = "/users/:username";
export const ROUTE_LEADERBOARD            = "/leaderboard";
export const ERROR_403                    = "/403";


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
  { pattern: ROUTE_LOGIN_MFA, regex: tokenToRegex(ROUTE_LOGIN_MFA), handler: ({ userId }) => renderLoginMFA(Number(userId)) }, 
  { pattern: ROUTE_MAIN, regex: tokenToRegex(ROUTE_MAIN), handler: () => renderMainPage() },
 
  // { pattern: ROUTE_LOBBY, regex: tokenToRegex(ROUTE_LOBBY), handler: p => renderLobbyPage(p) },
  { pattern: ROUTE_TOURNAMENTS, regex: tokenToRegex(ROUTE_TOURNAMENTS), handler: () => renderTournamentPage() },
  { pattern: ROUTE_TOURNAMENT_CREATE, regex: tokenToRegex(ROUTE_TOURNAMENT_CREATE), handler: () => renderCreateTournamentPage() },

  { pattern: ROUTE_CREATE_GAME, regex: tokenToRegex(ROUTE_CREATE_GAME), handler: () => renderCreateGameLobby() },

  { pattern: ROUTE_LEADERBOARD, regex: tokenToRegex(ROUTE_LEADERBOARD), handler: () => renderLeaderboardPage() },

  { pattern: ERROR_403, regex: tokenToRegex(ERROR_403), handler: () => renderError403() },

  // dynamic
  { pattern: ROUTE_ACCOUNT_SETTINGS,
    regex: tokenToRegex(ROUTE_ACCOUNT_SETTINGS),
    handler: ({ username }) => renderAccountSettingsPage(String(username)) },

  { pattern: ROUTE_GAMES_PAGE,
    regex: tokenToRegex(ROUTE_GAMES_PAGE),
    handler: ({ gameId }) => renderGamePage({ gameId }) },

  { pattern: ROUTE_TOURNAMENT_OPTIONS,
    regex: tokenToRegex(ROUTE_TOURNAMENT_OPTIONS),
    handler: ({ tournamentId }) => renderOptionsTournamentPage(Number(tournamentId)) },

  { pattern: ROUTE_TOURNAMENT_ALIAS,
    regex: tokenToRegex(ROUTE_TOURNAMENT_ALIAS),
    handler: ({ tournamentId }) => renderAliasTournamentPage(Number(tournamentId)) },

  { pattern: ROUTE_TOURNAMENT_LOBBY,
    regex: tokenToRegex(ROUTE_TOURNAMENT_LOBBY),
    handler: ({ tournamentId }) => renderTournamentLobby(Number(tournamentId)) },
  
  { pattern: ROUTE_TOURNAMENT_BRACKET,
    regex: tokenToRegex(ROUTE_TOURNAMENT_BRACKET),
    handler: ({ tournamentId }) => renderTournamentBracket(Number(tournamentId)) },

  { pattern: ROUTE_TOURNAMENT_GAME,
    regex: tokenToRegex(ROUTE_TOURNAMENT_GAME),
    handler: ({ tournamentId, gameId }) => renderTournamentGameLobby({ tournamentId, gameId }) },

  { pattern: ROUTE_TOURNAMENT_GAME_PLAY,
    regex: tokenToRegex(ROUTE_TOURNAMENT_GAME_PLAY),
    handler: ({ gameId }) => renderGamePage({ gameId }) },
 
  { pattern: ROUTE_LOBBY,
    regex: tokenToRegex(ROUTE_LOBBY),
    handler: ({ gameId }) => renderLobbyPage({ gameId }) },
  
  { pattern: ROUTE_GAME_PLAY,
    regex: tokenToRegex(ROUTE_GAME_PLAY),
    handler: ({ gameId }) => renderGamePage({ gameId }) },

  { pattern: ROUTE_CHAT, regex: tokenToRegex(ROUTE_CHAT), handler: () => renderChat() },

  { pattern: ROUTE_PROFILE,
    regex: tokenToRegex(ROUTE_PROFILE),
    handler: ({ username }) => renderProfilePage(String(username)) },

  // fallback
  { pattern: DEFAULT, regex: tokenToRegex(DEFAULT), handler: () => renderDefault() }
];

function parseRoute(): [string, RouteParams] {
  const checkPath = window.location.pathname + window.location.hash;
  console.log(checkPath);
  if (checkPath.substring(0, 3) !== '/#/') {
    if (!window.location.pathname || !window.location.hash || window.location.pathname === '/') {
      console.warn("No pathname found in window location");
      return [ROUTE_LOGIN, {}];
    }
    console.warn("Invalid path format, expected '/#/' prefix");
    return [DEFAULT, {}];
  }
  const hash = window.location.hash || '#/';
  const [route] = hash.slice(1).split('?');
  const path = route.startsWith('/') ? route : '/' + route;
  if (path.endsWith('/')) {
    return [path.slice(0, -1), {}];
  }
  return [path, {}];
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

async function handleRootRedirect() {
  const auth = await whoAmI();
  if (auth.success) {
    window.location.hash = "#" + ROUTE_MAIN;
  } else {
    window.location.hash = "#" + ROUTE_LOGIN;
  }
}

export async function deletePastLobby() {
	const gameId = localStorage.getItem("gameId");
	const tok = localStorage.getItem("token");
	if (gameId && tok) {
		await fetch(`/games/${gameId}`, {
    		method: 'DELETE',
    		headers: {
       			'Authorization': `Bearer ${tok}`
			},
      		credentials: 'include'
    	});
		localStorage.removeItem("gameId");
	} 
}



export function initRouter() {
  const render = async () => {
    console.log("Router render called");
    const [path, params] = parseRoute();
    console.log("Parsed path:", path);
    console.log("Parsed params:", params);

    if (path == '/') {
      await handleRootRedirect();
      return;
    }
    
    for (const r of routes) {
      console.log("Testing route pattern:", r.pattern);
      console.log("Route regex:", r.regex);
      const m = r.regex.exec(path);
      console.log("Regex match result:", m);
      
      if (m) {
        console.log("Route matched! Calling handler with params:", { ...params, ...extractParams(m, r.pattern) });
		if (r.pattern !== ROUTE_LOBBY)
			await deletePastLobby();
        r.handler({ ...params, ...extractParams(m, r.pattern) });
        return;
      }
    }

	await deletePastLobby();
    
    console.log("No route matched, calling default handler");
    routes.find(r => r.pattern === DEFAULT)!.handler({});
  };

  window.addEventListener("hashchange", render);
  render(); 
}
