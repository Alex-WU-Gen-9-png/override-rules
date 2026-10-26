import { parseBool, parseNumber } from "./utils";
import type { FeatureFlags, RoutingType, ScriptArgs } from "./types";

export const FEATURE_FLAG_DEFAULTS = {
    routingType: "blacklist" as RoutingType,
    loadBalance: false,
    countrySelect: true,
    fallbackEnabled: false,
    landing: false,
    ipv6Enabled: false,
    ipv6InterfaceName: "",
    fullConfig: false,
    keepAliveEnabled: false,
    fakeIPEnabled: true,
    quicEnabled: false,
    webRTCEnabled: false,
    regexFilter: false,
    tunEnabled: false,
    lanEnabled: false,
    dnsListen: "0.0.0.0:53",
    inboundLanEnabled: true,
    inboundBindAddress: "127.0.0.1",
    inboundAuth: [] as string[],
    panelBindAddress: "127.0.0.1",
    countryThreshold: 0,
    panelPort: 9999,
    panelSecret: "",
} as const;

function parseRoutingType(value: unknown, defaultValue: RoutingType): RoutingType {
    const parsed = parseTrimmedString(value, defaultValue).toLowerCase();
    return parsed === "blacklist" || parsed === "whitelist" ? parsed : defaultValue;
}

function parsePort(value: unknown, defaultValue: number): number {
    const port = parseNumber(value, defaultValue);
    return port >= 1 && port <= 65535 ? port : defaultValue;
}

function parseString(value: unknown, defaultValue = ""): string {
    if (typeof value === "undefined" || value === null) return defaultValue;
    return String(value);
}

function parseTrimmedString(value: unknown, defaultValue = ""): string {
    return parseString(value, defaultValue).trim();
}

function parseNonEmptyTrimmedString(value: unknown, defaultValue: string): string {
    const parsed = parseTrimmedString(value, defaultValue);
    return parsed || defaultValue;
}

function parseCommaSeparatedStrings(
    value: unknown,
    defaultValue: readonly string[] = []
): string[] {
    const parsed = parseTrimmedString(value);
    if (!parsed) return [...defaultValue];

    return parsed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function getListenHost(listen: string): string {
    if (listen.startsWith("[")) {
        const bracketEnd = listen.indexOf("]");
        return bracketEnd > 0 ? listen.slice(1, bracketEnd) : listen;
    }

    const colonIndex = listen.lastIndexOf(":");
    if (colonIndex <= 0) return listen;

    const host = listen.slice(0, colonIndex);
    return host.includes(":") ? listen : host;
}

function isWildcardAddress(address: string): boolean {
    return ["*", "0.0.0.0", "::", "[::]", ""].includes(address);
}

function resolveInboundBindAddress(value: unknown, dnsListen: string): string {
    const explicitAddress = parseTrimmedString(value);
    if (explicitAddress) return explicitAddress;

    const listenHost = getListenHost(dnsListen);
    if (isWildcardAddress(listenHost)) {
        return FEATURE_FLAG_DEFAULTS.inboundBindAddress;
    }

    return listenHost;
}

/**
 * 解析传入的脚本参数，并将其转换为内部使用的功能开关（feature flags）。
 * @param args - 从外部脚本环境（如 Substore）传入的原始参数对象
 * @returns 经过解析和类型转换后的功能开关集合 `FeatureFlags`
 */
export function buildFeatureFlags(args: ScriptArgs): FeatureFlags {
    const dnsListen = parseNonEmptyTrimmedString(
        args.dnslisten ?? args.dns_listen,
        FEATURE_FLAG_DEFAULTS.dnsListen
    );

    return {
        routingType: parseRoutingType(args.type, FEATURE_FLAG_DEFAULTS.routingType),
        loadBalance: parseBool(args.loadbalance, FEATURE_FLAG_DEFAULTS.loadBalance),
        countrySelect: parseBool(args.countryselect, FEATURE_FLAG_DEFAULTS.countrySelect),
        fallbackEnabled: parseBool(args.fallback, FEATURE_FLAG_DEFAULTS.fallbackEnabled),
        landing: parseBool(args.landing, FEATURE_FLAG_DEFAULTS.landing),
        ipv6Enabled: parseBool(args.ipv6, FEATURE_FLAG_DEFAULTS.ipv6Enabled),
        ipv6InterfaceName: parseTrimmedString(
            args.ipv6interface ?? args.ipv6_interface,
            FEATURE_FLAG_DEFAULTS.ipv6InterfaceName
        ),
        fullConfig: parseBool(args.full, FEATURE_FLAG_DEFAULTS.fullConfig),
        keepAliveEnabled: parseBool(args.keepalive, FEATURE_FLAG_DEFAULTS.keepAliveEnabled),
        fakeIPEnabled: parseBool(args.fakeip, FEATURE_FLAG_DEFAULTS.fakeIPEnabled),
        quicEnabled: parseBool(args.quic, FEATURE_FLAG_DEFAULTS.quicEnabled),
        webRTCEnabled: parseBool(args.webrtc, FEATURE_FLAG_DEFAULTS.webRTCEnabled),
        regexFilter: parseBool(args.regex, FEATURE_FLAG_DEFAULTS.regexFilter),
        tunEnabled: parseBool(args.tun, FEATURE_FLAG_DEFAULTS.tunEnabled),
        lanEnabled: parseBool(args.lan, FEATURE_FLAG_DEFAULTS.lanEnabled),
        dnsListen,
        inboundLanEnabled: parseBool(
            args.inboundlan ?? args.inbound_lan,
            FEATURE_FLAG_DEFAULTS.inboundLanEnabled
        ),
        inboundBindAddress: resolveInboundBindAddress(
            args.inboundbind ?? args.inbound_bind,
            dnsListen
        ),
        inboundAuth: parseCommaSeparatedStrings(
            args.inboundauth ?? args.inbound_auth,
            FEATURE_FLAG_DEFAULTS.inboundAuth
        ),
        panelBindAddress: parseNonEmptyTrimmedString(
            args.panelbind ?? args.panel_bind,
            FEATURE_FLAG_DEFAULTS.panelBindAddress
        ),
        countryThreshold: parseNumber(args.threshold, FEATURE_FLAG_DEFAULTS.countryThreshold),
        panelPort: parsePort(args.panelport, FEATURE_FLAG_DEFAULTS.panelPort),
        panelSecret: parseString(args.panelsecret, FEATURE_FLAG_DEFAULTS.panelSecret),
    };
}
