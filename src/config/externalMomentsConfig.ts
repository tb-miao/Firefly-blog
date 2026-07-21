// 外部说说数据源配置（基于 GitHub Gist，完全免费）
// 数据存储在 GitHub Gist 中，通过 GitHub API 读写
// 添加新说说不会修改仓库中的任何代码

export interface LocalMoment {
	id: string;
	content: string;
	published: string;
	images?: string[];
	tags?: string[];
	location?: string;
	pinned?: boolean;
	author?: string;
	avatar?: string;
}

export const externalMomentsConfig = {
	// 是否启用外部说说数据源
	enable: true,

	// GitHub Gist ID（创建 Gist 后从 URL 中获取）
	gistId: "dde348ff7a89ca2702cd5b555f73b312",

	// Gist 中的文件名
	fileName: "moments.json",

	// 默认作者信息
	defaultAuthor: "YeizelNylo",
	defaultAvatar:
		"https://avatars.githubusercontent.com/u/172878250?v=4",

	// 后台登录密码的 SHA-256 哈希（明文密码不再存入代码）
	// 生成方式：echo -n "你的密码" | hyde189755
	adminPasswordHash:
		"b5d9ded2ab2812e8653f06fc4d3246a4b13642e8371bc74a7f1003eb4fb4e637",

	githubToken:
		typeof process !== "undefined" && process.env?.GITHUB_TOKEN
			? process.env.GITHUB_TOKEN
			: "",

	// 本地说说数据（作为 Gist 失败时的 fallback）
	localMoments: [] as LocalMoment[],
};