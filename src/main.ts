/*!
Alex-WU-Gen-9-png 的 SubStore 覆写脚本
https://github.com/Alex-WU-Gen-9-png/override-rules

支持的传入参数：
- profile=clash-verge: 使用当前 Clash Verge 风格的动态策略组和规则覆写；节点从输入配置实时获取
- type: 分流模式，`blacklist` 仅代理 AI/GFW/CDN 黑名单，`whitelist` 使用完整分类分流（默认 blacklist）
- loadbalance: 启用负载均衡（load-balance，默认 false）
- countryselect: 国家/地区节点使用手动选择（默认 true；传 false 时在非负载均衡模式下改用 url-test）
- fallback: 将国家/地区节点组改为故障转移（默认 false；启用后不生成全局「故障转移」组；loadbalance=true 时仍优先使用 load-balance）
- landing: 启用落地节点功能（如机场家宽/星链/落地分组，默认 false）
- ipv6: 启用 IPv6 支持（默认 false）
- ipv6interface/ipv6_interface: IPv6 Only 节点绑定的出站网卡（默认空）
- tun: 启用 TUN 模式（默认 false）
- lan: 启用局域网代理支持（默认 false；透明代理需配合 tun=true）
- dnslisten/dns_listen: lan=true 时的 DNS 监听地址（默认 0.0.0.0:53）
- inboundlan/inbound_lan: 允许 HTTP/SOCKS 入站被局域网访问（默认 true）
- inboundbind/inbound_bind: HTTP/SOCKS 入站绑定地址（默认复用 dnslisten 地址；泛监听时回退到 127.0.0.1）
- inboundauth/inbound_auth: HTTP/SOCKS 入站认证，多个账号用英文逗号分隔（默认空）
- full: 输出完整配置（适合纯内核启动，默认 false）
- keepalive: 启用 tcp-keep-alive（默认 false）
- fakeip: DNS 使用 FakeIP 模式（默认 true；传 false 时为 RedirHost）
- quic: 允许 QUIC 流量（UDP 443，默认 false）
- webrtc: whitelist 模式允许 WebRTC/STUN 按普通规则分流（默认 false；Steam P2P UDP 优先走游戏服务；blacklist 模式不额外代理这些 UDP）
- threshold: 地区节点数量小于该值时不显示分组 (默认 0)
- regex: 使用正则过滤模式（include-all + filter）写入各地区代理组，而非直接枚举节点名称（默认 false）
- panelbind/panel_bind: MetaXD 面板控制地址（仅 full=true 时生效，默认 127.0.0.1）
- panelport: MetaXD 面板控制端口（仅 full=true 时生效，默认 9999）
- panelsecret: MetaXD 面板访问密码（仅 full=true 时生效，默认空）

源码已迁移至 `src/*.ts`。
*/

import { BUILTIN_DIRECT, CDN_URL, PROXY_GROUPS } from "./constants";
import { buildFeatureFlags } from "./args";
import { buildCountryProxyGroups, buildProxyGroups } from "./proxy_groups";
import {
    getCountryGroupNames,
    parseCountries,
    parseLowCost,
    parseNodesByLanding,
    stripNodeSuffix,
} from "./node_parser";
import { applyIPv6NodeOptions } from "./ipv6_nodes";
import { buildRules } from "./rules";
import { ruleProviders } from "./rule_providers";
import { buildDns, snifferConfig } from "./dns";
import { buildTunConfig } from "./tun";
import { buildBaseLists } from "./selectors";
import { buildClashVergeConfig } from "./clash_verge";
import type { ClashConfig, ScriptArgs } from "./types";

const geoxURL = {
    geoip: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat`,
    geosite: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat`,
    mmdb: `${CDN_URL}/gh/Loyalsoldier/geoip@release/Country.mmdb`,
    asn: `${CDN_URL}/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb`,
};

declare const $arguments: ScriptArgs;

function getRawArgs(): ScriptArgs {
    try {
        return $arguments;
    } catch {
        console.log("[Alex-WU-Gen-9-png 的覆写脚本] 未检测到传入参数，使用默认参数。", {});
        return {};
    }
}

const rawArgs = getRawArgs();
const {
    routingType,
    loadBalance,
    countrySelect,
    fallbackEnabled,
    landing,
    ipv6Enabled,
    ipv6InterfaceName,
    fullConfig,
    keepAliveEnabled,
    fakeIPEnabled,
    quicEnabled,
    webRTCEnabled,
    regexFilter,
    tunEnabled,
    lanEnabled,
    dnsListen,
    inboundLanEnabled,
    inboundBindAddress,
    inboundAuth,
    countryThreshold,
    panelBindAddress,
    panelPort,
    panelSecret,
} = buildFeatureFlags(rawArgs);

function main(config: ClashConfig): ClashConfig {
    if (rawArgs.profile?.trim().toLowerCase() === "clash-verge") {
        return buildClashVergeConfig(config);
    }

    const { proxies, routeExcludeAddress } = applyIPv6NodeOptions({
        proxies: config.proxies,
        ipv6InterfaceName,
    });
    const countryInfo = parseCountries(config, landing);
    const lowCostNodes = parseLowCost(config);
    const countryGroupNames = getCountryGroupNames(countryInfo, countryThreshold);
    const countries = stripNodeSuffix(countryGroupNames);

    const { landingNodes, nonLandingNodes } = landing
        ? parseNodesByLanding(config)
        : { landingNodes: [], nonLandingNodes: [] };

    const { defaultSelector, defaultFallback, frontProxySelector } = buildBaseLists({
        landing,
        lowCostNodes,
        countryGroupNames,
        nonLandingNodes,
        regexFilter,
        fallbackEnabled,
    });

    const countryProxyGroups = buildCountryProxyGroups({
        countries,
        landing,
        loadBalance,
        countrySelect,
        fallbackEnabled,
        regexFilter,
        countryInfo,
    });

    const proxyGroups = buildProxyGroups({
        landing,
        regexFilter,
        fallbackEnabled,
        countryProxyGroups,
        lowCostNodes,
        landingNodes,
        defaultSelector,
        defaultFallback,
        frontProxySelector,
    });

    const globalProxies = [...proxyGroups.map((item) => String(item.name)), BUILTIN_DIRECT];
    proxyGroups.push({
        name: PROXY_GROUPS.GLOBAL,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Global.png`,
        "include-all": true,
        type: "select",
        proxies: globalProxies,
    });

    const finalRules = buildRules({ routingType, quicEnabled, webRTCEnabled });
    const profile = {
        ...(fullConfig ? { "store-selected": true } : {}),
        ...(fakeIPEnabled ? { "store-fake-ip": true } : {}),
    };

    return {
        proxies,
        ...(fullConfig && {
            "mixed-port": 7890,
            "redir-port": 7892,
            "tproxy-port": 7893,
            "allow-lan": inboundLanEnabled,
            "bind-address": inboundBindAddress,
            ...(inboundAuth.length > 0 ? { authentication: inboundAuth } : {}),
            ipv6: ipv6Enabled,
            mode: "rule",
            "unified-delay": true,
            "tcp-concurrent": true,
            "find-process-mode": "off",
            "log-level": "info",
            "geodata-loader": "standard",
            "external-controller": `${panelBindAddress}:${panelPort}`,
            "external-ui": "ui",
            "external-ui-name": "xd",
            "external-ui-url":
                "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
            ...(panelSecret && { secret: panelSecret }),
            "disable-keep-alive": !keepAliveEnabled,
        }),
        ...(Object.keys(profile).length > 0 ? { profile } : {}),
        "proxy-groups": proxyGroups,
        "rule-providers": ruleProviders,
        rules: finalRules,
        sniffer: snifferConfig,
        dns: buildDns({ fakeIPEnabled, ipv6Enabled, lanEnabled, dnsListen }),
        tun: buildTunConfig({ tunEnabled, lanEnabled, routeExcludeAddress }),
        "geodata-mode": true,
        "geox-url": geoxURL,
    };
}

(globalThis as Record<string, unknown>).main = main;
