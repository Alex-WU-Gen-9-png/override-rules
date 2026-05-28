import type { ProxyNode } from "./types";

interface ApplyIPv6NodeOptionsInput {
    proxies?: ProxyNode[];
    ipv6InterfaceName: string;
}

export interface IPv6NodeOptions {
    proxies?: ProxyNode[];
    routeExcludeAddress: string[];
}

const IPV6_ONLY_NAME_PATTERN =
    /(?:^|[^A-Za-z0-9])(?:ipv6|ip6|v6)(?:[-_\s]*only)?(?=$|[^A-Za-z0-9])|(?:纯|only[-_\s]*)(?:ipv6|ip6|v6)/i;

const IPV6_DDNS_HOST_PATTERN =
    /(?:^|[._-])(?:ipv6|ip6|v6)(?:$|[._-])|dynv6|(?:^|[._-])(?:v6.*ddns|ddns.*v6)(?:$|[._-])/i;

function uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizeServerAddress(value: unknown): string | null {
    if (typeof value !== "string") return null;

    const address = value.trim();
    if (!address) return null;

    if (address.startsWith("[") && address.endsWith("]")) {
        return address.slice(1, -1);
    }

    return address;
}

function stripIpv6Zone(address: string): string {
    const zoneIndex = address.indexOf("%");
    return zoneIndex === -1 ? address : address.slice(0, zoneIndex);
}

function isIPv6Literal(address: string): boolean {
    const normalized = stripIpv6Zone(address);
    return (
        normalized.includes(":") &&
        /^[0-9A-Fa-f:.]+$/.test(normalized) &&
        /[0-9A-Fa-f]/.test(normalized)
    );
}

function isIPv6OnlyHost(address: string): boolean {
    if (isIPv6Literal(address)) return false;

    return IPV6_DDNS_HOST_PATTERN.test(address);
}

export function isIPv6OnlyProxy(proxy: ProxyNode): boolean {
    const name = proxy.name || "";
    const server = normalizeServerAddress(proxy.server);

    return (
        IPV6_ONLY_NAME_PATTERN.test(name) ||
        Boolean(server && (isIPv6Literal(server) || isIPv6OnlyHost(server)))
    );
}

function buildTunExcludeAddress(proxy: ProxyNode): string | null {
    const server = normalizeServerAddress(proxy.server);
    if (!server) return null;

    if (isIPv6Literal(server)) {
        return `${stripIpv6Zone(server)}/128`;
    }

    return null;
}

export function applyIPv6NodeOptions({
    proxies,
    ipv6InterfaceName,
}: ApplyIPv6NodeOptionsInput): IPv6NodeOptions {
    if (!proxies) {
        return { proxies, routeExcludeAddress: [] };
    }

    const routeExcludeAddress: string[] = [];
    const nextProxies = proxies.map((proxy) => {
        const isIPv6Only = isIPv6OnlyProxy(proxy);
        if (!isIPv6Only) return proxy;

        const excludeAddress = buildTunExcludeAddress(proxy);
        if (excludeAddress) {
            routeExcludeAddress.push(excludeAddress);
        }

        return {
            ...proxy,
            "ip-version": "ipv6" as const,
            ...(ipv6InterfaceName ? { "interface-name": ipv6InterfaceName } : {}),
        };
    });

    return {
        proxies: nextProxies,
        routeExcludeAddress: uniqueValues(routeExcludeAddress),
    };
}
