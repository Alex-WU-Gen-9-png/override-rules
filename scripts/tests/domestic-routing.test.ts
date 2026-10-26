/**
 * Optional core integration test:
 * MIHOMO_BIN=/absolute/path/to/mihomo node --import tsx --test scripts/tests/domestic-routing.test.ts
 *
 * Uses the complete generated rule lists with deterministic GeoIP/GeoSite and
 * inline provider fixtures. All listeners, DNS answers and destinations are
 * loopback; TUN, transparent listeners, downloads and Geo updates are disabled.
 * No system proxy, routes, existing core or server configuration are changed.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import dgram from "node:dgram";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { stringify } from "yaml";
import { PROXY_GROUPS } from "../../src/constants";
import { snifferConfig } from "../../src/dns";
import { ruleCatalog } from "../../src/rule_catalog";
import { buildRules } from "../../src/rules";
import type { RoutingType } from "../../src/types";

const coreBinary = process.env.MIHOMO_BIN;
const cnIP = "127.0.0.1";
const foreignIP = "127.0.0.2";
const unlistedCN = "unlisted-domestic.fixture.invalid";
const unlistedForeign = "unlisted-overseas.fixture.invalid";
const geoDomains: Record<string, string> = {
    cn: "listed-domestic.fixture.invalid",
    "category-ai-!cn": "ai.fixture.invalid",
    youtube: "media.fixture.invalid",
    github: "developer.fixture.invalid",
    gfw: "gfw.fixture.invalid",
};
const providerDomains: Record<string, string> = {
    SukkaAI: "provider-ai.fixture.invalid",
    StreamUS: "provider-media.fixture.invalid",
    StaticResources: "provider-cdn.fixture.invalid",
};

// Minimal encoding of the official component/geodata/router/config.proto.
function varint(value: number): Buffer {
    const bytes: number[] = [];
    do {
        bytes.push((value & 127) | (value > 127 ? 128 : 0));
        value >>>= 7;
    } while (value);
    return Buffer.from(bytes);
}

function bytesField(number: number, value: Buffer | string): Buffer {
    const bytes = typeof value === "string" ? Buffer.from(value) : value;
    return Buffer.concat([varint((number << 3) | 2), varint(bytes.length), bytes]);
}

function numberField(number: number, value: number): Buffer {
    return Buffer.concat([varint(number << 3), varint(value)]);
}

async function writeGeoFixtures(directory: string, rules: string[]): Promise<void> {
    const geoIPEntries = {
        CN: cnIP,
        US: foreignIP,
        PRIVATE: "127.0.0.254",
        NETFLIX: "127.0.0.253",
        TELEGRAM: "127.0.0.252",
    };
    await writeFile(
        path.join(directory, "geoip.dat"),
        Buffer.concat(
            Object.entries(geoIPEntries).map(([country, ip]) =>
                bytesField(
                    1,
                    Buffer.concat([
                        bytesField(1, country),
                        bytesField(
                            2,
                            Buffer.concat([
                                bytesField(1, Buffer.from(ip.split(".").map(Number))),
                                numberField(2, 32),
                            ])
                        ),
                    ])
                )
            )
        )
    );
    const siteNames = new Set(
        rules.filter((rule) => rule.startsWith("GEOSITE,")).map((rule) => rule.split(",")[1])
    );
    const sites = [...siteNames].map((site) => {
        const [name, attribute] = site.split("@");
        const fixtureDomain = geoDomains[site] ?? `${name}.unused.fixture.invalid`;
        const domain = Buffer.concat([
            numberField(1, 3), // Domain.Full
            bytesField(2, fixtureDomain),
            ...(attribute
                ? [bytesField(3, Buffer.concat([bytesField(1, attribute), numberField(2, 1)]))]
                : []),
        ]);
        return bytesField(1, Buffer.concat([bytesField(1, name), bytesField(2, domain)]));
    });
    await writeFile(path.join(directory, "geosite.dat"), Buffer.concat(sites));
}

function inlineProviders(): Record<string, object> {
    return Object.fromEntries(
        ruleCatalog.map(({ name, provider }) => {
            const domain = providerDomains[name] ?? `${name}.unused-provider.fixture.invalid`;
            const payload =
                provider.behavior === "classical"
                    ? [`DOMAIN,${domain}`]
                    : provider.behavior === "domain"
                      ? [domain]
                      : ["192.0.2.254/32"];
            return [name, { type: "inline", behavior: provider.behavior, payload }];
        })
    );
}

function dnsQuestion(name: string): Buffer {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(0x1234, 0);
    header.writeUInt16BE(0x0100, 2);
    header.writeUInt16BE(1, 4);
    return Buffer.concat([
        header,
        ...name
            .split(".")
            .map((part) => Buffer.concat([Buffer.from([part.length]), Buffer.from(part)])),
        Buffer.from([0, 0, 1, 0, 1]),
    ]);
}

function readQuestion(message: Buffer): { name: string; end: number; type: number } {
    const labels: string[] = [];
    let offset = 12;
    while (message[offset] !== 0) {
        const length = message[offset++];
        assert.ok(length < 64 && offset + length < message.length, "invalid DNS fixture query");
        labels.push(message.subarray(offset, offset + length).toString());
        offset += length;
    }
    return { name: labels.join("."), type: message.readUInt16BE(offset + 1), end: offset + 5 };
}

async function startDNSFixture(
    directDial = false
): Promise<{ socket: dgram.Socket; port: number }> {
    const socket = dgram.createSocket("udp4");
    socket.on("message", (message, remote) => {
        const question = readQuestion(message);
        // The routing resolver identifies the foreign fixture as US. Only the
        // post-classification DIRECT dial resolver maps it to the HTTP listener.
        const answerIP = !directDial && question.name === unlistedForeign ? foreignIP : cnIP;
        const header = Buffer.from(message.subarray(0, 12));
        header.writeUInt16BE(0x8180, 2);
        header.writeUInt16BE(question.type === 1 ? 1 : 0, 6);
        header.writeUInt16BE(0, 8);
        header.writeUInt16BE(0, 10);
        const answer =
            question.type === 1
                ? Buffer.concat([
                      Buffer.from([0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 1, 0, 4]),
                      Buffer.from(answerIP.split(".").map(Number)),
                  ])
                : Buffer.alloc(0);
        socket.send(
            Buffer.concat([header, message.subarray(12, question.end), answer]),
            remote.port,
            remote.address
        );
    });
    socket.bind(0, "127.0.0.1");
    await once(socket, "listening");
    return { socket, port: socket.address().port };
}

async function freeTCPPort(): Promise<number> {
    const server = net.createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = (server.address() as net.AddressInfo).port;
    await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
    );
    return port;
}

async function freeUDPPort(): Promise<number> {
    const socket = dgram.createSocket("udp4");
    socket.bind(0, "127.0.0.1");
    await once(socket, "listening");
    const port = socket.address().port;
    await new Promise<void>((resolve) => socket.close(resolve));
    return port;
}

async function startHTTPFixture(): Promise<{ server: http.Server; port: number }> {
    for (let port = 8080; port <= 8880; port++) {
        const server = http.createServer((_request, response) => response.end("local fixture"));
        try {
            await new Promise<void>((resolve, reject) => {
                server.once("error", reject);
                server.listen(port, "127.0.0.1", resolve);
            });
            server.removeAllListeners("error");
            return { server, port };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
        }
    }
    throw new Error("No free loopback HTTP port in production sniff range 8080–8880");
}

async function resolveThroughCore(name: string, port: number): Promise<void> {
    const socket = dgram.createSocket("udp4");
    const reply = once(socket, "message", { signal: AbortSignal.timeout(3000) });
    socket.send(dnsQuestion(name), port, "127.0.0.1");
    try {
        const [message] = await reply;
        assert.ok(
            (message as Buffer).readUInt16BE(6) > 0,
            `Core DNS returned no A answer: ${name}`
        );
    } finally {
        socket.close();
    }
}

async function readBytes(socket: net.Socket, length: number): Promise<Buffer> {
    const parts: Buffer[] = [];
    let count = 0;
    while (count < length) {
        const chunk = socket.read(length - count) as Buffer | null;
        if (chunk) {
            parts.push(chunk);
            count += chunk.length;
        } else {
            await once(socket, "readable");
        }
    }
    return Buffer.concat(parts);
}

async function sendSniffedHTTP(
    domain: string,
    ip: string,
    socksPort: number,
    httpPort: number
): Promise<void> {
    const socket = net.createConnection({ host: "127.0.0.1", port: socksPort });
    socket.setTimeout(3000, () => socket.destroy(new Error("SOCKS fixture timed out")));
    await once(socket, "connect");
    try {
        socket.write(Buffer.from([5, 1, 0]));
        assert.deepEqual(await readBytes(socket, 2), Buffer.from([5, 0]));
        const port = Buffer.alloc(2);
        port.writeUInt16BE(httpPort);
        socket.write(
            Buffer.concat([Buffer.from([5, 1, 0, 1]), Buffer.from(ip.split(".").map(Number)), port])
        );
        const response = await readBytes(socket, 10);
        assert.equal(response[1], 0, "SOCKS handshake failed");
        socket.write(`GET / HTTP/1.1\r\nHost: ${domain}\r\nConnection: close\r\n\r\n`);
        socket.resume();
        await once(socket, "close");
    } finally {
        socket.destroy();
    }
}

async function waitFor(predicate: () => boolean, context: () => string): Promise<void> {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error(`Timed out: ${context()}`);
        await delay(20);
    }
}

async function stopCore(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
}

test(
    "complete routing rules in an isolated Mihomo core",
    {
        skip: coreBinary
            ? false
            : "Set MIHOMO_BIN to run real core integration; not run without a binary",
        timeout: 90000,
    },
    async (t) => {
        assert.ok(coreBinary);
        const version = spawnSync(coreBinary, ["-v"], { encoding: "utf8" });
        assert.equal(version.status, 0, version.stderr);
        t.diagnostic(version.stdout.trim());
        const directory = await mkdtemp(path.join(os.tmpdir(), "mihomo-domestic-routing-"));
        const dns = await startDNSFixture();
        const directDNS = await startDNSFixture(true);
        const fixture = await startHTTPFixture();
        try {
            for (const routingType of ["whitelist", "blacklist"] as RoutingType[]) {
                await t.test(
                    `${routingType}: reproduction, SIGHUP, and classification`,
                    async (modeTest) => {
                        const fixedRules = buildRules({
                            routingType,
                            quicEnabled: false,
                            webRTCEnabled: false,
                        });
                        const domesticTarget =
                            routingType === "whitelist" ? PROXY_GROUPS.DOMESTIC_SERVICES : "DIRECT";
                        const fallback = `GEOIP,cn,${domesticTarget}`;
                        assert.equal(
                            fixedRules.at(-2),
                            fallback,
                            "resolving CN fallback must follow all explicit categories"
                        );
                        assert.equal(
                            fixedRules.at(-1),
                            `MATCH,${routingType === "whitelist" ? PROXY_GROUPS.SELECT : "DIRECT"}`
                        );
                        const originalRules = fixedRules.filter((rule) => rule !== fallback);
                        assert.equal(
                            originalRules.length,
                            fixedRules.length - 1,
                            "negative control removes exactly the new fallback"
                        );
                        const home = path.join(directory, routingType);
                        await mkdir(home);
                        await writeGeoFixtures(home, fixedRules);
                        const socksPort = await freeTCPPort();
                        const coreDNSPort = await freeUDPPort();
                        const config = {
                            "socks-port": socksPort,
                            "bind-address": "127.0.0.1",
                            "allow-lan": false,
                            mode: "rule",
                            ipv6: false,
                            "log-level": "debug",
                            "find-process-mode": "off",
                            "geodata-mode": true,
                            "geodata-loader": "standard",
                            "geo-auto-update": false,
                            tun: { enable: false },
                            profile: { "store-selected": false, "store-fake-ip": false },
                            sniffer: snifferConfig,
                            dns: {
                                enable: true,
                                listen: `127.0.0.1:${coreDNSPort}`,
                                ipv6: false,
                                "enhanced-mode": "redir-host",
                                "use-system-hosts": false,
                                nameserver: [`127.0.0.1:${dns.port}`],
                                "default-nameserver": [`127.0.0.1:${dns.port}`],
                                "direct-nameserver": [`127.0.0.1:${directDNS.port}`],
                            },
                            "proxy-groups": Object.values(PROXY_GROUPS)
                                .filter((name) => name !== "GLOBAL")
                                .map((name) => ({ name, type: "select", proxies: ["DIRECT"] })),
                            "rule-providers": inlineProviders(),
                            rules: originalRules,
                        };
                        const configPath = path.join(home, "config.yaml");
                        await writeFile(configPath, stringify(config));
                        let logs = "";
                        const child = spawn(coreBinary, ["-d", home, "-f", configPath], {
                            env: { PATH: process.env.PATH, HOME: home },
                            stdio: ["ignore", "pipe", "pipe"],
                        });
                        child.stdout.on("data", (data: Buffer) => {
                            logs += data.toString();
                        });
                        child.stderr.on("data", (data: Buffer) => {
                            logs += data.toString();
                        });
                        try {
                            await waitFor(
                                () => /SOCKS proxy listening/.test(logs),
                                () => logs
                            );
                            async function checkRoute(
                                domain: string,
                                rule: string,
                                target: string
                            ): Promise<string> {
                                await resolveThroughCore(domain, coreDNSPort);
                                const start = logs.length;
                                await sendSniffedHTTP(
                                    domain,
                                    domain === unlistedForeign ? foreignIP : cnIP,
                                    socksPort,
                                    fixture.port
                                );
                                await waitFor(
                                    () => logs.slice(start).includes(domain),
                                    () => logs.slice(start)
                                );
                                const observed = logs.slice(start);
                                assert.match(
                                    observed,
                                    /\[Sniffer\].*replace domain/,
                                    `HTTP destination must actually be overridden: ${observed}`
                                );
                                assert.ok(
                                    observed.includes(`match ${rule} using ${target}`) ||
                                        observed.includes(`dial ${target} (match ${rule}/`),
                                    `Expected ${rule} → ${target}, observed:\n${observed}`
                                );
                                return observed;
                            }
                            await modeTest.test(
                                "negative control: removed fallback reaches MATCH after HTTP sniffing",
                                async () => {
                                    const target =
                                        routingType === "whitelist"
                                            ? PROXY_GROUPS.SELECT
                                            : "DIRECT";
                                    await checkRoute(unlistedCN, "Match", target);
                                }
                            );
                            await modeTest.test(
                                "SIGHUP reloads the same core process from the saved config",
                                async () => {
                                    const pid = child.pid;
                                    const start = logs.length;
                                    config.rules = fixedRules;
                                    await writeFile(configPath, stringify(config));
                                    assert.ok(child.kill("SIGHUP"));
                                    await waitFor(
                                        () =>
                                            /Initial configuration complete/.test(
                                                logs.slice(start)
                                            ),
                                        () => logs.slice(start)
                                    );
                                    assert.equal(child.pid, pid);
                                    assert.equal(child.exitCode, null);
                                    await checkRoute(unlistedCN, "GeoIP(cn)", domesticTarget);
                                }
                            );
                            const cases = [
                                [
                                    "unlisted CN → resolving fallback",
                                    unlistedCN,
                                    "GeoIP(cn)",
                                    domesticTarget,
                                ],
                                [
                                    "unlisted foreign → original MATCH policy",
                                    unlistedForeign,
                                    "Match",
                                    routingType === "whitelist" ? PROXY_GROUPS.SELECT : "DIRECT",
                                ],
                                [
                                    "listed domestic → early domain classification",
                                    geoDomains.cn,
                                    "GeoSite(cn)",
                                    domesticTarget,
                                ],
                                [
                                    "AI on CN IP retains classification",
                                    geoDomains["category-ai-!cn"],
                                    "GeoSite(category-ai-!cn)",
                                    PROXY_GROUPS.AI_SERVICE,
                                ],
                                [
                                    "media on CN IP retains classification",
                                    geoDomains.youtube,
                                    "GeoSite(youtube)",
                                    PROXY_GROUPS.OVERSEAS_MEDIA,
                                ],
                                [
                                    "GFW on CN IP precedes resolving fallback",
                                    geoDomains.gfw,
                                    "GeoSite(gfw)",
                                    PROXY_GROUPS.SELECT,
                                ],
                                [
                                    "CDN provider on CN IP retains classification",
                                    providerDomains.StaticResources,
                                    "RuleSet(StaticResources)",
                                    PROXY_GROUPS.DOWNLOAD_STATIC,
                                ],
                                ...(routingType === "whitelist"
                                    ? [
                                          [
                                              "AI provider on CN IP retains classification",
                                              providerDomains.SukkaAI,
                                              "RuleSet(SukkaAI)",
                                              PROXY_GROUPS.AI_SERVICE,
                                          ],
                                          [
                                              "media provider on CN IP retains classification",
                                              providerDomains.StreamUS,
                                              "RuleSet(StreamUS)",
                                              PROXY_GROUPS.OVERSEAS_MEDIA,
                                          ],
                                          [
                                              "developer on CN IP retains classification",
                                              geoDomains.github,
                                              "GeoSite(github)",
                                              PROXY_GROUPS.DEVELOPER,
                                          ],
                                      ]
                                    : []),
                            ];
                            for (const [name, domain, rule, target] of cases) {
                                await modeTest.test(name, async () => {
                                    await checkRoute(domain, rule, target);
                                });
                            }
                        } finally {
                            await stopCore(child);
                            if (process.env.MIHOMO_TEST_KEEP)
                                await writeFile(path.join(home, "core.log"), logs);
                        }
                    }
                );
            }
        } finally {
            await new Promise<void>((resolve) => dns.socket.close(resolve));
            await new Promise<void>((resolve) => directDNS.socket.close(resolve));
            await new Promise<void>((resolve, reject) =>
                fixture.server.close((error) => (error ? reject(error) : resolve()))
            );
            if (process.env.MIHOMO_TEST_KEEP)
                t.diagnostic(`Retained integration fixtures: ${directory}`);
            else await rm(directory, { recursive: true, force: true });
        }
    }
);
