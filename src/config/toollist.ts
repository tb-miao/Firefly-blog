import type { ToolItem } from "../types/config";

// 工具列表页面配置
export const toolListPageConfig = {
	title: "工具列表",
	description: "我用过的工具吖~",
	showSearch: true,
	showCategoryFilter: true,
};


// 工具列表配置
export const toolList: ToolItem[] = [
	//{
	//	title: "",
	//	description: "",
	//	url: "",
	//	icon: ",
	//	tags: [],
	//	enabled: true,
	//},
    {
        title: "Timeout",
        description: "超时，请重新刷新页面获取最新。",
        url: "",
        icon: "",
        tags: ["timeout"],
        enabled: true,
    }
];

// 获取启用的工具列表
export function getEnabledTools(): ToolItem[] {
	return toolList.filter((tool) => tool.enabled !== false).map((tool) => ({
		...tool,
		url: (tool.url || "").split("`").join("").trim(),
		icon: (tool.icon || "").split("`").join("").trim(),
	}));
}



// 获取所有标签
export function getAllToolTags(): string[] {
	const tags = getEnabledTools().flatMap((tool) => tool.tags || []);
	return [...new Set(tags)].sort();
}
