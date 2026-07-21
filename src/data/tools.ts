/**
 * 外部工具数据获取脚本
 * 默认从 GitHub Gist 加载，失败时回退到本地数据
 */

import { toolList } from "@/config/toollist.ts";

const cacheKey = "__externalToolsCache";
const MARKER = "data-ext-tool";

function getConfig() {
	const configScript = document.getElementById("tools-config");
	if (!configScript) {
		console.warn("[外部工具] 未找到配置脚本 #tools-config");
		return null;
	}

	const gistId = configScript.getAttribute("data-gist") || "";
	const fileName = configScript.getAttribute("data-file") || "";
	const token = configScript.getAttribute("data-token") || "";
	const enable = configScript.getAttribute("data-enable") === "true";

	let localTools = toolList;

	if (!gistId || !fileName) {
		return { enable: false, localTools };
	}

	return { gistId, fileName, token, enable, localTools };
}

function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function createToolCard(tool) {
	const title = escapeHtml(tool.title || "");
	const description = escapeHtml(tool.description || "");
	const url = escapeHtml((tool.url || "").split("`").join("").trim());
	const icon = (tool.icon || "").split("`").join("").trim();
	const tags = tool.tags || [];
	const categories = tool.categories || tool.tags || [];

	const card = document.createElement("a");
	card.href = url;
	card.target = "_blank";
	card.rel = "noopener noreferrer";
	card.setAttribute("data-tags", tags.join(","));
	card.setAttribute("data-categories", categories.join(","));
	card.setAttribute("data-title", title);
	card.setAttribute("data-description", description);
	card.setAttribute(MARKER, "1");
	card.className = "tool-card group relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-(--line-divider) hover:border-(--primary) hover:bg-(--card-bg) transition-all duration-300 hover:shadow-lg hover:shadow-(--primary)/10 overflow-hidden";

	const accentBg = document.createElement("div");
	accentBg.className = "absolute inset-0 bg-gradient-to-r from-(--primary)/0 via-(--primary)/5 to-(--primary)/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none";
	card.appendChild(accentBg);

	const leftBorder = document.createElement("div");
	leftBorder.className = "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 group-hover:h-3/4 bg-(--primary) rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100";
	card.appendChild(leftBorder);

	const iconDiv = document.createElement("div");
	iconDiv.className = "relative h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-xl bg-(--primary)/10 flex items-center justify-center text-(--primary) group-hover:bg-(--primary) group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-3";

	if (icon) {
		const img = document.createElement("img");
		img.src = icon;
		img.alt = title;
		img.className = "w-full h-full object-contain transition-transform duration-300 group-hover:scale-110";
		img.onerror = function() {
			iconDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
		};
		iconDiv.appendChild(img);
	} else {
		iconDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
	}
	card.appendChild(iconDiv);

	const infoDiv = document.createElement("div");
	infoDiv.className = "grow min-w-0 flex flex-col justify-center gap-0.5 md:gap-1";

	const headerDiv = document.createElement("div");
	headerDiv.className = "flex items-center justify-between";

	const titleEl = document.createElement("h3");
	titleEl.className = "font-bold text-sm md:text-base text-neutral-900 dark:text-neutral-100 group-hover:text-(--primary) transition-colors duration-300 truncate pr-2";
	titleEl.textContent = title;
	headerDiv.appendChild(titleEl);

	const arrowSvg = document.createElement("svg");
	arrowSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	arrowSvg.setAttribute("viewBox", "0 0 24 24");
	arrowSvg.setAttribute("fill", "none");
	arrowSvg.setAttribute("stroke", "currentColor");
	arrowSvg.setAttribute("stroke-width", "2");
	arrowSvg.className = "text-(--primary) text-base md:text-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0";
	arrowSvg.innerHTML = '<path d="M18 8l4 4M12 19l-7-7 7-7"/>';
	headerDiv.appendChild(arrowSvg);

	infoDiv.appendChild(headerDiv);

	if (description) {
		const descEl = document.createElement("p");
		descEl.className = "text-xs md:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 md:line-clamp-2";
		descEl.textContent = description;
		infoDiv.appendChild(descEl);
	}

	if (tags && tags.length > 0) {
		const tagsDiv = document.createElement("div");
		tagsDiv.className = "flex flex-wrap gap-1 mt-0.5 md:mt-1";
		tags.forEach(function(tag) {
			const tagEl = document.createElement("span");
			tagEl.className = "text-[0.65rem] md:text-xs px-1.5 md:px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-(--primary)/10 group-hover:text-(--primary) transition-colors duration-300";
			tagEl.textContent = tag;
			tagsDiv.appendChild(tagEl);
		});
		infoDiv.appendChild(tagsDiv);
	}

	card.appendChild(infoDiv);

	return card;
}

function updateTagFilter(toolList) {
	const filterEl = document.querySelector("tool-filter");
	if (!filterEl || !toolList || !Array.isArray(toolList)) return;

	const enabledTools = toolList.filter(function(t) { return t.enabled !== false; });
	const allTags = [];
	enabledTools.forEach(function(tool) {
		if (tool.tags && Array.isArray(tool.tags)) {
			tool.tags.forEach(function(tag) {
				if (allTags.indexOf(tag) === -1) {
					allTags.push(tag);
				}
			});
		}
		if (tool.categories && Array.isArray(tool.categories)) {
			tool.categories.forEach(function(cat) {
				if (allTags.indexOf(cat) === -1) {
					allTags.push(cat);
				}
			});
		}
	});
	allTags.sort();

	const activeTag = window.currentSelectedTag || "all";

	filterEl.innerHTML = "";

	const allBtn = document.createElement("button");
	allBtn.setAttribute("data-tag", "all");
	allBtn.textContent = "全部";
	allBtn.className = "px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg " +
		(activeTag === "all"
			? "bg-(--primary) text-white hover:opacity-90"
			: "bg-(--btn-regular-bg) text-(--btn-content) hover:bg-(--btn-regular-bg-hover)") +
		" transition-all duration-200 text-xs md:text-sm font-medium whitespace-nowrap";
	filterEl.appendChild(allBtn);

	allTags.forEach(function(tag) {
		const btn = document.createElement("button");
		btn.setAttribute("data-tag", tag);
		btn.textContent = tag;
		btn.className = "px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg " +
			(activeTag === tag
				? "bg-(--primary) text-white hover:opacity-90"
				: "bg-(--btn-regular-bg) text-(--btn-content) hover:bg-(--btn-regular-bg-hover)") +
			" transition-all duration-200 text-xs md:text-sm font-medium whitespace-nowrap";
		filterEl.appendChild(btn);
	});
}

function insertTools(toolList, isFallback) {
	const container = document.querySelector(".tools-grid");
	if (!container || !toolList || !Array.isArray(toolList) || toolList.length === 0) return;

	const enabledTools = toolList.filter(function(t) { return t.enabled !== false; });

	if (enabledTools.length === 0) return;

	const mainEmptyState = container.parentElement.querySelector(".empty-state-container");
	if (mainEmptyState) {
		mainEmptyState.style.display = "none";
	}

	const searchEmptyState = document.getElementById("search-empty-state");
	if (searchEmptyState) searchEmptyState.classList.add("hidden");

	updateTagFilter(toolList);

	enabledTools.forEach(function(tool) {
		const card = createToolCard(tool);
		if (isFallback) {
			card.setAttribute("data-fallback", "1");
		}
		container.appendChild(card);
	});

	container.setAttribute(MARKER, "1");

	if (window.applyFilters) {
		window.applyFilters();
	}
}

function hasExternalTools() {
	const container = document.querySelector(".tools-grid");
	if (!container) return false;
	return container.hasAttribute(MARKER) || container.querySelector("[" + MARKER + "]") !== null;
}

function updatePageConfig(config) {
	if (!config) return;

	if (config.title) {
		var titleEl = document.querySelector(".text-2xl.md\\:text-3xl.font-bold.text-neutral-900");
		if (titleEl) titleEl.textContent = config.title;
		document.title = config.title + " | Firefly Blog";
	}
	if (config.description) {
		var descEl = document.querySelector(".text-sm.md\\:text-base.text-neutral-600");
		if (descEl) descEl.textContent = config.description;
	}
	if (config.showSearch === false) {
		var searchEl = document.querySelector("#tool-search-input")?.parentElement?.parentElement;
		if (searchEl) searchEl.style.display = "none";
	}
	if (config.showCategoryFilter === false) {
		var filterEl = document.querySelector("tool-filter");
		if (filterEl) filterEl.style.display = "none";
	}
}

function fetchTools() {
	const container = document.querySelector(".tools-grid");
	if (!container) return;
	if (hasExternalTools()) return;

	const config = getConfig();
	if (!config) {
		console.warn("[外部工具] 无法获取配置");
		return;
	}

	var cache = window[cacheKey];
	if (cache && cache.time > Date.now() - 300000) {
		if (cache.data.tools) insertTools(cache.data.tools, false);
		if (cache.data.pageConfig) updatePageConfig(cache.data.pageConfig);
		return;
	}

	if (!config.enable || !config.gistId || !config.fileName) {
		console.info("[外部工具] Gist 未启用或配置不完整，使用本地数据");
		if (config.localTools && config.localTools.length > 0) {
			insertTools(config.localTools, true);
		}
		return;
	}

	var headers = {};
	if (config.token) {
		headers["Authorization"] = "Bearer " + config.token;
	}

	fetch("https://api.github.com/gists/" + config.gistId, { headers: headers })
		.then(function(r) {
			if (!r.ok) throw new Error("HTTP " + r.status);
			return r.json();
		})
		.then(function(gist) {
			var file = gist.files[config.fileName];
			if (!file || !file.content) throw new Error("文件不存在");

			try {
				var data = JSON.parse(file.content);
				window[cacheKey] = {
					data: data,
					time: Date.now(),
				};

				if (data.tools && Array.isArray(data.tools) && data.tools.length > 0) {
					insertTools(data.tools, false);
				} else {
					console.warn("[外部工具] Gist 数据为空，回退到本地数据");
					if (config.localTools && config.localTools.length > 0) {
						insertTools(config.localTools, true);
					}
				}
				if (data.pageConfig) {
					updatePageConfig(data.pageConfig);
				}
			} catch (e) {
				console.warn("[外部工具] 解析失败，回退到本地数据:", e.message);
				if (config.localTools && config.localTools.length > 0) {
					insertTools(config.localTools, true);
				}
			}
		})
		.catch(function(e) {
			console.warn("[外部工具] Gist 加载失败，回退到本地数据:", e.message);
			if (config.localTools && config.localTools.length > 0) {
				insertTools(config.localTools, true);
			}
		});
}

function initTools() {
	if (document.querySelector(".tools-grid")) {
		fetchTools();
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initTools);
} else {
	initTools();
}

document.addEventListener("swup:content:replace", function() {
	setTimeout(function() {
		if (document.querySelector(".tools-grid") && !hasExternalTools()) {
			fetchTools();
		}
	}, 50);
});

document.addEventListener("swup:contentReplaced", function() {
	setTimeout(function() {
		if (document.querySelector(".tools-grid") && !hasExternalTools()) {
			fetchTools();
		}
	}, 50);
});