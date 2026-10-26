import { applyIPv6NodeOptions } from "./ipv6_nodes";
import { CLASH_VERGE_RULES } from "./clash_verge_rules";
import { BUILTIN_DIRECT } from "./constants";
import type { ClashConfig, ProxyGroup, ProxyNode } from "./types";

const PROXY_TEST_URL = "http://www.gstatic.com/generate_204";

const GROUP_NAMES = [
    "Default Proxy",
    "Auto",
    "Express",
    "Google",
    "OpenAI",
    "Claude",
    "SpaceX",
    "Download",
    "US",
    "TW",
    "JP",
    "US Fixed IP",
    "TW Fixed IP",
    "JP Fixed IP",
    "SenseCore Cluster",
];

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function selectGroup(name: string, proxies: string[]): ProxyGroup {
    return {
        name,
        type: "select",
        proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT]),
    };
}

function urlTestGroup(
    name: string,
    proxies: string[],
    interval: number,
    tolerance = 100
): ProxyGroup {
    return {
        name,
        type: "url-test",
        url: PROXY_TEST_URL,
        interval,
        tolerance,
        proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT]),
    };
}

function fallbackGroup(name: string, proxies: string[], interval: number): ProxyGroup {
    return {
        name,
        type: "fallback",
        url: PROXY_TEST_URL,
        interval,
        tolerance: 100,
        proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT]),
    };
}

function buildGroups(proxies: ProxyNode[]): ProxyGroup[] {
    const nodeNames = proxies.map((proxy) => proxy.name).filter(Boolean);
    const nodeSet = new Set(nodeNames);
    const isGroupName = (value: string): boolean => GROUP_NAMES.includes(value);
    const matchingNodes = (pattern: RegExp): string[] =>
        nodeNames.filter((name) => pattern.test(name));
    const captainNodes = matchingNodes(/^(?:新加坡|台湾)-Captain-独享$/i).concat(
        matchingNodes(/^台湾-captain专享$/i)
    );
    const usFixedNodes = matchingNodes(/^US-Fixed-\d+$/);
    const twFixedNodes = matchingNodes(/^TW-Fixed-\d+$/);
    const jpFixedNodes = matchingNodes(/^JP-Fixed-\d+$/);
    const usXNodes = matchingNodes(/^US-X1-\d+$/);
    const twXNodes = matchingNodes(/^TW-X1-\d+$/);
    const jpXNodes = matchingNodes(/^JP-X5-\d+$/);
    const tlsNodes = matchingNodes(/^TLS-T1-\d+$/);

    const autoNodes = matchingNodes(/^Fast-B[12]-\d+$/).concat(
        tlsNodes,
        usFixedNodes,
        twFixedNodes,
        jpFixedNodes
    );
    const expressNodes = matchingNodes(/^Balancer-B1-\d+$/).concat(usXNodes);
    const senseNodes = matchingNodes(/2SLAI/i);

    const usable = (values: string[]): string[] =>
        unique(values).filter(
            (value) => value === BUILTIN_DIRECT || nodeSet.has(value) || isGroupName(value)
        );

    const groups: ProxyGroup[] = [
        urlTestGroup("Auto", autoNodes, 180),
        urlTestGroup("Express", expressNodes, 300),
        urlTestGroup("US", usXNodes, 300),
        urlTestGroup("TW", twXNodes, 300),
        urlTestGroup("JP", jpXNodes, 300),
        fallbackGroup("US Fixed IP", usFixedNodes, 120),
        fallbackGroup("TW Fixed IP", twFixedNodes, 120),
        fallbackGroup("JP Fixed IP", jpFixedNodes, 120),
        selectGroup(
            "Default Proxy",
            usable([
                "Auto",
                "Express",
                "US",
                "TW",
                "JP",
                "US Fixed IP",
                "TW Fixed IP",
                "JP Fixed IP",
                ...tlsNodes,
                ...usFixedNodes,
                ...twFixedNodes,
                ...jpFixedNodes,
                ...usXNodes,
                ...twXNodes,
                ...jpXNodes,
                ...captainNodes,
            ])
        ),
        selectGroup(
            "Google",
            usable([
                "US Fixed IP",
                "TW Fixed IP",
                "JP Fixed IP",
                "US",
                "TW",
                "JP",
                "Auto",
                ...usFixedNodes,
                ...twFixedNodes,
                ...jpFixedNodes,
                ...captainNodes,
            ])
        ),
        selectGroup(
            "OpenAI",
            usable([
                "US Fixed IP",
                "TW Fixed IP",
                "JP Fixed IP",
                "US",
                "TW",
                "JP",
                "Auto",
                ...usFixedNodes,
                ...twFixedNodes,
                ...jpFixedNodes,
                ...captainNodes,
            ])
        ),
        selectGroup(
            "Claude",
            usable([
                "US Fixed IP",
                "TW Fixed IP",
                "JP Fixed IP",
                "US",
                "TW",
                "JP",
                "Auto",
                ...usFixedNodes,
                ...twFixedNodes,
                ...jpFixedNodes,
                ...captainNodes,
            ])
        ),
        selectGroup(
            "SpaceX",
            usable([
                "Default Proxy",
                "US Fixed IP",
                "TW Fixed IP",
                "JP Fixed IP",
                "US",
                "TW",
                "JP",
                "Auto",
                ...usFixedNodes,
                ...twFixedNodes,
                ...jpFixedNodes,
                ...captainNodes,
            ])
        ),
        selectGroup("Download", usable([...usXNodes, BUILTIN_DIRECT, ...captainNodes])),
        selectGroup("SenseCore Cluster", senseNodes),
    ];

    return groups;
}

const CLASH_VERGE_DNS = {
    enable: true,
    ipv6: true,
    "enhanced-mode": "fake-ip" as const,
    "fake-ip-range": "198.18.0.1/16",
    listen: "0.0.0.0:23453",
    "default-nameserver": ["119.29.29.29", "114.114.114.114", "223.5.5.5"],
    nameserver: [
        "119.29.29.29",
        "114.114.114.114",
        "223.5.5.5",
        "https://223.5.5.5/dns-query",
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query",
    ],
    "fake-ip-filter": [
        "*.lan",
        "*.local",
        "+.miwifi.com",
        "+.docker.io",
        "+.market.xiaomi.com",
        "+.push.apple.com",
        "+.zju.edu.cn",
        "+.zju.edu",
        "+.yunazju.fun",
    ],
    "nameserver-policy": {
        "+.zju.edu.cn": "system",
        "+.zju.edu": "system",
        "+.yunazju.fun": "system",
    },
};

export function buildClashVergeConfig(config: ClashConfig): ClashConfig {
    const { proxies, routeExcludeAddress } = applyIPv6NodeOptions({
        proxies: config.proxies,
        ipv6InterfaceName: "",
    });
    const groups = buildGroups(proxies ?? []);

    return {
        ...config,
        proxies,
        mode: "rule",
        ipv6: true,
        "allow-lan": false,
        "log-level": "warning",
        "unified-delay": true,
        profile: { ...(config.profile ?? {}), "store-selected": true },
        dns: CLASH_VERGE_DNS as unknown as ClashConfig["dns"],
        tun: {
            enable: true,
            stack: "gvisor",
            device: "Mihomo_Tun",
            "route-exclude-address": routeExcludeAddress,
            "dns-hijack": ["any:53"],
            mtu: 1420,
            "auto-route": true,
            "strict-route": false,
            "auto-detect-interface": true,
        },
        "proxy-groups": groups,
        rules: [...CLASH_VERGE_RULES],
    };
}
