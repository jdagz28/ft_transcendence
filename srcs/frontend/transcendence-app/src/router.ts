import { renderGameNewPage } from "./pages/game-new"; 

export const ROUTE_GAMES_NEW = "#games-new";

export type RouteParams = Record<string, string | undefined>;
type RouteHandler = (params: RouteParams) => void;


const routes: Record<string, RouteHandler> = {
  [ROUTE_GAMES_NEW]: (params) => renderGameNewPage(params),
};

/**
 * Split the hash into a “path” and a query-string, then convert
 * the query part to a plain object.
 */
function parseHash(hash: string): [string, RouteParams] {
  const [path, queryString] = hash.split("?");
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
    const [path, params] = parseHash(window.location.hash);
    const view = routes[path] ?? routes[""];
    view(params);
  };

  window.addEventListener("hashchange", render);
  render(); 
}
