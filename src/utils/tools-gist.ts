import type { ToolItem } from "@/types/config";
import { externalMomentsConfig } from "@/config/externalMomentsConfig";

export const toolsGistId = "bd326815044e2223109b858d7ba45bf2";
export const toolsFileName = "tools.json";

export interface ToolsConfig {
	tools: ToolItem[];
	pageConfig: {
		title: string;
		description: string;
		showSearch: boolean;
		showCategoryFilter: boolean;
	};
}

export async function loadToolsFromGist(): Promise<ToolsConfig | null> {
	if (!externalMomentsConfig.enable || !toolsGistId) {
		return null;
	}
	try {
		const response = await fetch(`https://api.github.com/gists/${toolsGistId}`, {
			headers: externalMomentsConfig.githubToken
				? { Authorization: `Bearer ${externalMomentsConfig.githubToken}` }
				: {},
		});
		if (!response.ok) {
			return null;
		}
		const gist = await response.json();
		const file = gist.files[toolsFileName];
		if (!file || !file.content) {
			return null;
		}
		return JSON.parse(file.content);
	} catch {
		return null;
	}
}