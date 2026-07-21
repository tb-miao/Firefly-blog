export type { AnalyticsConfig } from "./analyticsConfig";
export type { AnnouncementConfig } from "./announcementConfig";
export type { BackgroundWallpaperConfig } from "./backgroundWallpaper";
export type { CommentConfig } from "./commentConfig";
export type { CoverImageConfig } from "./coverImageConfig";
export type { SakuraConfig } from "./effectsConfig";
export type {
	ExpressiveCodeConfig,
	PluginCollapsibleConfig,
	PluginLanguageBadgeConfig,
} from "./expressiveCodeConfig";
export type { FontSelectionConfig } from "./fontConfig";
export type { FooterConfig } from "./footerConfig";
export type { FriendLink, FriendsPageConfig } from "./friendsConfig";
export type { GalleryAlbum, GalleryConfig } from "./galleryConfig";
export type { LicenseConfig } from "./licenseConfig";
export type { MusicPlayerConfig } from "./musicConfig";
export type {
	NavBarConfig,
	NavBarLink,
	NavBarSearchConfig,
	NavBarSearchMethod,
} from "./navBarConfig";
export type { Live2DWidgetConfig, SpineModelConfig } from "./pioConfig";
export type { PlantUMLConfig } from "./plantumlConfig";
export type { ProfileConfig } from "./profileConfig";
export type {
	AdConfig,
	CalendarConfig,
	MobileBottomComponentConfig,
	SidebarLayoutConfig,
	SiteInfoConfig,
	WidgetComponentConfig,
	WidgetComponentType,
	WidgetSpecificConfig,
} from "./sidebarConfig";
export type {
	Favicon,
	LIGHT_DARK_MODE,
	SiteConfig,
	WALLPAPER_MODE,
} from "./siteConfig";
export type {
	SponsorConfig,
	SponsorItem,
	SponsorMethod,
} from "./sponsorConfig";

// 响应式图像布局类型
export type ResponsiveImageLayout = "constrained" | "full-width" | "none";

// 图像格式类型
export type ImageFormat = "avif" | "webp" | "png" | "jpg" | "jpeg" | "gif";


// 工具项配置
export type ToolItem = {
	title: string; // 工具名称
	description: string; // 工具描述
	url: string; // 工具链接地址
	icon: string; // 工具图标
	tags?: string[]; // 标签数组
	enabled: boolean; // 是否启用
};

// 工具列表页面配置
export type ToolListPageConfig = {
	title?: string; // 页面标题，留空则使用默认值
	description?: string; // 页面描述，留空则使用默认值
	showSearch?: boolean; // 是否显示搜索框
	showCategoryFilter?: boolean; // 是否显示分类筛选
};
