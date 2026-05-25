import type { DnsConfig, SnifferConfig } from "./types";

const REMOTE_DNS_SERVERS = ["tcp://1.1.1.1:53", "tcp://8.8.8.8:53"] as const;

/**
 * 默认的 fake-ip 过滤域名列表。
 * 这些域名不会被 fake-ip 机制代理。
 */
const FAKE_IP_FILTER = [
    "geosite:private",
    "geosite:connectivity-check",
    "geosite:cn",
    "+.zju.edu.cn",
    "Mijia Cloud",
    "dlg.io.mi.com",
    "localhost.ptlogin2.qq.com",
    "+.icloud.com",
    "+.push.apple.com",
];

/**
 * 嗅探器配置。
 */
export const snifferConfig: SnifferConfig = {
    sniff: {
        TLS: {
            ports: [443, 8443],
        },
        HTTP: {
            ports: [80, "8080-8880"],
            "override-destination": true,
        },
        QUIC: {
            ports: [443, 8443],
        },
    },
    "override-destination": false,
    enable: true,
    "force-dns-mapping": true,
    "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"],
};

/**
 * 构建 DNS 配置的输入参数类型。
 */
interface BuildDnsConfigInput {
    mode: "redir-host" | "fake-ip";
    ipv6Enabled: boolean;
    fakeIpFilter?: string[];
}

/**
 * 构建 Clash DNS 配置对象。
 * @param {BuildDnsConfigInput} params - 构建参数
 * @param {('redir-host'|'fake-ip')} params.mode - DNS 增强模式
 * @param {string[]=} params.fakeIpFilter - fake-ip 过滤域名列表（可选）
 * @returns {DnsConfig} DNS 配置对象
 */
function buildDnsConfig({ mode, ipv6Enabled, fakeIpFilter }: BuildDnsConfigInput): DnsConfig {
    const config: DnsConfig = {
        enable: true,
        ipv6: ipv6Enabled,
        // Mihomo docs explicitly discourage combining prefer-h3 with respect-rules.
        "prefer-h3": false,
        "respect-rules": true,
        "enhanced-mode": mode,
        "proxy-server-nameserver": [...REMOTE_DNS_SERVERS],
        "default-nameserver": [...REMOTE_DNS_SERVERS],
        nameserver: [...REMOTE_DNS_SERVERS],
        fallback: ["tcp://1.0.0.1:53", "tcp://8.8.4.4:53", "tls://1.1.1.1:853"],
        "nameserver-policy": {
            "*.zju.edu.cn": "system",
            "+.zju.edu.cn": "10.10.0.21",
        },
    };

    if (fakeIpFilter) {
        config["fake-ip-range"] = "198.18.0.1/16";
        config["fake-ip-range6"] = "fd88:413:626:821::/64";
        config["fake-ip-filter"] = fakeIpFilter;
    }

    return config;
}

/**
 * 构建 DNS 配置的输入参数类型（外部接口）。
 */
export interface BuildDnsInput {
    fakeIPEnabled: boolean;
    ipv6Enabled: boolean;
}

/**
 * 根据 fakeIP 和 IPv6 开关生成最终 DNS 配置。
 * @param {BuildDnsInput} params - 构建参数
 * @param {boolean} params.fakeIPEnabled - 是否启用 fake-ip 模式
 * @returns {DnsConfig} DNS 配置对象
 */
export function buildDns({ fakeIPEnabled, ipv6Enabled }: BuildDnsInput): DnsConfig {
    if (fakeIPEnabled) {
        return buildDnsConfig({
            mode: "fake-ip",
            ipv6Enabled,
            fakeIpFilter: FAKE_IP_FILTER,
        });
    }
    return buildDnsConfig({ mode: "redir-host", ipv6Enabled });
}
