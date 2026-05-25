import type { TunConfig } from "./types";

export function buildTunConfig(tunEnabled: boolean): TunConfig {
    return {
        enable: tunEnabled,
        stack: "system",
        device: "Mihomo_Tun",
        "route-exclude-address": [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "100.64.0.0/10",
            "192.168.0.0/16",
            "fd00::/8",
            "fd7a:115c:a1e0::/48",
        ],
        "dns-hijack": ["any:53", "tcp://any:53", "tls://any:853"],
        mtu: 1500,
        "auto-route": true,
        "auto-detect-interface": true,
        "strict-route": false,
    };
}
