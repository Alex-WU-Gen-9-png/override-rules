import { BUILTIN_DIRECT, BUILTIN_REJECT, PROXY_GROUPS } from "./constants";
import { ruleCatalog, type RuleStage } from "./rule_catalog";
import type { RoutingType } from "./types";

const WEBRTC_STUN_UDP_PORTS = [
    3478, 3479, 5349, 5350, 19302, 19303, 19304, 19305, 19306, 19307, 19308, 19309,
];

const NTP_UDP_DIRECT_RULE = `AND,((DST-PORT,123),(NETWORK,UDP)),${BUILTIN_DIRECT}`;
const AGENTFN_DIRECT_RULE = `DOMAIN-SUFFIX,agentfn.io-vii.com,${BUILTIN_DIRECT}`;

const STEAM_P2P_UDP_PORTS = [
    3478, 4379, 4380, 27014, 27015, 27016, 27017, 27018, 27019, 27020, 27021, 27022, 27023, 27024,
    27025, 27026, 27027, 27028, 27029, 27030,
];

const WEBRTC_STUN_PROXY_RULES = [
    `AND,((DOMAIN-KEYWORD,stun),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`,
    ...WEBRTC_STUN_UDP_PORTS.map(
        (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`
    ),
];

const STEAM_P2P_UDP_RULES = STEAM_P2P_UDP_PORTS.map(
    (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.GAME}`
);

function buildRuleSetRules(stage: RuleStage): string[] {
    return ruleCatalog
        .filter((item) => item.stage === stage)
        .map((item) => `RULE-SET,${item.name},${item.target}`);
}

const CORE_DIRECT_RULES = [
    `GEOSITE,private,${BUILTIN_DIRECT}`,
    `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
    AGENTFN_DIRECT_RULE,
    `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
    ...buildRuleSetRules("hardDirect"),
];

const DOMESTIC_BASE_RULES = [
    `GEOSITE,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES},no-resolve`,
];

const DOMESTIC_PLATFORM_RULES = [
    `GEOSITE,google-play@cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `GEOSITE,microsoft@cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
];

const AI_RULES = [`GEOSITE,category-ai-!cn,${PROXY_GROUPS.AI_SERVICE}`];

const OVERSEAS_MEDIA_RULES = [
    `GEOSITE,youtube,${PROXY_GROUPS.OVERSEAS_MEDIA}`,
    `GEOSITE,netflix,${PROXY_GROUPS.OVERSEAS_MEDIA}`,
    `GEOIP,netflix,${PROXY_GROUPS.OVERSEAS_MEDIA},no-resolve`,
    `GEOSITE,spotify,${PROXY_GROUPS.OVERSEAS_MEDIA}`,
];

const TW_MEDIA_RULES = [`GEOSITE,bahamut,${PROXY_GROUPS.TW_MEDIA}`];

const DOMESTIC_SERVICE_RULES = [`GEOSITE,bilibili,${PROXY_GROUPS.DOMESTIC_SERVICES}`];

const SOCIAL_RULES = [
    `GEOSITE,telegram,${PROXY_GROUPS.SOCIAL}`,
    `GEOIP,telegram,${PROXY_GROUPS.SOCIAL},no-resolve`,
    `GEOSITE,twitter,${PROXY_GROUPS.SOCIAL}`,
];

const DEVELOPER_RULES = [`GEOSITE,github,${PROXY_GROUPS.DEVELOPER}`];

const PRODUCTIVITY_RULES = [
    `GEOSITE,apple,${PROXY_GROUPS.PRODUCTIVITY}`,
    `GEOSITE,microsoft,${PROXY_GROUPS.PRODUCTIVITY}`,
    `GEOSITE,google,${PROXY_GROUPS.PRODUCTIVITY}`,
];

const DOWNLOAD_RULES = [`GEOSITE,pikpak,${PROXY_GROUPS.DOWNLOAD_STATIC}`];

const GAME_RULES = [`GEOSITE,xbox,${PROXY_GROUPS.GAME}`];

// 仅在显式分类之后解析未分类域名，补上嗅探/FakeIP 场景中缺失的国内目标 IP。
// 前置 CN 规则继续使用 no-resolve，避免提前解析改变 AI、媒体、CDN 等分类结果。
const FALLBACK_RULES = [
    `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
    `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `MATCH,${PROXY_GROUPS.SELECT}`,
];

const WHITELIST_RULES = [
    ...CORE_DIRECT_RULES,
    ...DOMESTIC_BASE_RULES,
    ...buildRuleSetRules("guard"),
    ...buildRuleSetRules("ai"),
    ...AI_RULES,
    ...buildRuleSetRules("overseasMedia"),
    ...OVERSEAS_MEDIA_RULES,
    ...buildRuleSetRules("hkMedia"),
    ...buildRuleSetRules("twMedia"),
    ...TW_MEDIA_RULES,
    ...buildRuleSetRules("jpMedia"),
    ...buildRuleSetRules("krMedia"),
    ...DOMESTIC_PLATFORM_RULES,
    ...buildRuleSetRules("domestic"),
    ...DOMESTIC_SERVICE_RULES,
    ...buildRuleSetRules("social"),
    ...SOCIAL_RULES,
    ...buildRuleSetRules("developer"),
    ...DEVELOPER_RULES,
    ...buildRuleSetRules("productivity"),
    ...PRODUCTIVITY_RULES,
    ...buildRuleSetRules("download"),
    ...DOWNLOAD_RULES,
    ...buildRuleSetRules("game"),
    ...GAME_RULES,
    ...buildRuleSetRules("finance"),
    ...FALLBACK_RULES,
];

const BLACKLIST_DIRECT_RULES = [
    `GEOSITE,private,${BUILTIN_DIRECT}`,
    `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
    AGENTFN_DIRECT_RULE,
    `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
    `RULE-SET,ZJUInternal,${BUILTIN_DIRECT}`,
    `RULE-SET,ZJU,${BUILTIN_DIRECT}`,
    `RULE-SET,Lan,${BUILTIN_DIRECT}`,
    `GEOSITE,cn,${BUILTIN_DIRECT}`,
    `GEOIP,cn,${BUILTIN_DIRECT},no-resolve`,
];

const REGIONAL_ROUTING_RULES = [
    ...buildRuleSetRules("overseasMedia"),
    ...OVERSEAS_MEDIA_RULES,
    ...buildRuleSetRules("hkMedia"),
    ...buildRuleSetRules("twMedia"),
    ...TW_MEDIA_RULES,
    ...buildRuleSetRules("jpMedia"),
    ...buildRuleSetRules("krMedia"),
];

const BLACKLIST_PROXY_RULES = [
    ...AI_RULES,
    `RULE-SET,StaticResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
    `RULE-SET,CDNResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
    `RULE-SET,CDNResourcesIP,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
    `RULE-SET,AdditionalCDNResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
    ...REGIONAL_ROUTING_RULES,
    `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
    `GEOIP,cn,${BUILTIN_DIRECT}`,
    `MATCH,${BUILTIN_DIRECT}`,
];

const BLACKLIST_RULES = [...BLACKLIST_DIRECT_RULES, ...BLACKLIST_PROXY_RULES];

/**
 * 构建最终的规则列表。
 *
 * @param {Object} params - 构建参数
 * @param {RoutingType} params.routingType - blacklist 仅代理黑名单，whitelist 使用完整分类分流
 * @param {boolean} params.quicEnabled - 是否启用 QUIC（如未启用会插入 UDP:443 拦截规则）
 * @param {boolean} params.webRTCEnabled - whitelist 模式是否启用 WebRTC/STUN 按普通规则分流（NTP UDP 会直连，Steam P2P UDP 会优先进入游戏服务）
 * @returns {string[]} 规则字符串数组
 */
export function buildRules({
    routingType,
    quicEnabled,
    webRTCEnabled,
}: {
    routingType: RoutingType;
    quicEnabled: boolean;
    webRTCEnabled: boolean;
}): string[] {
    const ruleList: string[] = [NTP_UDP_DIRECT_RULE];
    if (!quicEnabled) {
        ruleList.push(`AND,((DST-PORT,443),(NETWORK,UDP)),${BUILTIN_REJECT}`);
    }
    if (routingType === "whitelist") {
        ruleList.push(...STEAM_P2P_UDP_RULES);
        if (!webRTCEnabled) {
            ruleList.push(...WEBRTC_STUN_PROXY_RULES);
        }
    }
    return [...ruleList, ...(routingType === "blacklist" ? BLACKLIST_RULES : WHITELIST_RULES)];
}
