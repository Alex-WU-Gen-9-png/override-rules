import type { DnsConfig, SnifferConfig } from "./types";

const LOCAL_DOMAIN_FAKE_IP_FILTER = [
    "+.lan",
    "+.local",
    "+.localdomain",
    "+.home",
    "+.home.arpa",
    "+.internal",
];

const NTP_FAKE_IP_FILTER = [
    "+.ntp.org",
    "+.ntp.org.cn",
    "ntp.aliyun.com",
    "ntp1.aliyun.com",
    "ntp2.aliyun.com",
    "ntp3.aliyun.com",
    "ntp4.aliyun.com",
    "ntp5.aliyun.com",
    "ntp6.aliyun.com",
    "ntp7.aliyun.com",
    "ntp.tencent.com",
    "ntp.ubuntu.com",
    "ntp.msn.cn",
    "ntp.msn.com",
    "ntp.ntsc.ac.cn",
    "ntp.zju.edu.cn",
    "time.apple.com",
    "time.cloudflare.com",
    "time.google.com",
    "time.microsoft.com",
    "time.nist.gov",
    "time.windows.com",
    "time1.cloud.tencent.com",
    "time2.cloud.tencent.com",
    "time3.cloud.tencent.com",
    "time4.cloud.tencent.com",
    "time5.cloud.tencent.com",
];

/**
 * 基础 fake-ip 过滤域名列表。
 * 这些域名不会被 fake-ip 机制代理。
 */
const BASE_FAKE_IP_FILTER = [
    "geosite:private",
    "geosite:connectivity-check",
    ...LOCAL_DOMAIN_FAKE_IP_FILTER,
    ...NTP_FAKE_IP_FILTER,
    "Mijia Cloud",
    "dlg.io.mi.com",
    "localhost.ptlogin2.qq.com",
    "+.icloud.com",
    "+.push.apple.com",
];

const LAN_COMPAT_FAKE_IP_FILTER = ["geosite:cn", "+.zju.edu.cn", ...BASE_FAKE_IP_FILTER];

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
    lanEnabled: boolean;
    fakeIpFilter?: string[];
}

/**
 * 构建 Clash DNS 配置对象。
 * @param {BuildDnsConfigInput} params - 构建参数
 * @param {('redir-host'|'fake-ip')} params.mode - DNS 增强模式
 * @param {string[]=} params.fakeIpFilter - fake-ip 过滤域名列表（可选）
 * @returns {DnsConfig} DNS 配置对象
 */
function buildDnsConfig({
    mode,
    ipv6Enabled,
    lanEnabled,
    fakeIpFilter,
}: BuildDnsConfigInput): DnsConfig {
    const config: DnsConfig = {
        enable: true,
        ...(lanEnabled ? { listen: "0.0.0.0:53" } : {}),
        ipv6: ipv6Enabled,
        // Mihomo docs explicitly discourage combining prefer-h3 with respect-rules.
        "prefer-h3": false,
        "respect-rules": true,
        "enhanced-mode": mode,
        "proxy-server-nameserver": ["tcp://223.5.5.5:53", "tcp://119.29.29.29:53"],
        "default-nameserver": ["tcp://223.5.5.5:53", "tcp://119.29.29.29:53"],
        nameserver: ["tcp://1.1.1.1:53", "tcp://8.8.8.8:53"],
        fallback: ["tcp://1.0.0.1:53", "tcp://8.8.4.4:53", "tls://1.1.1.1:853"],
        "nameserver-policy": {
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
    lanEnabled: boolean;
}

/**
 * 根据 fakeIP 和 IPv6 开关生成最终 DNS 配置。
 * @param {BuildDnsInput} params - 构建参数
 * @param {boolean} params.fakeIPEnabled - 是否启用 fake-ip 模式
 * @returns {DnsConfig} DNS 配置对象
 */
export function buildDns({ fakeIPEnabled, ipv6Enabled, lanEnabled }: BuildDnsInput): DnsConfig {
    if (fakeIPEnabled) {
        return buildDnsConfig({
            mode: "fake-ip",
            ipv6Enabled,
            lanEnabled,
            fakeIpFilter: lanEnabled ? LAN_COMPAT_FAKE_IP_FILTER : BASE_FAKE_IP_FILTER,
        });
    }
    return buildDnsConfig({ mode: "redir-host", ipv6Enabled, lanEnabled });
}
