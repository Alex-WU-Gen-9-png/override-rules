import {
    LANDING_NODE_MATCHER,
    NODE_SUFFIX,
    LOW_COST_NODE_MATCHER,
    countriesMeta,
} from "./constants";
import type { ClashConfig, CountryInfoItem } from "./types";

const COUNTRY_CODE_ALIASES: Record<string, string[]> = {
    香港: ["HK", "HKG"],
    澳门: ["MO"],
    台湾: ["TW", "TWN", "TPE", "ROC"],
    新加坡: ["SG", "SIN"],
    日本: ["JP", "JPN", "NRT", "HND", "KIX", "TYO", "OSA"],
    韩国: ["KR", "KOR", "ICN"],
    美国: [
        "US",
        "USA",
        "JFK",
        "EWR",
        "IAD",
        "ATL",
        "ORD",
        "MIA",
        "NYC",
        "LAX",
        "SFO",
        "SEA",
        "DFW",
        "SJC",
    ],
    加拿大: ["CA", "CAN", "YVR", "YYZ", "YUL"],
    英国: ["UK", "GB", "GBR", "LHR", "MAN"],
    澳大利亚: ["AU"],
    德国: ["DE", "DEU", "MUC"],
    法国: ["FR", "FRA", "CDG", "MRS"],
    俄罗斯: ["RU"],
    泰国: ["TH"],
    印度: ["IN"],
    马来西亚: ["MY"],
    阿根廷: ["AR", "EZE"],
    芬兰: ["FI", "HEL"],
    埃及: ["EG", "CAI"],
    菲律宾: ["PH", "MNL"],
    土耳其: ["TR", "IST"],
    乌克兰: ["UA", "KBP"],
};

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCodeRegex(codes: string[]): RegExp {
    const codePattern = codes.map(escapeRegex).join("|");
    return new RegExp(
        String.raw`(?:^|[^A-Za-z0-9])(?:${codePattern})(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?(?=$|[^A-Za-z0-9])`,
        "i"
    );
}

function buildFlagRegex(pattern: string): RegExp | null {
    const flags = Array.from(new Set(pattern.match(/\p{Regional_Indicator}{2}/gu) ?? []));
    if (flags.length === 0) return null;

    return new RegExp(flags.map(escapeRegex).join("|"), "u");
}

const COUNTRY_MATCHERS = Object.entries(countriesMeta).map(([country, meta]) => ({
    country,
    flagRegex: buildFlagRegex(meta.pattern),
    codeRegex: COUNTRY_CODE_ALIASES[country] ? buildCodeRegex(COUNTRY_CODE_ALIASES[country]) : null,
    fallbackRegex: new RegExp(meta.pattern.replace(/^\(\?i\)/, "")),
}));

function resolveCountryByPriority(name: string): string | null {
    for (const { country, flagRegex } of COUNTRY_MATCHERS) {
        if (!flagRegex?.test(name)) continue;
        return country;
    }

    for (const { country, codeRegex } of COUNTRY_MATCHERS) {
        if (!codeRegex?.test(name)) continue;
        return country;
    }

    for (const { country, fallbackRegex } of COUNTRY_MATCHERS) {
        if (!fallbackRegex.test(name)) continue;
        return country;
    }

    return null;
}

/**
 * 从 Clash 配置中筛选出所有低价节点的名称。
 * @param config - 当前的 Clash 配置对象，需包含 `proxies` 字段
 * @returns 匹配低价节点正则的节点名称数组
 */
export function parseLowCost(config: ClashConfig): string[] {
    return (config.proxies || [])
        .filter((proxy) => LOW_COST_NODE_MATCHER.regex.test(proxy.name || ""))
        .map((proxy) => proxy.name)
        .filter((name): name is string => Boolean(name));
}

/**
 * 将订阅中的所有节点按是否为落地节点进行分类。
 * @param config - 当前的 Clash 配置对象，需包含 `proxies` 字段
 * @returns 包含 `landingNodes`（落地节点名称列表）和 `nonLandingNodes`（非落地节点名称列表）的对象
 */
export function parseNodesByLanding(config: ClashConfig): {
    landingNodes: string[];
    nonLandingNodes: string[];
} {
    const landingNodes: string[] = [];
    const nonLandingNodes: string[] = [];

    for (const proxy of config.proxies || []) {
        const name = proxy.name;
        if (!name) continue;

        if (LANDING_NODE_MATCHER.regex.test(name)) {
            landingNodes.push(name);
            continue;
        }

        nonLandingNodes.push(name);
    }

    return { landingNodes, nonLandingNodes };
}

/**
 * 遍历订阅中的所有节点，按 `countriesMeta` 中定义的地区进行归类。
 * @param config - 当前的 Clash 配置对象，需包含 `proxies` 字段
 * @param landing - 是否启用落地节点模式；为 `true` 时将跳过落地节点，默认为 `false`
 * @returns 按地区归类后的节点信息数组，每项包含 `country`（地区名）和 `nodes`（节点名称列表）
 */
export function parseCountries(config: ClashConfig, landing = false): CountryInfoItem[] {
    const proxies = config.proxies || [];
    const countryNodes: Record<string, string[]> = Object.create(null);

    for (const proxy of proxies) {
        const name = proxy.name || "";

        if (landing && LANDING_NODE_MATCHER.regex.test(name)) continue;

        const country = resolveCountryByPriority(name);
        if (!country) continue;

        if (!countryNodes[country]) {
            countryNodes[country] = [];
        }
        countryNodes[country].push(name);
    }

    return Object.entries(countryNodes).map(([country, nodes]) => ({ country, nodes }));
}

/**
 * 根据最小节点数量阈值过滤地区，并按权重排序后返回带后缀的地区分组名称列表。
 * @param countryInfo - 由 `parseCountries` 返回的地区节点信息数组
 * @param minCount - 地区节点数量的最小阈值，节点数不足该值的地区将被过滤掉
 * @returns 按权重升序排列、附加了节点后缀（`NODE_SUFFIX`）的地区分组名称数组
 */
export function getCountryGroupNames(countryInfo: CountryInfoItem[], minCount: number): string[] {
    const filtered = countryInfo.filter((item) => item.nodes.length >= minCount);

    filtered.sort((a, b) => {
        const wa = countriesMeta[a.country]?.weight ?? Infinity;
        const wb = countriesMeta[b.country]?.weight ?? Infinity;
        return wa - wb;
    });

    return filtered.map((item) => item.country + NODE_SUFFIX);
}

/**
 * 移除分组名称末尾的节点后缀（`NODE_SUFFIX`），还原为纯地区名称。
 * @param groupNames - 带节点后缀的分组名称数组，通常来自 `getCountryGroupNames`
 * @returns 去除后缀后的地区名称数组
 */
export function stripNodeSuffix(groupNames: string[]): string[] {
    const suffixPattern = new RegExp(`${NODE_SUFFIX}$`);
    return groupNames.map((name) => name.replace(suffixPattern, ""));
}
