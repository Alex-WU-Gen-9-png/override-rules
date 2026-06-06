## powerfullz 的 Mihomo/Substore 覆写规则

[![](https://data.jsdelivr.com/v1/package/gh/powerfullz/override-rules/badge?style=rounded)](https://www.jsdelivr.com/package/gh/powerfullz/override-rules)

本仓库为 Mihomo/Substore 设计，提供高效、灵活的覆写规则（**不建议用于 Stash**）。核心特色如下：

* 集成 [SukkaW/Surge](https://github.com/SukkaW/Surge)、[blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 与 [217heidai/adblockfilters](https://github.com/217heidai/adblockfilters) 等优质规则，兼容性强，覆盖面广。
* 按逻辑类型生成可在 WebUI/GUI 中切换的策略组，覆盖 AI、媒体、社交、开发、生产力、下载、游戏、金融加密、广告与隐私防护等场景。
* 精简冗余，结构清晰，维护便捷。
* 深度融合 [Loyalsoldier/v2ray-rules-dat](https://github.com/Loyalsoldier/v2ray-rules-dat) GeoSite/GeoIP，分流更精准。
* IP 规则默认添加 `no-resolve`，有效减少本地 DNS 解析，提升速度与隐私。
* 动态覆写：自动识别节点国家/地区，仅生成实际存在的分组，节点名称实时枚举，配置更智能。

> 本项目为本人自用，欢迎交流建议（Issue/PR）。如无特殊反馈，将优先满足个人需求与体验优化。

[点击访问 Forgejo 上的镜像](https://git.l3zc.com/powerfullz/override-rules)

### AFF

#### FlowerCloud

[注册链接](https://api-flowercloud.com/aff.php?aff=4352)

目前我的主力机场，也是一家老牌一线机场了，线路扎实，冗余足够，实验性节点0.2倍率，部分地区的高级节点是家宽落地，用起来还是很舒服的。

#### 星岛梦

[注册链接](https://luics.xdmvipaff.cc/#/?code=MMB4xSlc)

星岛梦是一家 2025 年 12 月刚开业的机场，机场主在测试的时候就来找我了，我因此有幸从早期测试阶段便开始关注，见证了机场主熬夜修线路换落地的过程，目前体验还不错。算上日常折扣性价比还可以，大家可以月付体验一下。

### 使用方法

**Clash Party/Sparkle**

> [!TIP]
> Clash Party 不支持给脚本传入参数，如果需要传入参数，请使用集成的 Substore。

1.  推荐直接使用 JS 动态覆写：`https://cdn.jsdelivr.net/gh/powerfullz/override-rules/convert.min.js`
2.  打开 Clash Party → 左侧「覆写」→ 粘贴上述链接导入。
3.  打开「订阅管理」→ 目标订阅右上角三个点 → 「编辑信息」→ 选择该覆写脚本 → 保存。

需要注意，Clash Party 在默认设置下还会接管 DNS 和 SNI（域名嗅探），需要手动在设置中关闭「控制 DNS 设置」和「控制域名嗅探」两个选项。

**Clash Verge 系（Clash Verge Rev、Clash Nyanpasu 等）**

直接复制需要的 YAML 格式覆写粘贴到覆写规则部分（无法自动更新）。

**SubStore**

参考[最速 Substore 订阅管理指南](https://blog.l3zc.com/2025/03/clash-subscription-convert/)。

2025/06/17 更新：新增 JavaScript 格式覆写，更易于维护，已经成为首选方式。JavaScript 格式覆写支持在脚本链接末尾加入`#`以传入参数，传入多个参数时，用`&`分隔，例如`#landing=true&loadbalance=true`。

目前支持的参数：

*   `loadbalance`：启用负载均衡（默认 false；开启后国家/地区节点使用 `load-balance`）
*   `countryselect`：国家/地区节点使用手动选择（默认 true；仅当 `loadbalance=false&countryselect=false` 时改用 `url-test`）
*   `landing`：启用落地节点功能（如机场家宽/星链/落地分组，默认 false）[^landing]
*   `ipv6`：启用 IPv6 支持（默认 false）
*   `ipv6interface` / `ipv6_interface`：为识别出的 IPv6 Only 节点写入 `interface-name`（例如 `en0`、`eth0`，默认空；这些节点会自动写入 `ip-version: ipv6`）
*   `full`：生成完整配置（适合纯内核启动，默认 false）
*   `keepalive`：启用 TCP Keep Alive（默认 false）[^fn2]
*   `fakeip`：DNS 增强模式使用 `fake-ip` 而不是 `redir-host`（开启后可能有助于解决 TUN 模式无法上网的问题；未传参时默认 `true`，显式传 `false` 时使用 `redir-host`；开启时会写入 `profile.store-fake-ip=true` 以降低 Mihomo 重启后旧 fake-ip 映射失效的影响）
*   `quic`：允许 QUIC 流量（UDP 443，默认 false）[^quic]
*   `webrtc`：允许 WebRTC/STUN 按普通规则分流（默认 false；Steam P2P UDP 会优先走「游戏服务」，其余常见 STUN/TURN UDP 默认走 `选择代理` 以降低公网 IP 泄漏风险）[^webrtc]
*   `regex`：各国家/地区代理组改用 `include-all` + 正则过滤模式，由 Mihomo 内核在运行时按正则动态筛选节点，而非在脚本执行时枚举节点名称（默认 false）[^regex]
*   `tun`：启用 TUN 模式（system 栈，自动配置路由、路由排除地址与 DNS 劫持，默认 false）
*   `lan`：启用局域网透明代理辅助配置（写入 `dns.listen: 0.0.0.0:53`；当 `tun=true` 时额外写入 `auto-redirect: true`，并保留 `10.0.0.0/8` 进入 TUN 分流以兼容 ZJU 内网访问，默认 false）
*   `threshold`：国家/地区节点数量小于该值时不显示分组（默认 0）
*   `panelport`：MetaXD 面板控制端口，仅在 `full=true` 时生效（默认 9999）
*   `panelsecret`：MetaXD 面板访问密码，仅在 `full=true` 时生效（默认空；包含特殊字符时请先 URL Encode）

逐服务或逐类别的分流开关不通过 JS URL 参数控制。导入配置后，直接在 Mihomo 客户端的 WebUI/GUI 中切换对应逻辑策略组即可，例如把「AI服务」临时改为「DIRECT」，或把「国内应用」改为某个地区节点。

[^landing]: 注意在默认的枚举模式下，如果没有符合条件的落地节点（e.g 名称中带有「家宽」、「商宽」、「落地」等关键词的节点），内核会无法启动。
[^quic]: 默认屏蔽了 QUIC 流量防止节点 UDP 性能不佳影响上网体验，如果确信节点质量良好，建议设置为 true。
[^webrtc]: 默认强制走代理时，如果所选代理不支持 UDP，部分浏览器实时音视频、P2P 或在线会议场景会降级或不可用；Steamworks P2P 常用 UDP 端口会先进入「游戏服务」，确实需要按原始规则处理 WebRTC 时可以显式设置为 `true`。
[^regex]: 默认情况下覆写脚本会直接把节点都筛选好，如果想让内核来筛（比如，你在 Clash Party 客户端里额外添加了自建节点，想直接通过正则表达式筛选进入配置文件）那就打开吧。

IPv6 Only 节点会根据节点名称、IPv6 字面量地址，以及带有 `v6`/`ipv6` 特征的 DDNS 域名自动识别；识别后会补充 `ip-version: ipv6`。其中只有 IPv6 字面量地址会以 `/128` 合并进 TUN 的 `route-exclude-address`，DDNS 域名不会写入该列表，避免被 Mihomo 当作 CIDR 解析失败。

说明：支持字符串 true/false 或 1/0；。注：预生成的 YAML 格式覆写（`yamls/` 目录）固定使用正则模式，不受此参数影响。

[^fn2]: 无特殊需求不要启用，否则会造成[移动设备异常耗电问题](https://github.com/vernesong/OpenClash/issues/2614)。

#### JS 覆写使用示例

无特殊需求，直接在 Substore 「脚本操作」处填入脚本链接：

```
https://cdn.jsdelivr.net/gh/powerfullz/override-rules/convert.min.js
```

有链式代理和多个节点提供商之间负载均衡的需求，使用`landing=true&loadbalance=true`两个参数：

```
https://cdn.jsdelivr.net/gh/powerfullz/override-rules/convert.min.js#landing=true&loadbalance=true
```

如果想第一时间体验最新加入的 ~~Bug~~ 功能，可以使用 preview 分支的 Github Raw 链接：

```
https://raw.githubusercontent.com/powerfullz/override-rules/refs/heads/preview/convert.min.js
```

需要自定义 MetaXD 面板端口和密码时，开启完整配置并追加参数：

```
https://cdn.jsdelivr.net/gh/powerfullz/override-rules/convert.min.js#full=true&panelport=9090&panelsecret=your-password
```

需要开启局域网透明代理时，启用 TUN 与 LAN 支持：

```
https://cdn.jsdelivr.net/gh/powerfullz/override-rules/convert.min.js#full=true&tun=true&lan=true
```

说明：`allow-lan` 与 `bind-address` 只影响 HTTP/SOCKS/mixed 代理端口的局域网访问；局域网透明代理主要依赖 TUN 自动路由/重定向、DNS 监听，以及客户端侧将网关和 DNS 指向运行 Mihomo 的设备。为兼容 ZJU 等使用 `10.0.0.0/8` 的内网资源，`lan=true` 时不会把 `10.0.0.0/8` 从 TUN 路由中排除。常见内网域名后缀（如 `.lan`、`.local`、`.home.arpa`）默认会加入 `fake-ip-filter`，避免客户端用域名访问内网设备时拿到 fake-ip。本机自用客户端（`lan=false`）不会把普通国内域名和 `zju.edu.cn` 放进 fake-ip 例外，以便国内应用和 ZJU 域名稳定按域名规则分流；局域网透明代理服务端（`lan=true`）会保留 `geosite:cn` 与 `+.zju.edu.cn` 例外，更适合给局域网客户端返回真实国内/ZJU 地址。

Linux 单臂局域网网关上，标准 NTP（UDP/123）可能在 TUN 策略路由和同接口转发/NAT 之间超时。配置本身会为常见 NTP 域名加入 `fake-ip-filter`，并在规则前置 `UDP/123 DIRECT` 作为 Mihomo 内兜底；如需系统级端口旁路，请结合现场路由/NAT 拓扑单独配置，不建议直接套用固定的 systemd drop-in。

### 关于各 Mihomo 客户端覆盖 GeoIP/GeoSite 下载地址的说明

这覆写规则大量引用了 Loyalsoldier/v2ray-rules-dat，大多数 Mihomo 客户端都会覆写 GeoIP/GeoSite 数据库资源链接，为了获得更好的分流体验，建议手动修改客户端内的覆写设置。以 Mihomo Party 为例，点击侧栏中的「外部资源」，分别将资源链接替换为以下值：

| 项目 | 链接 |
| :--- | :--- |
| GeoIP 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat` |
| GeoSite 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat` |
| MMDB 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb` |
| ASN 数据库 | `https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb` |

### 关于 GUI 逻辑策略组的说明

配置默认生成以下可见逻辑策略组。每个组都可以在 WebUI/GUI 中临时改走 `选择代理`、地区节点、`低倍率节点`、`手动选择` 或 Mihomo 内置 `DIRECT`；其中拦截类使用 `REJECT` / `REJECT-DROP` / `DIRECT`。

| 策略组 | 默认 | 用途 |
| :--- | :--- | :--- |
| 广告拦截 | `REJECT` | 轻量广告过滤与补充广告规则，默认启用 `AdvertisingLite`，不默认启用全量 `Advertising` |
| 隐私防护 | `REJECT` | 搜狗输入回传、HTTPDNS 等隐私风险规则 |
| AI服务 | `选择代理` | OpenAI、Gemini、Claude、Copilot、Apple Intelligence 等 |
| 海外流媒体 | `选择代理` | Netflix、YouTube、Disney+、Spotify、TikTok、Twitch 等 |
| 香港媒体 | 对应地区节点 | Hong Kong 流媒体、TVB、ViuTV 等 |
| 台湾媒体 | 对应地区节点 | Taiwan 流媒体、Bahamut、KKTV、LiTV 等 |
| 日本媒体 | 对应地区节点 | Japan 流媒体、Abema、Niconico、Hulu JP 等 |
| 韩国媒体 | 对应地区节点 | Korea 流媒体 |
| 国内应用 | `DIRECT` | 国内应用、Apple CN、Microsoft CN、Google Play CN、阿里云/钉钉等可切换直连业务 |
| 社交通讯 | `选择代理` | Telegram、Twitter/X、Facebook、Instagram、Discord、Reddit、Line 等 |
| 开发服务 | `选择代理` | GitHub、GitLab、Docker、npm、PyPI、JetBrains、Vercel、Cloudflare 等 |
| 平台与生产力 | `选择代理` | Apple、Microsoft、Google、OneDrive、Google Drive、Dropbox、Notion、Slack、Teams 等 |
| 下载与静态资源 | `选择代理` | CDN、对象存储、软件下载、Steam 下载修正、PikPak 等 |
| 游戏服务 | `选择代理` | Steam、Xbox、PlayStation、Nintendo、Epic、Blizzard、Riot、HoYoverse 等 |
| 金融加密 | `选择代理` | 加密货币、交易所、PayPal、Stripe 等 |

地区媒体组会优先挂对应地区节点组，例如「香港媒体」优先挂「香港节点」，你可以继续在「香港节点」里选择、测速或负载均衡具体节点；如果订阅里没有识别到对应地区节点，则按邻近地区顺序回退，例如「韩国媒体」会尝试「日本节点」「新加坡节点」「美国节点」「香港节点」「台湾节点」，最后才使用通用代理候选兜底，避免配置不可用。

不会再生成可见的「直连」策略组。私网/LAN、路由器、本地发现、连接检测、ZJU 校内 IP 段等硬直连规则会直接写入 Mihomo 内置 `DIRECT`，避免出现「直连组里还能选代理」的反直觉行为。`ZJU` 组保留给 ZJU 域名、校园服务和 IP 认证学术资源，默认选 `DIRECT`，需要时可以在 GUI 里切到代理；`国内应用` 这类可切换直连业务同理保留为可见策略组。

**下载与静态资源**：包含常见 CDN 域名、对象存储域名以及下载域名。大部分网站的静态资源（如图片、视频、音频、字体、JS、CSS）都有独立域名、不设置风控措施、不设置鉴权，这些静态资源可以使用 IP 不一定干净（例如 IDC 类 IP）、但是带宽更大、延时更低、而且有和大部分主流 CDN（如 Cloudflare、Akamai、Fastly、EdgeCast）在 IXP 有互联的网络出口。一般就实践经验来看，在正常上网中这部分域名产生的流量占据约 70% 左右。如果你在使用商业性质的远端策略服务提供商、且该服务上提供了低倍率节点，你可以将这部分域名分流至低倍率节点以节省流量。[^fn1]

[^fn1]: 来源：[我有特别的 Surge 配置和使用技巧](https://blog.skk.moe/post/i-have-my-unique-surge-setup/)

**搜狗输入**：已并入「隐私防护」，默认 `REJECT`，用于避免搜狗输入法将输入内容通过 `get.sogou.com/q` 等域名回传。如果需要账号同步、词库更新或问题反馈，可在 GUI 中将「隐私防护」切为 `DIRECT`。

~~**Play 商店修复**：~~ 修复国行设备因使用`services.googleapis.cn`域名导致的 Google Play 下载应用时的「等待中…」问题。详见：[「Google Play 商店的国内 CDN：从密码学入门到分流策略优化」](https://blog.l3zc.com/2025/03/chinese-cdn-used-by-playstore/)，已经并入「国内应用」，默认 `DIRECT`。

~~**Steam 修复**：~~ 用于让 Steam 客户端调用国内 CDN 及 P2P 网络下载，节省大量流量，已经并入「下载与静态资源」。

### 关于链式代理的说明

若有链式代理需求，直接在 JS 链接后加 `landing=true` 参数即可（例如：`convert.min.js#landing=true`）。这样会新增「落地节点」和「前置代理」两个代理组，其中「落地节点」会自动匹配名称包含「家宽」「家庭」「商宽」「落地」「Starlink/星链」等关键词的节点，其他诸如「香港节点」等国家/地区分组会自动剔除这些落地节点。需要被链式代理的落地节点请在你的订阅里为该节点配置 `dialer-proxy: "前置代理"`，示例：

```yaml
proxies:
  - name: '香港 HGC NAT 商宽落地'
    type: ss
    server: example.com
    port: 6666
    cipher: aes-256-gcm
    password: goodpassword
    dialer-proxy: "前置代理"
```

### 关于自动生成的 YAML 格式覆写

除了直接引用动态构建的 JS 覆写脚本外，你也可以使用预先生成好的静态 YAML 覆写文件。这适用于某些不支持执行 JS 的客户端（例如旧版的 Clash Verge）。

> [!NOTE]
> 为了保持代码仓库的纯净，`main` 主分支不再跟踪和提交生成的产物文件（如 `convert.js` 和 `yamls/`）。
> 这些构建产物目前统一由 Github Actions 的 Release 工作流在发布 `v*` 版本时，构建并自动推送到当前分支及 Release 中；工作流会自动根据 Tag（例如 `v2.1.0`）同步 `package.json` / `package-lock.json` 的版本号，无需手动改版本。

获取 YAML 覆写文件的链接格式如下：

- **最新正式版**：`/yamls/*.yaml` (默认主分支或不带分支名)
- **特定历史版本**：`@vX.Y.Z/yamls/*.yaml`

文件命名规则依据支持的开关参数穷举，格式如下：

```text
config_lb-{0|1}_cs-{0|1}_landing-{0|1}_ipv6-{0|1}_full-{0|1}_keepalive-{0|1}_fakeip-{0|1}_quic-{0|1}_webrtc-{0|1}_tun-{0|1}_lan-{0|1}.yaml
```

**获取示例（开启 full，其余关闭）：**
```text
https://cdn.jsdelivr.net/gh/powerfullz/override-rules/yamls/config_lb-0_cs-0_landing-0_ipv6-0_full-1_keepalive-0_fakeip-0_quic-0_webrtc-0_tun-0_lan-0.yaml
```

**固定版本获取示例：**
```text
https://cdn.jsdelivr.net/gh/powerfullz/override-rules@v0.1.0/yamls/config_lb-0_cs-0_landing-0_ipv6-0_full-1_keepalive-0_fakeip-0_quic-0_webrtc-0_tun-0_lan-0.yaml
```

如果使用镜像：
```text
https://git.l3zc.com/powerfullz/override-rules/raw/branch/dist/yamls/config_lb-0_cs-0_landing-0_ipv6-0_full-1_keepalive-0_fakeip-0_quic-0_webrtc-0_tun-0_lan-0.yaml
```

*注：CI 仅套用了一份虚拟的 `fake_proxies.json` 来模拟生成 YAML，因此它无法像 JS 动态脚本那样根据你的实际节点智能生成专属分组策略，只能保守地包含常用的国家/地区。为了最高效的分流体验，仍强烈推荐使用 JS 覆写。*

### 如何自定义与贡献

**如果你想基于本项目深度定制自己专属的覆写规则：**

请阅读 [如何自定义专属覆写规则](docs/HOW_TO_CUSTOMISE.md)。里面详细介绍了如何修改默认参数、调整代理组及增添自定义的 Rule Providers。

**如果你想为本项目贡献代码或新增特性：**

请阅读 [贡献指南](docs/HOW_TO_CONTRIBUTE.md)。里面包含关于代码规范、开发流与提交 PR 的要求。

**如果你是 AI AGENT：**

请阅读 [`./AGENTS.md`](./AGENTS.md)。
