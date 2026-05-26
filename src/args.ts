import { parseBool, parseNumber } from "./utils";
import type { FeatureFlags, ScriptArgs } from "./types";

export const FEATURE_FLAG_DEFAULTS = {
    loadBalance: false,
    countrySelect: true,
    landing: false,
    ipv6Enabled: false,
    fullConfig: false,
    keepAliveEnabled: false,
    fakeIPEnabled: true,
    quicEnabled: false,
    webRTCEnabled: false,
    regexFilter: false,
    tunEnabled: false,
    countryThreshold: 0,
    panelPort: 9999,
    panelSecret: "",
} as const;

function parsePort(value: unknown, defaultValue: number): number {
    const port = parseNumber(value, defaultValue);
    return port >= 1 && port <= 65535 ? port : defaultValue;
}

function parseString(value: unknown, defaultValue = ""): string {
    if (typeof value === "undefined" || value === null) return defaultValue;
    return String(value);
}

/**
 * 解析传入的脚本参数，并将其转换为内部使用的功能开关（feature flags）。
 * @param args - 从外部脚本环境（如 Substore）传入的原始参数对象
 * @returns 经过解析和类型转换后的功能开关集合 `FeatureFlags`
 */
export function buildFeatureFlags(args: ScriptArgs): FeatureFlags {
    return {
        loadBalance: parseBool(args.loadbalance, FEATURE_FLAG_DEFAULTS.loadBalance),
        countrySelect: parseBool(args.countryselect, FEATURE_FLAG_DEFAULTS.countrySelect),
        landing: parseBool(args.landing, FEATURE_FLAG_DEFAULTS.landing),
        ipv6Enabled: parseBool(args.ipv6, FEATURE_FLAG_DEFAULTS.ipv6Enabled),
        fullConfig: parseBool(args.full, FEATURE_FLAG_DEFAULTS.fullConfig),
        keepAliveEnabled: parseBool(args.keepalive, FEATURE_FLAG_DEFAULTS.keepAliveEnabled),
        fakeIPEnabled: parseBool(args.fakeip, FEATURE_FLAG_DEFAULTS.fakeIPEnabled),
        quicEnabled: parseBool(args.quic, FEATURE_FLAG_DEFAULTS.quicEnabled),
        webRTCEnabled: parseBool(args.webrtc, FEATURE_FLAG_DEFAULTS.webRTCEnabled),
        regexFilter: parseBool(args.regex, FEATURE_FLAG_DEFAULTS.regexFilter),
        tunEnabled: parseBool(args.tun, FEATURE_FLAG_DEFAULTS.tunEnabled),
        countryThreshold: parseNumber(args.threshold, FEATURE_FLAG_DEFAULTS.countryThreshold),
        panelPort: parsePort(args.panelport, FEATURE_FLAG_DEFAULTS.panelPort),
        panelSecret: parseString(args.panelsecret, FEATURE_FLAG_DEFAULTS.panelSecret),
    };
}
