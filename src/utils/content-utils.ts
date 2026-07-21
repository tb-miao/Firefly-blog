import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl, getPostUrlBySlug } from "@utils/url-utils";
import { siteConfig } from "@/config/siteConfig";
import type { UserSubjectCollection } from "@/types/bangumi";

async function fetchWithRetry(
	url: string,
	options: { timeout?: number; retries?: number } = {},
): Promise<Response> {
	const { timeout = 10000, retries = 3 } = options;
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				signal: controller.signal,
				headers: {
					"User-Agent": "Firefly Blog",
				},
			});

			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			lastError = error as Error;
			if (attempt < retries) {
				const delay = Math.pow(3, attempt) * 1000;
				console.warn(`[Fetch] 第 ${attempt + 1} 次请求失败，${delay}ms 后重试:`, error);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error("Fetch failed after retries");
}

async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		// 首先按置顶状态排序，置顶文章在前
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;

		// 如果置顶状态相同，则按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export interface ArchiveItem {
	id: string;
	type: "post" | "moment" | "bangumi" | "life" | "anime";
	link?: string;
	data: {
		title: string;
		published: Date;
		tags: string[];
		category?: string | null;
	};
}

// 获取 Bangumi 数据的辅助函数
async function fetchBangumiArchiveData(): Promise<ArchiveItem[]> {
	const bangumiConfig = siteConfig.bangumi;
	if (!bangumiConfig) return [];

	const username = bangumiConfig.userId;
	const apiUrl = bangumiConfig.apiUrl || "https://api.bangumi.one";

	// 检查是否已配置用户ID
	if (!username || username === "you-user-id" || username.trim() === "") {
		console.log("[Archive] Bangumi 用户ID未配置，跳过获取");
		return [];
	}

	// 分类映射
	const categoryMap: Record<string, { name: string; subjectType: number }> = {
		anime: { name: i18n(I18nKey.bangumiCategoryAnime), subjectType: 2 },
		book: { name: i18n(I18nKey.bangumiCategoryBook), subjectType: 1 },
		music: { name: i18n(I18nKey.bangumiCategoryMusic), subjectType: 3 },
		game: { name: i18n(I18nKey.bangumiCategoryGame), subjectType: 4 },
	};

	const subjectBaseUrl =
		bangumiConfig.subjectBaseUrl || "https://bangumi.one/subject/";
	const bangumiItems: ArchiveItem[] = [];

	for (const [key, info] of Object.entries(categoryMap)) {
		try {
			const url = `${apiUrl}/v0/users/${username}/collections?subject_type=${info.subjectType}&limit=50&offset=0`;
			const response = await fetch(url, {
				headers: {
					"User-Agent": "YuuOuRou Blog",
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				console.warn(
					`[Archive] 获取 Bangumi ${info.name} 数据失败: ${response.status}`,
				);
				continue;
			}

			const data = (await response.json()) as { data: UserSubjectCollection[] };
			const collections = data.data || [];

			for (const item of collections) {
				bangumiItems.push({
					id: `bangumi-${item.subject.id}`,
					type: "bangumi",
					link: `${subjectBaseUrl}${item.subject.id}`,
					data: {
						title: item.subject.name,
						published: item.subject.date
							? new Date(item.subject.date)
							: new Date(),
						tags: item.subject.tags?.map((t) => t.name) || [],
						category: info.name,
					},
				});
			}
		} catch (error) {
			console.error(`[Archive] 获取 Bangumi ${info.name} 数据异常:`, error);
		}
	}

	return bangumiItems;
}

// 获取 Anime（Bilibili 追番）数据的辅助函数
async function fetchAnimeArchiveData(): Promise<ArchiveItem[]> {
	const animeConfig = siteConfig.anime;
	if (!animeConfig?.bilibili?.uid) {
		console.log("[Archive] Anime Bilibili UID 未配置，跳过获取");
		return [];
	}

	const BILIBILI_UID = animeConfig.bilibili.uid;
	const ps = 30;

	interface BilibiliAnimeItem {
		media_id: number;
		title: string;
		cover?: string;
		season_type?: number;
		season_type_name?: string;
		rating?: { score?: number };
		evaluate?: string;
		brief?: string;
		season_id: number;
		new_ep?: { index_show?: string };
	}

	async function fetchBilibiliByType(type: number): Promise<BilibiliAnimeItem[]> {
		const items: BilibiliAnimeItem[] = [];
		try {
			const firstRes = await fetch(
				`https://api.bilibili.com/x/space/bangumi/follow/list?type=${type}&vmid=${BILIBILI_UID}&pn=1&ps=${ps}`,
			);
			const firstJson = await firstRes.json();
			if (firstJson.code !== 0 || !firstJson.data?.list?.length) return items;

			items.push(...firstJson.data.list);
			const total = firstJson.data.total || items.length;
			const totalPages = Math.ceil(total / ps);

			if (totalPages > 1) {
				const promises: Promise<BilibiliAnimeItem[]>[] = [];
				for (let pn = 2; pn <= totalPages; pn++) {
					promises.push(
						fetch(
							`https://api.bilibili.com/x/space/bangumi/follow/list?type=${type}&vmid=${BILIBILI_UID}&pn=${pn}&ps=${ps}`,
						)
							.then((r) => r.json())
							.then((j) => j.data?.list || []),
					);
				}
				const remaining = await Promise.all(promises);
				for (const batch of remaining) {
					items.push(...batch);
				}
			}
		} catch (error) {
			console.error(`[Archive] 获取 Bilibili 追番数据异常:`, error);
		}
		return items;
	}

	const [animeItems, dramaItems] = await Promise.all([
		fetchBilibiliByType(1),
		fetchBilibiliByType(2),
	]);
	const allItems = [...animeItems, ...dramaItems];

	const seasonTypeMap: Record<number, string> = {
		1: i18n(I18nKey.animeTypeAnime) || "番剧",
		2: i18n(I18nKey.animeTypeMovie) || "电影",
		3: i18n(I18nKey.animeTypeDocumentary) || "纪录片",
		4: i18n(I18nKey.animeTypeChinese) || "国创",
		5: i18n(I18nKey.animeTypeDrama) || "电视剧",
		7: i18n(I18nKey.animeTypeConcert) || "演唱会",
	};

	return allItems.map((item) => ({
		id: `anime-${item.media_id}`,
		type: "anime",
		link: `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
		data: {
			title: item.title,
			published: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
			tags: item.rating?.score ? [`评分 ${item.rating.score}`] : [],
			category: seasonTypeMap[item.season_type || 1] || "番剧",
		},
	}));
}

export async function getArchiveList(): Promise<ArchiveItem[]> {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const postItems: ArchiveItem[] = posts.map((post) => ({
		id: post.id,
		type: "post",
		link: getPostUrlBySlug(post.id),
		data: {
			title: post.data.title,
			published: post.data.published,
			tags: post.data.tags,
			category: post.data.category || null,
		},
	}));


	// 获取 Bangumi 数据
	const bangumiItems: ArchiveItem[] = await fetchBangumiArchiveData();

	// 获取 Anime（Bilibili 追番）数据
	const animeItems: ArchiveItem[] = await fetchAnimeArchiveData();

	const lifeItems: ArchiveItem[] = [];


	return [
		...postItems,
		...bangumiItems,
		...animeItems,
		...lifeItems,
	].sort((a, b) => {
		const timeA = a.data.published.getTime();
		const timeB = b.data.published.getTime();
		return timeB - timeA;
	});
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return (
			count[b] - count[a] || a.toLowerCase().localeCompare(b.toLowerCase())
		);
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}

/**
 * 对标题进行分词，支持中英文混合
 * 使用 Intl.Segmenter 对中文分词，英文按空格分词
 * 过滤标点和空白，英文统一小写
 */
function tokenizeTitle(title: string): Set<string> {
	const tokens = new Set<string>();
	const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
	for (const { segment, isWordLike } of segmenter.segment(title)) {
		if (!isWordLike) continue;
		tokens.add(segment.toLowerCase());
	}
	return tokens;
}

/**
 * 计算两个集合的 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0;
	let intersection = 0;
	for (const item of a) {
		if (b.has(item)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * 获取相关文章推荐
 * 评分公式: totalScore = tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus
 * - tagMatchScore (0-100): 标签 Jaccard 相似度 × 100
 * - titleSimilarityScore (0-100): 标题分词 Jaccard 相似度 × 100
 * - timeFreshnessScore (0-30): 6 个月半衰期指数衰减
 * - categoryBonus (0 or 10): 同分类加 10 分
 */
export async function getRelatedPosts(
	currentPost: CollectionEntry<"posts">,
	maxCount = 5,
): Promise<PostForList[]> {
	const allPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// 排除自身和加密文章
	const candidates = allPosts.filter(
		(p) => p.id !== currentPost.id && !p.data.password,
	);

	const currentTags = new Set(currentPost.data.tags || []);
	const currentTokens = tokenizeTitle(currentPost.data.title);
	const currentCategory = currentPost.data.category || "";
	const now = Date.now();

	const scored = candidates.map((post) => {
		const postTags = new Set(post.data.tags || []);

		// tagMatchScore (0-100)
		const tagMatchScore = jaccardSimilarity(currentTags, postTags) * 100;

		// titleSimilarityScore (0-100)
		const postTokens = tokenizeTitle(post.data.title);
		const titleSimilarityScore =
			jaccardSimilarity(currentTokens, postTokens) * 100;

		// timeFreshnessScore (0-30): 6 个月半衰期
		const daysSincePublished =
			(now - new Date(post.data.published).getTime()) / (1000 * 60 * 60 * 24);
		const timeFreshnessScore =
			30 * Math.exp((-Math.LN2 * daysSincePublished) / 180);

		// categoryBonus (0 or 10)
		const postCategory = post.data.category || "";
		const categoryBonus =
			currentCategory && postCategory && currentCategory === postCategory
				? 10
				: 0;

		const totalScore =
			tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus;

		return {
			post,
			totalScore,
			tagMatchScore,
			timeFreshnessScore,
			categoryBonus,
		};
	});

	// 按总分降序排列
	scored.sort((a, b) => b.totalScore - a.totalScore);

	// 优先取有标签匹配的
	const withTagMatch = scored.filter((s) => s.tagMatchScore > 0);
	const withoutTagMatch = scored.filter((s) => s.tagMatchScore === 0);

	const result: PostForList[] = [];

	for (const s of withTagMatch) {
		if (result.length >= maxCount) break;
		result.push({ id: s.post.id, data: s.post.data });
	}

	// 不足时从剩余候选中按 timeFreshnessScore + categoryBonus 降序补充
	if (result.length < maxCount) {
		withoutTagMatch.sort(
			(a, b) =>
				b.timeFreshnessScore +
				b.categoryBonus -
				(a.timeFreshnessScore + a.categoryBonus),
		);
		for (const s of withoutTagMatch) {
			if (result.length >= maxCount) break;
			result.push({ id: s.post.id, data: s.post.data });
		}
	}

	return result;
}
