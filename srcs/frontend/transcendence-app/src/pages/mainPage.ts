import type { RouteParams } from "../router";
import { setupAppLayout } from "../setUpLayout";

export function renderMainPage(params: RouteParams): void {
	const root = setupAppLayout();
	if (!root) return;
	if (!params) return;
}