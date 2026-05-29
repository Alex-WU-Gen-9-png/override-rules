import {
    BUILTIN_DIRECT,
    BUILTIN_REJECT,
    BUILTIN_REJECT_DROP,
    CDN_URL,
    LANDING_NODE_MATCHER,
    LOW_COST_NODE_MATCHER,
    NODE_SUFFIX,
    PROXY_GROUPS,
    countriesMeta,
} from "./constants";
import type {
    BuildCountryProxyGroupsInput,
    BuildProxyGroupsInput,
    CountryInfoItem,
    ProxyGroup,
} from "./types";
import { buildList, isNotNull } from "./utils";

const PROXY_TEST_URL = "http://cp.cloudflare.com/generate_204";

/**
 * 为每个地区生成对应的代理组配置。
 * @param input - 构建地区代理组所需的输入参数
 * @param input.countries - 需要生成代理组的地区名称列表（不含后缀）
 * @param input.landing - 是否启用落地节点模式；启用时将排除落地节点
 * @param input.loadBalance - 是否使用负载均衡模式（`load-balance`），优先级高于手动选择
 * @param input.countrySelect - 是否使用手动选择模式（`select`），未启用负载均衡时生效
 * @param input.regexFilter - 是否使用正则过滤模式（`include-all` + `filter`）
 * @param input.countryInfo - 地区节点信息数组，用于非正则模式下直接枚举节点名称
 * @returns 生成的地区代理组配置数组
 */
export function buildCountryProxyGroups({
    countries,
    landing,
    loadBalance,
    countrySelect,
    regexFilter,
    countryInfo,
}: BuildCountryProxyGroupsInput): ProxyGroup[] {
    const groups: ProxyGroup[] = [];

    const nodesByCountry: Record<string, string[]> | null = !regexFilter
        ? Object.fromEntries(countryInfo.map((item: CountryInfoItem) => [item.country, item.nodes]))
        : null;

    for (const country of countries) {
        const meta = countriesMeta[country];
        if (!meta) continue;

        const baseFields = {
            name: `${country}${NODE_SUFFIX}`,
            icon: meta.icon,
        };

        let groupConfig: ProxyGroup;

        if (loadBalance) {
            const testFields = {
                url: PROXY_TEST_URL,
                interval: 60,
                tolerance: 20,
            };

            if (!regexFilter) {
                const nodeNames = nodesByCountry?.[country] ?? [];
                groupConfig = {
                    ...baseFields,
                    ...testFields,
                    type: "load-balance",
                    strategy: "sticky-sessions",
                    proxies: nodeNames,
                };
            } else {
                groupConfig = {
                    ...baseFields,
                    ...testFields,
                    type: "load-balance",
                    strategy: "sticky-sessions",
                    "include-all": true,
                    filter: meta.pattern,
                    ...(landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}),
                };
            }
        } else if (countrySelect) {
            if (!regexFilter) {
                const nodeNames = nodesByCountry?.[country] ?? [];
                groupConfig = {
                    ...baseFields,
                    type: "select",
                    proxies: nodeNames,
                };
            } else {
                groupConfig = {
                    ...baseFields,
                    type: "select",
                    "include-all": true,
                    filter: meta.pattern,
                    ...(landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}),
                };
            }
        } else {
            const testFields = {
                url: PROXY_TEST_URL,
                interval: 60,
                tolerance: 20,
            };

            if (!regexFilter) {
                const nodeNames = nodesByCountry?.[country] ?? [];
                groupConfig = {
                    ...baseFields,
                    ...testFields,
                    type: "url-test",
                    proxies: nodeNames,
                };
            } else {
                groupConfig = {
                    ...baseFields,
                    ...testFields,
                    type: "url-test",
                    "include-all": true,
                    filter: meta.pattern,
                    ...(landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}),
                };
            }
        }

        groups.push(groupConfig);
    }

    return groups;
}

export function buildProxyGroups({
    landing,
    regexFilter,
    countryProxyGroups,
    lowCostNodes,
    landingNodes,
    defaultSelector,
    defaultFallback,
    frontProxySelector,
}: BuildProxyGroupsInput): ProxyGroup[] {
    const regionalProxyGroups = countryProxyGroups.map((group) => group.name);
    const hasLowCost = lowCostNodes.length > 0 || regexFilter;
    const lowCostGroup = hasLowCost ? PROXY_GROUPS.LOW_COST : false;
    const proxyGroupProxies = buildList(
        PROXY_GROUPS.SELECT,
        landing && PROXY_GROUPS.LANDING,
        regionalProxyGroups,
        lowCostGroup,
        PROXY_GROUPS.MANUAL,
        BUILTIN_DIRECT
    );
    const domesticGroupProxies = buildList(
        BUILTIN_DIRECT,
        PROXY_GROUPS.SELECT,
        landing && PROXY_GROUPS.LANDING,
        regionalProxyGroups,
        lowCostGroup,
        PROXY_GROUPS.MANUAL
    );
    const rejectGroupProxies = [BUILTIN_REJECT, BUILTIN_REJECT_DROP, BUILTIN_DIRECT];

    const groups: Array<ProxyGroup | null> = [
        {
            name: PROXY_GROUPS.SELECT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
            type: "select",
            proxies: defaultSelector,
        },
        {
            name: PROXY_GROUPS.MANUAL,
            icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
            "include-all": true,
            type: "select",
        },
        landing
            ? {
                  name: PROXY_GROUPS.FRONT_PROXY,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
                  type: "select",
                  ...(regexFilter
                      ? {
                            "include-all": true,
                            "exclude-filter": LANDING_NODE_MATCHER.pattern,
                            proxies: frontProxySelector,
                        }
                      : { proxies: frontProxySelector }),
              }
            : null,
        landing
            ? {
                  name: PROXY_GROUPS.LANDING,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
                  type: "select",
                  ...(regexFilter
                      ? { "include-all": true, filter: LANDING_NODE_MATCHER.pattern }
                      : { proxies: landingNodes }),
              }
            : null,
        {
            name: PROXY_GROUPS.AD_BLOCK,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/adblock.png`,
            type: "select",
            proxies: rejectGroupProxies,
        },
        {
            name: PROXY_GROUPS.PRIVACY,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lock.png`,
            type: "select",
            proxies: rejectGroupProxies,
        },
        {
            name: PROXY_GROUPS.AI_SERVICE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.OVERSEAS_MEDIA,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/streaming.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.ASIA_MEDIA,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/streamingcn.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.DOMESTIC_SERVICES,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/china.png`,
            type: "select",
            proxies: domesticGroupProxies,
        },
        {
            name: PROXY_GROUPS.SOCIAL,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/telegram.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.DEVELOPER,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/github.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.PRODUCTIVITY,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/microsoft.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.DOWNLOAD_STATIC,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/static.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.GAME,
            icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/game.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.FINANCE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_1.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.ZJU,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bookpedia.png`,
            type: "select",
            proxies: [BUILTIN_DIRECT, PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL],
        },
        {
            name: PROXY_GROUPS.SSH,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Server.png`,
            type: "select",
            proxies: proxyGroupProxies,
        },
        {
            name: PROXY_GROUPS.AUTO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
            type: "url-test",
            url: PROXY_TEST_URL,
            proxies: defaultFallback,
            interval: 60,
            tolerance: 20,
        },
        {
            name: PROXY_GROUPS.FALLBACK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
            type: "fallback",
            url: PROXY_TEST_URL,
            proxies: defaultFallback,
            interval: 60,
            tolerance: 20,
        },
        hasLowCost
            ? {
                  name: PROXY_GROUPS.LOW_COST,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
                  type: "url-test",
                  url: PROXY_TEST_URL,
                  interval: 60,
                  tolerance: 20,
                  ...(!regexFilter
                      ? { proxies: lowCostNodes }
                      : { "include-all": true, filter: LOW_COST_NODE_MATCHER.pattern }),
              }
            : null,
        ...countryProxyGroups,
    ];

    return groups.filter(isNotNull);
}
