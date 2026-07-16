# override-rules

[![](https://data.jsdelivr.com/v1/package/gh/Alex-WU-Gen-9-png/override-rules/badge?style=rounded)](https://www.jsdelivr.com/package/gh/Alex-WU-Gen-9-png/override-rules)

面向 Mihomo 和 SubStore 的覆写规则项目。当前由 `Alex-WU-Gen-9-png` 维护，主分支以 TypeScript 源码为准，发布时自动生成 JS 覆写脚本和静态 YAML 覆写文件。

本项目主要面向 Mihomo 系客户端和 SubStore，不建议用于 Stash。

## 特性

- 提供 JS 动态覆写脚本，支持通过 URL hash 传入功能参数。
- 按订阅节点自动识别国家/地区，只生成实际可用的地区策略组。
- 生成 GUI 可切换的逻辑策略组，覆盖 AI、流媒体、社交、开发、生产力、下载、游戏、金融、广告拦截和隐私防护等场景。
- 支持 `load-balance`、`url-test`、手动选择、低倍率节点、链式代理落地节点等代理组模式。
- 支持完整配置输出、FakeIP/RedirHost、TUN、局域网透明代理辅助配置、IPv6 Only 节点处理、QUIC 和 WebRTC/STUN 策略开关。
- 发布流程自动生成 `convert.js`、`convert.min.js`、`yamls/` 和 `manifest.json`，源码分支不直接提交构建产物。

## 快速使用

推荐使用 JS 动态覆写：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js
```

固定到指定正式版本：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules@vX.Y.Z/convert.min.js
```

体验 preview 分支产物：

```text
https://raw.githubusercontent.com/Alex-WU-Gen-9-png/override-rules/refs/heads/preview/convert.min.js
```

常用示例：

```text
# 启用落地节点和负载均衡
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js#landing=true&loadbalance=true

# 输出完整配置，并设置 MetaXD 面板端口和密码
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js#full=true&panelport=9090&panelsecret=your-password

# 启用完整配置、TUN 和局域网透明代理辅助配置，并指定局域网 DNS 监听地址
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js#full=true&tun=true&lan=true&dnslisten=192.168.50.42:53
```

## 客户端说明

**SubStore**

在脚本操作中填入 JS 覆写链接。需要参数时，在链接末尾使用 `#key=value&key2=value2`，例如：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js#landing=true&loadbalance=true
```

**Clash Party/Sparkle**

可直接导入无参数 JS 覆写链接。Clash Party 不支持向脚本传参，如需使用参数，建议通过 SubStore 处理订阅后再导入客户端。

部分客户端默认会接管 DNS 和域名嗅探。如果出现覆写配置被客户端设置覆盖的情况，请检查客户端的 DNS、SNI/域名嗅探和外部资源配置。

**Clash Verge 系客户端**

如果客户端无法执行 JS 覆写脚本，可以改用发布产物中的静态 YAML 覆写文件。静态 YAML 无法根据真实订阅节点动态裁剪策略组，优先推荐 JS 动态覆写。

## 可选 URL 参数一览

当前 JS 动态覆写支持的完整参数如下。布尔参数支持 `true`/`false` 和 `1`/`0`，未传入参数时使用默认值。

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `loadbalance` | `false` | 国家/地区节点使用 `load-balance`。优先级高于 `countryselect`。 |
| `countryselect` | `true` | 国家/地区节点使用手动选择；当 `loadbalance=false&countryselect=false` 时改用 `url-test`。 |
| `landing` | `false` | 启用落地节点和前置代理组，用于链式代理场景。 |
| `ipv6` | `false` | 启用 IPv6，并让 DNS 配置允许 IPv6。 |
| `ipv6interface` / `ipv6_interface` | 空 | 为识别出的 IPv6 Only 节点写入 `interface-name`。 |
| `full` | `false` | 输出完整 Mihomo 配置，适合纯内核启动。 |
| `keepalive` | `false` | 启用 TCP keep-alive。移动设备无明确需求时不建议开启。 |
| `fakeip` | `true` | DNS 增强模式使用 `fake-ip`；显式传 `false` 时使用 `redir-host`。 |
| `quic` | `false` | 允许 UDP 443/QUIC 流量按规则分流；默认会拦截 QUIC。 |
| `webrtc` | `false` | 允许 WebRTC/STUN 按普通规则分流；默认降低公网 IP 泄漏风险。 |
| `regex` | `false` | 国家/地区代理组使用 `include-all` + `filter`，由 Mihomo 运行时筛选节点。 |
| `tun` | `false` | 启用 TUN 模式，自动配置路由、DNS 劫持和接口探测。 |
| `lan` | `false` | 启用局域网透明代理辅助配置；与 `tun=true` 搭配时会启用 `auto-redirect`。 |
| `dnslisten` / `dns_listen` | `0.0.0.0:53` | `lan=true` 时写入 `dns.listen`；可指定为局域网地址，例如 `192.168.50.42:53`，避免 `0.0.0.0:53` 与系统 DNS 服务端口冲突。 |
| `threshold` | `0` | 国家/地区节点数小于该值时不显示对应地区组。 |
| `panelport` | `9999` | MetaXD 面板控制端口，仅在 `full=true` 时生效。 |
| `panelsecret` | 空 | MetaXD 面板访问密码，仅在 `full=true` 时生效；特殊字符请先 URL Encode。 |

逐服务或逐类别的分流不通过 URL 参数控制。导入后请在 Mihomo WebUI/GUI 中切换对应逻辑策略组，例如将「AI服务」临时改为 `DIRECT`，或将「国内应用」切到某个地区节点。

## 策略组

默认会生成以下逻辑策略组：

| 策略组 | 默认候选 | 用途 |
| :--- | :--- | :--- |
| `选择代理` | 自动选择、故障转移、地区节点、低倍率节点、手动选择、`DIRECT` | 通用代理入口。 |
| `手动选择` | 全部节点 | 手动选择任意节点。 |
| `自动选择` | 默认代理候选 | `url-test` 自动测速。 |
| `故障转移` | 默认代理候选 | `fallback` 可用性兜底。 |
| `低倍率节点` | 低倍率匹配节点 | 匹配 `0.x`、低倍率、省流、实验性等节点；仅有匹配节点或 `regex=true` 时生成。 |
| `前置代理` | 非落地节点 | `landing=true` 时生成，作为链式代理前置出口。 |
| `落地节点` | 落地节点 | `landing=true` 时生成，匹配家宽、商宽、星链、落地等节点。 |
| `广告拦截` | `REJECT`、`REJECT-DROP`、`DIRECT` | 广告规则。 |
| `隐私防护` | `REJECT`、`REJECT-DROP`、`DIRECT` | 隐私风险规则，例如 HTTPDNS、输入法回传等。 |
| `AI服务` | 通用代理候选 | OpenAI、Gemini、Claude、Copilot、Apple Intelligence 等。 |
| `海外流媒体` | 通用代理候选 | Netflix、YouTube、Disney+、Spotify、TikTok、Twitch 等。 |
| `香港媒体` / `台湾媒体` / `日本媒体` / `韩国媒体` | 对应地区优先，缺失时回退到邻近地区或通用候选 | 地区流媒体服务。 |
| `国内应用` | `DIRECT` 优先 | 国内应用、国内 CDN、Apple CN、Microsoft CN、Google Play CN 等可切换直连业务。 |
| `社交通讯` | 通用代理候选 | Telegram、X/Twitter、Facebook、Instagram、Discord、Reddit、Line 等。 |
| `开发服务` | 通用代理候选 | GitHub、GitLab、Docker、npm、PyPI、JetBrains、Vercel、Cloudflare 等。 |
| `平台与生产力` | 通用代理候选 | Apple、Microsoft、Google、OneDrive、Google Drive、Dropbox、Notion、Slack、Teams 等。 |
| `下载与静态资源` | 通用代理候选 | CDN、对象存储、软件下载、Steam 下载修正、PikPak 等。 |
| `游戏服务` | 通用代理候选 | Steam、Xbox、PlayStation、Nintendo、Epic、Blizzard、Riot、HoYoverse 等。 |
| `金融加密` | 通用代理候选 | 加密货币、交易所、PayPal、Stripe 等。 |
| `ZJU` | `DIRECT` 优先 | ZJU 域名、校园服务和 IP 认证学术资源。 |

私网、LAN、路由器、本地发现、连接检测、ZJU 校内 IP 段等硬直连规则直接写入 Mihomo 内置 `DIRECT`，不会再生成可见的「直连」策略组。

## 链式代理

启用链式代理：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/convert.min.js#landing=true
```

开启后会生成「前置代理」和「落地节点」两个策略组。「落地节点」会匹配节点名中包含「家宽」「家庭宽带」「商宽」「商业宽带」「星链」「Starlink」「落地」等关键词的节点；地区节点组会自动排除这些落地节点。

需要链式代理的节点应在订阅中配置 `dialer-proxy: "前置代理"`：

```yaml
proxies:
  - name: "香港 HGC NAT 商宽落地"
    type: ss
    server: example.com
    port: 6666
    cipher: aes-256-gcm
    password: goodpassword
    dialer-proxy: "前置代理"
```

## IPv6、TUN 与 LAN

IPv6 Only 节点会根据节点名称、IPv6 字面量地址，以及带有 `v6`/`ipv6` 特征的 DDNS 域名自动识别。识别后会补充 `ip-version: ipv6`；如果传入 `ipv6interface` 或 `ipv6_interface`，还会写入 `interface-name`。

只有 IPv6 字面量地址会以 `/128` 合并进 TUN 的 `route-exclude-address`。DDNS 域名不会写入该列表，避免被 Mihomo 当作 CIDR 解析失败。

`lan=true` 会写入 `dns.listen`，默认值是 `0.0.0.0:53`。如果运行环境已有 `systemd-resolved`、dnsmasq、AdGuard Home 或其他 DNS 服务占用 53 端口，可以用 `dnslisten=192.168.50.42:53` 指定具体局域网地址，避免监听所有 IPv4 地址导致端口冲突。

当同时启用 `tun=true` 时，会额外写入 `auto-redirect: true`，并保留 `10.0.0.0/8` 进入 TUN 分流以兼容 ZJU 等内网访问。

## DNS 策略

默认本地解析使用 Mihomo 的 `system` DNS，由运行环境的系统 DNS 负责解析。`geosite:cn` 会在全局 `nameserver-policy` 中指定到 `system`。

微信、QQ 与腾讯相关域名复用上游 `Tencent` 和 `WeChat` 规则集，并在 `nameserver-policy` 中指定到 `system` DNS。

## GeoX 资源

本项目依赖 Loyalsoldier 的 GeoIP/GeoSite 数据。部分 Mihomo 客户端会覆盖默认资源链接，如需保持一致，可以在客户端外部资源设置中使用：

| 项目 | 链接 |
| :--- | :--- |
| GeoIP 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat` |
| GeoSite 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat` |
| MMDB 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb` |
| ASN 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb` |

## 静态 YAML 覆写

静态 YAML 适用于不支持执行 JS 覆写脚本的客户端。正式发布时会生成 `yamls/` 目录和 `manifest.json`。

获取 manifest：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/manifest.json
```

YAML 文件命名规则：

```text
config_lb-{0|1}_cs-{0|1}_landing-{0|1}_ipv6-{0|1}_full-{0|1}_keepalive-{0|1}_fakeip-{0|1}_quic-{0|1}_webrtc-{0|1}_tun-{0|1}_lan-{0|1}.yaml
```

示例：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules/yamls/config_lb-0_cs-0_landing-0_ipv6-0_full-1_keepalive-0_fakeip-0_quic-0_webrtc-0_tun-0_lan-0.yaml
```

固定版本：

```text
https://cdn.jsdelivr.net/gh/Alex-WU-Gen-9-png/override-rules@vX.Y.Z/yamls/config_lb-0_cs-0_landing-0_ipv6-0_full-1_keepalive-0_fakeip-0_quic-0_webrtc-0_tun-0_lan-0.yaml
```

生成器会固定传入 `regex=true`，因此静态 YAML 始终使用正则筛选模式，不受 JS 链接里的 `regex` 参数影响。CI 使用虚拟节点生成静态 YAML，无法像 JS 动态脚本那样根据真实订阅节点生成专属策略组。

静态 YAML 文件名只组合布尔参数；`dnslisten` 这类运行环境相关的字符串参数仅支持 JS 动态覆写。

## 发布规则

- `main` 分支只维护源码、脚本和文档，不提交 `convert.js`、`convert.min.js` 或 `yamls/` 生成产物。
- 推送到 `main` 且改动命中 `src/**`、`scripts/**` 或 preview workflow 时，会自动构建并强推 `preview` 分支。
- 正式发布由维护者执行 `npm version patch`、`npm version minor` 或 `npm version major`。
- `.npmrc` 会让 `npm version` 创建 `src-vX.Y.Z` 源码标签。
- Release workflow 监听 `src-v*` 标签，构建产物，强推 `dist` 分支，并将 `vX.Y.Z` 产物标签指向 `dist` 上的构建提交。
- GitHub Release 使用 `vX.Y.Z` 标签创建，附带 `convert.js`、`convert.min.js` 和 `yamls.tar.gz`。

## 开发

安装依赖：

```bash
npm install
```

常用命令：

```bash
npm run typecheck
npm run lint
npm run build
npm run generate
npm run artifacts
```

修改核心逻辑时请优先编辑 `src/` 和 `scripts/yaml_generator/` 下的 TypeScript 源码。不要直接修改生成产物。

## 自定义与贡献

- 自定义 Fork：阅读 [docs/HOW_TO_CUSTOMISE.md](docs/HOW_TO_CUSTOMISE.md)。
- 贡献代码：阅读 [docs/HOW_TO_CONTRIBUTE.md](docs/HOW_TO_CONTRIBUTE.md)。
- AI Agent：阅读 [AGENTS.md](AGENTS.md)。
