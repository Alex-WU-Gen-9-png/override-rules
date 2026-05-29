import { BUILTIN_DIRECT, CDN_URL, PROXY_GROUPS, SELF_CDN_URL } from "./constants";
import type { RuleProvider, RuleProviderBehavior, RuleProviderFormat } from "./types";

const RULESET_INTERVAL = 86400;
const SUKKA_CLASH_BASE = "https://ruleset.skk.moe/Clash";
const BLACKMATRIX_CLASH_BASE = `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/rule/Clash`;

export type RuleStage =
    | "hardDirect"
    | "guard"
    | "ai"
    | "overseasMedia"
    | "hkMedia"
    | "twMedia"
    | "jpMedia"
    | "krMedia"
    | "domestic"
    | "social"
    | "developer"
    | "productivity"
    | "download"
    | "game"
    | "finance";

export interface RuleCatalogItem {
    name: string;
    provider: RuleProvider;
    target: string;
    stage: RuleStage;
}

function httpProvider({
    behavior,
    format,
    url,
    path,
}: {
    behavior: RuleProviderBehavior;
    format: RuleProviderFormat;
    url: string;
    path: string;
}): RuleProvider {
    return {
        type: "http",
        behavior,
        format,
        interval: RULESET_INTERVAL,
        url,
        path,
    };
}

function selfClassical(name: string): RuleProvider {
    return httpProvider({
        behavior: "classical",
        format: "text",
        url: `${SELF_CDN_URL}/ruleset/${name}.list`,
        path: `./ruleset/${name}.list`,
    });
}

function sukkaRule({
    name,
    directory,
    file,
    behavior,
}: {
    name: string;
    directory: "domainset" | "non_ip" | "ip";
    file: string;
    behavior: RuleProviderBehavior;
}): RuleProvider {
    return httpProvider({
        behavior,
        format: "text",
        url: `${SUKKA_CLASH_BASE}/${directory}/${file}.txt`,
        path: `./ruleset/${name}.txt`,
    });
}

function blackmatrixClassical(
    ruleName: string,
    file = `${ruleName}_No_Resolve.yaml`
): RuleProvider {
    return httpProvider({
        behavior: "classical",
        format: "yaml",
        url: `${BLACKMATRIX_CLASH_BASE}/${ruleName}/${file}`,
        path: `./ruleset/${ruleName}.yaml`,
    });
}

function blackmatrixDomain(ruleName: string, file = `${ruleName}_Domain.txt`): RuleProvider {
    return httpProvider({
        behavior: "domain",
        format: "text",
        url: `${BLACKMATRIX_CLASH_BASE}/${ruleName}/${file}`,
        path: `./ruleset/${ruleName}_Domain.txt`,
    });
}

function catalogItem(
    name: string,
    provider: RuleProvider,
    target: string,
    stage: RuleStage
): RuleCatalogItem {
    return { name, provider, target, stage };
}

function sukkaDomainSet(
    name: string,
    file: string,
    target: string,
    stage: RuleStage
): RuleCatalogItem {
    return catalogItem(
        name,
        sukkaRule({ name, directory: "domainset", file, behavior: "domain" }),
        target,
        stage
    );
}

function sukkaClassical(
    name: string,
    directory: "non_ip" | "ip",
    file: string,
    target: string,
    stage: RuleStage
): RuleCatalogItem {
    return catalogItem(
        name,
        sukkaRule({ name, directory, file, behavior: "classical" }),
        target,
        stage
    );
}

function blackmatrixItem(
    key: string,
    ruleName: string,
    target: string,
    stage: RuleStage,
    file?: string
): RuleCatalogItem {
    return catalogItem(key, blackmatrixClassical(ruleName, file), target, stage);
}

export const ruleCatalog: RuleCatalogItem[] = [
    catalogItem("ZJUInternal", selfClassical("ZJUInternal"), BUILTIN_DIRECT, "hardDirect"),
    catalogItem("ZJU", selfClassical("ZJU"), PROXY_GROUPS.ZJU, "hardDirect"),
    blackmatrixItem("Lan", "Lan", BUILTIN_DIRECT, "hardDirect"),

    catalogItem(
        "ADBlock",
        httpProvider({
            behavior: "domain",
            format: "yaml",
            url: `${CDN_URL}/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.yaml`,
            path: "./ruleset/ADBlock.yaml",
        }),
        PROXY_GROUPS.AD_BLOCK,
        "guard"
    ),
    catalogItem(
        "AdditionalFilter",
        selfClassical("AdditionalFilter"),
        PROXY_GROUPS.AD_BLOCK,
        "guard"
    ),
    catalogItem(
        "AdvertisingLite",
        blackmatrixDomain("AdvertisingLite"),
        PROXY_GROUPS.AD_BLOCK,
        "guard"
    ),
    sukkaClassical("SogouInput", "non_ip", "sogouinput", PROXY_GROUPS.PRIVACY, "guard"),
    blackmatrixItem("BlockHttpDNS", "BlockHttpDNS", PROXY_GROUPS.PRIVACY, "guard"),

    sukkaClassical("SukkaAI", "non_ip", "ai", PROXY_GROUPS.AI_SERVICE, "ai"),
    sukkaClassical(
        "AppleIntelligence",
        "non_ip",
        "apple_intelligence",
        PROXY_GROUPS.AI_SERVICE,
        "ai"
    ),
    blackmatrixItem("OpenAI", "OpenAI", PROXY_GROUPS.AI_SERVICE, "ai"),
    blackmatrixItem("Gemini", "Gemini", PROXY_GROUPS.AI_SERVICE, "ai"),
    blackmatrixItem("Claude", "Claude", PROXY_GROUPS.AI_SERVICE, "ai"),
    blackmatrixItem("Copilot", "Copilot", PROXY_GROUPS.AI_SERVICE, "ai"),
    blackmatrixItem("Civitai", "Civitai", PROXY_GROUPS.AI_SERVICE, "ai"),

    sukkaClassical("StreamUS", "non_ip", "stream_us", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    sukkaClassical("StreamUSIP", "ip", "stream_us", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    sukkaClassical("StreamEU", "non_ip", "stream_eu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    sukkaClassical("StreamEUIP", "ip", "stream_eu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("Netflix", "Netflix", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("YouTube", "YouTube", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("Disney", "Disney", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem(
        "AmazonPrimeVideo",
        "AmazonPrimeVideo",
        PROXY_GROUPS.OVERSEAS_MEDIA,
        "overseasMedia"
    ),
    blackmatrixItem("HBO", "HBO", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("Hulu", "Hulu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("Spotify", "Spotify", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("TikTok", "TikTok", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("Twitch", "Twitch", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("ParamountPlus", "ParamountPlus", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    blackmatrixItem("DAZN", "DAZN", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
    catalogItem("EHentai", selfClassical("EHentai"), PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),

    sukkaClassical("StreamHK", "non_ip", "stream_hk", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
    sukkaClassical("StreamHKIP", "ip", "stream_hk", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
    blackmatrixItem("TVB", "TVB", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
    blackmatrixItem("ViuTV", "ViuTV", PROXY_GROUPS.HK_MEDIA, "hkMedia"),

    sukkaClassical("StreamTW", "non_ip", "stream_tw", PROXY_GROUPS.TW_MEDIA, "twMedia"),
    sukkaClassical("StreamTWIP", "ip", "stream_tw", PROXY_GROUPS.TW_MEDIA, "twMedia"),
    blackmatrixItem("Bahamut", "Bahamut", PROXY_GROUPS.TW_MEDIA, "twMedia"),
    blackmatrixItem("KKTV", "KKTV", PROXY_GROUPS.TW_MEDIA, "twMedia"),
    blackmatrixItem("LiTV", "LiTV", PROXY_GROUPS.TW_MEDIA, "twMedia"),

    sukkaClassical("StreamJP", "non_ip", "stream_jp", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
    sukkaClassical("StreamJPIP", "ip", "stream_jp", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
    blackmatrixItem("AbemaTV", "AbemaTV", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
    blackmatrixItem("Niconico", "Niconico", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
    blackmatrixItem("HuluJP", "HuluJP", PROXY_GROUPS.JP_MEDIA, "jpMedia"),

    sukkaClassical("StreamKR", "non_ip", "stream_kr", PROXY_GROUPS.KR_MEDIA, "krMedia"),
    sukkaClassical("StreamKRIP", "ip", "stream_kr", PROXY_GROUPS.KR_MEDIA, "krMedia"),

    blackmatrixItem("BiliBili", "BiliBili", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    catalogItem("Weibo", selfClassical("Weibo"), PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("XiaoHongShu", "XiaoHongShu", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("DouYin", "DouYin", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("TencentVideo", "TencentVideo", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("iQIYI", "iQIYI", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("Youku", "Youku", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    blackmatrixItem("NetEaseMusic", "NetEaseMusic", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
    catalogItem(
        "GoogleFCM",
        selfClassical("GoogleFCM"),
        PROXY_GROUPS.DOMESTIC_SERVICES,
        "domestic"
    ),
    sukkaClassical("AppleCN", "non_ip", "apple_cn", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),

    blackmatrixItem("Telegram", "Telegram", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Twitter", "Twitter", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Facebook", "Facebook", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Instagram", "Instagram", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Threads", "Threads", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Reddit", "Reddit", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Discord", "Discord", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Whatsapp", "Whatsapp", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("Line", "Line", PROXY_GROUPS.SOCIAL, "social"),
    blackmatrixItem("TruthSocial", "TruthSocial", PROXY_GROUPS.SOCIAL, "social"),

    blackmatrixItem("GitHub", "GitHub", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("GitLab", "GitLab", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Developer", "Developer", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Docker", "Docker", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Npmjs", "Npmjs", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Python", "Python", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Jetbrains", "Jetbrains", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Vercel", "Vercel", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("Cloudflare", "Cloudflare", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("HashiCorp", "HashiCorp", PROXY_GROUPS.DEVELOPER, "developer"),
    blackmatrixItem("SourceForge", "SourceForge", PROXY_GROUPS.DEVELOPER, "developer"),

    sukkaClassical("Microsoft", "non_ip", "microsoft", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    sukkaClassical(
        "AppleServices",
        "non_ip",
        "apple_services",
        PROXY_GROUPS.PRODUCTIVITY,
        "productivity"
    ),
    sukkaClassical(
        "AppleServicesIP",
        "ip",
        "apple_services",
        PROXY_GROUPS.PRODUCTIVITY,
        "productivity"
    ),
    blackmatrixItem("OneDrive", "OneDrive", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    blackmatrixItem("GoogleDrive", "GoogleDrive", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    blackmatrixItem("Dropbox", "Dropbox", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    blackmatrixItem("Notion", "Notion", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    blackmatrixItem("Slack", "Slack", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
    blackmatrixItem("Teams", "Teams", PROXY_GROUPS.PRODUCTIVITY, "productivity"),

    sukkaDomainSet("StaticResources", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaClassical("CDNResources", "non_ip", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaClassical("CDNResourcesIP", "ip", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaDomainSet("DownloadDomain", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaDomainSet("GameDownloadDomain", "game-download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaClassical("DownloadNonIP", "non_ip", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    sukkaClassical("DownloadIP", "ip", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    blackmatrixItem("Download", "Download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
    catalogItem(
        "AdditionalCDNResources",
        selfClassical("AdditionalCDNResources"),
        PROXY_GROUPS.DOWNLOAD_STATIC,
        "download"
    ),
    catalogItem("SteamFix", selfClassical("SteamFix"), PROXY_GROUPS.DOWNLOAD_STATIC, "download"),

    blackmatrixItem("Steam", "Steam", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("SteamCN", "SteamCN", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Xbox", "Xbox", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("PlayStation", "PlayStation", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Nintendo", "Nintendo", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Epic", "Epic", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Blizzard", "Blizzard", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("EA", "EA", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Riot", "Riot", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("Ubisoft", "Ubisoft", PROXY_GROUPS.GAME, "game"),
    blackmatrixItem("HoYoverse", "HoYoverse", PROXY_GROUPS.GAME, "game"),

    catalogItem("Crypto", selfClassical("Crypto"), PROXY_GROUPS.FINANCE, "finance"),
    blackmatrixItem("Binance", "Binance", PROXY_GROUPS.FINANCE, "finance"),
    blackmatrixItem("OKX", "OKX", PROXY_GROUPS.FINANCE, "finance"),
    blackmatrixItem("PayPal", "PayPal", PROXY_GROUPS.FINANCE, "finance"),
    blackmatrixItem("Stripe", "Stripe", PROXY_GROUPS.FINANCE, "finance"),
];
