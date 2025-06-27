import { setupAppLayout } from "../setUpLayout";

export function renderDefault(): void {
	const root = setupAppLayout();
	if (!root) return;
	root.contentContainer.innerHTML += 'ERROR 404';
}