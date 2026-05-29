import { BUILTIN_DIRECT, BUILTIN_REJECT, PROXY_GROUPS } from "./constants";
import { ruleCatalog, type RuleStage } from "./rule_catalog";

const WEBRTC_STUN_UDP_PORTS = [
    3478, 3479, 5349, 5350, 19302, 19303, 19304, 19305, 19306, 19307, 19308, 19309,
];

const WEBRTC_STUN_PROXY_RULES = [
    `AND,((DOMAIN-KEYWORD,stun),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`,
    ...WEBRTC_STUN_UDP_PORTS.map(
        (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`
    ),
];

const ALIYUN_DOMESTIC_RULES = [
    `DOMAIN-SUFFIX,intl.aliyun.com,${BUILTIN_REJECT}`,
    `DOMAIN,www.alibabacloud.com,${BUILTIN_REJECT}`,
    `DOMAIN-SUFFIX,aliyun.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,aliyuncs.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,aliyun-inc.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,dingtalk.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,aliwork.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,alicdn.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,alyasset.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,alcasset.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,alipay.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,alipayobjects.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,mmstat.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN-SUFFIX,aliapp.org,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `DOMAIN,fourier.taobao.com,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
];

function buildRuleSetRules(stage: RuleStage): string[] {
    return ruleCatalog
        .filter((item) => item.stage === stage)
        .map((item) => `RULE-SET,${item.name},${item.target}`);
}

const CORE_DIRECT_RULES = [
    `DST-PORT,22,${PROXY_GROUPS.SSH}`,
    `GEOSITE,private,${BUILTIN_DIRECT}`,
    `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
    `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
    ...buildRuleSetRules("hardDirect"),
];

const DOMESTIC_PLATFORM_RULES = [
    ...ALIYUN_DOMESTIC_RULES,
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

const ASIA_MEDIA_RULES = [`GEOSITE,bahamut,${PROXY_GROUPS.ASIA_MEDIA}`];

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

const FALLBACK_RULES = [
    `GEOSITE,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
    `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES},no-resolve`,
    `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
    `MATCH,${PROXY_GROUPS.SELECT}`,
];

const baseRules = [
    ...CORE_DIRECT_RULES,
    ...buildRuleSetRules("guard"),
    ...buildRuleSetRules("ai"),
    ...AI_RULES,
    ...buildRuleSetRules("overseasMedia"),
    ...OVERSEAS_MEDIA_RULES,
    ...buildRuleSetRules("asiaMedia"),
    ...ASIA_MEDIA_RULES,
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

/**
 * 构建最终的规则列表。
 *
 * @param {Object} params - 构建参数
 * @param {boolean} params.quicEnabled - 是否启用 QUIC（如未启用会插入 UDP:443 拦截规则）
 * @param {boolean} params.webRTCEnabled - 是否启用 WebRTC/STUN 按普通规则分流（如未启用会把常见 STUN/TURN UDP 流量强制分流到代理）
 * @returns {string[]} 规则字符串数组
 */
export function buildRules({
    quicEnabled,
    webRTCEnabled,
}: {
    quicEnabled: boolean;
    webRTCEnabled: boolean;
}): string[] {
    const ruleList: string[] = [];
    if (!webRTCEnabled) {
        ruleList.push(...WEBRTC_STUN_PROXY_RULES);
    }
    if (!quicEnabled) {
        ruleList.push(`AND,((DST-PORT,443),(NETWORK,UDP)),${BUILTIN_REJECT}`);
    }
    return [...ruleList, ...baseRules];
}
