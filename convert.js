/*!
Alex-WU-Gen-9-png 的 SubStore 覆写脚本
https://github.com/Alex-WU-Gen-9-png/override-rules

支持的传入参数：
- profile=clash-verge: 使用当前 Clash Verge 风格的动态策略组和规则覆写；节点从输入配置实时获取
- type: 分流模式，`blacklist` 仅代理 AI/GFW/CDN 黑名单，`whitelist` 使用完整分类分流（默认 blacklist）
- loadbalance: 启用负载均衡（load-balance，默认 false）
- countryselect: 国家/地区节点使用手动选择（默认 true；传 false 时在非负载均衡模式下改用 url-test）
- fallback: 将国家/地区节点组改为故障转移（默认 false；启用后不生成全局「故障转移」组；loadbalance=true 时仍优先使用 load-balance）
- landing: 启用落地节点功能（如机场家宽/星链/落地分组，默认 false）
- ipv6: 启用 IPv6 支持（默认 false）
- ipv6interface/ipv6_interface: IPv6 Only 节点绑定的出站网卡（默认空）
- tun: 启用 TUN 模式（默认 false）
- lan: 启用局域网代理支持（默认 false；透明代理需配合 tun=true）
- dnslisten/dns_listen: lan=true 时的 DNS 监听地址（默认 0.0.0.0:53）
- inboundlan/inbound_lan: 允许 HTTP/SOCKS 入站被局域网访问（默认 true）
- inboundbind/inbound_bind: HTTP/SOCKS 入站绑定地址（默认复用 dnslisten 地址；泛监听时回退到 127.0.0.1）
- inboundauth/inbound_auth: HTTP/SOCKS 入站认证，多个账号用英文逗号分隔（默认空）
- full: 输出完整配置（适合纯内核启动，默认 false）
- keepalive: 启用 tcp-keep-alive（默认 false）
- fakeip: DNS 使用 FakeIP 模式（默认 true；传 false 时为 RedirHost）
- quic: 允许 QUIC 流量（UDP 443，默认 false）
- webrtc: whitelist 模式允许 WebRTC/STUN 按普通规则分流（默认 false；Steam P2P UDP 优先走游戏服务；blacklist 模式不额外代理这些 UDP）
- threshold: 地区节点数量小于该值时不显示分组 (默认 0)
- regex: 使用正则过滤模式（include-all + filter）写入各地区代理组，而非直接枚举节点名称（默认 false）
- panelbind/panel_bind: MetaXD 面板控制地址（仅 full=true 时生效，默认 127.0.0.1）
- panelport: MetaXD 面板控制端口（仅 full=true 时生效，默认 9999）
- panelsecret: MetaXD 面板访问密码（仅 full=true 时生效，默认空）

源码已迁移至 `src/*.ts`。
*/
"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/utils.ts
  function parseBool(value, defaultValue = false) {
    if (typeof value === "undefined") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true" || value === "1";
    }
    return false;
  }
  function parseNumber(value, defaultValue = 0) {
    if (value === null || typeof value === "undefined") {
      return defaultValue;
    }
    const num = parseInt(String(value), 10);
    return Number.isNaN(num) ? defaultValue : num;
  }
  function buildList(...elements) {
    return elements.flat().filter(Boolean);
  }
  function createCaseInsensitiveNodeMatcher(source) {
    return {
      source,
      regex: new RegExp(source, "i"),
      pattern: `(?i)${source}`
    };
  }
  function isNotNull(v) {
    return v !== null;
  }
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
    }
  });

  // src/constants.ts
  var NODE_SUFFIX, CDN_URL, SELF_CDN_URL, BUILTIN_DIRECT, BUILTIN_REJECT, BUILTIN_REJECT_DROP, PROXY_GROUPS, LOW_COST_NODE_MATCHER, LANDING_NODE_MATCHER, countriesMeta;
  var init_constants = __esm({
    "src/constants.ts"() {
      "use strict";
      init_utils();
      NODE_SUFFIX = "节点";
      CDN_URL = "https://cdn.jsdelivr.net";
      SELF_CDN_URL = `${CDN_URL}/gh/Alex-WU-Gen-9-png/override-rules@main`;
      BUILTIN_DIRECT = "DIRECT";
      BUILTIN_REJECT = "REJECT";
      BUILTIN_REJECT_DROP = "REJECT-DROP";
      PROXY_GROUPS = {
        SELECT: "选择代理",
        MANUAL: "手动选择",
        AUTO: "自动选择",
        FALLBACK: "故障转移",
        LANDING: "落地节点",
        LOW_COST: "低倍率节点",
        FRONT_PROXY: "前置代理",
        AD_BLOCK: "广告拦截",
        PRIVACY: "隐私防护",
        AI_SERVICE: "AI服务",
        OVERSEAS_MEDIA: "海外流媒体",
        HK_MEDIA: "香港媒体",
        TW_MEDIA: "台湾媒体",
        JP_MEDIA: "日本媒体",
        KR_MEDIA: "韩国媒体",
        DOMESTIC_SERVICES: "国内应用",
        SOCIAL: "社交通讯",
        DEVELOPER: "开发服务",
        PRODUCTIVITY: "平台与生产力",
        DOWNLOAD_STATIC: "下载与静态资源",
        GAME: "游戏服务",
        FINANCE: "金融加密",
        ZJU: "ZJU",
        GLOBAL: "GLOBAL"
      };
      LOW_COST_NODE_MATCHER = createCaseInsensitiveNodeMatcher(
        String.raw`0\.[0-5]|低倍率|省流|实验性`
      );
      LANDING_NODE_MATCHER = createCaseInsensitiveNodeMatcher(
        String.raw`家宽|家庭宽带|商宽|商业宽带|星链|Starlink|落地`
      );
      countriesMeta = {
        香港: {
          weight: 10,
          pattern: "香港|港|\\b(?:HK|hk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇭🇰",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png`
        },
        澳门: {
          pattern: "澳门|\\b(?:MO|mo)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Macau|🇲🇴",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Macao.png`
        },
        台湾: {
          weight: 20,
          pattern: "台|新北|彰化|\\b(?:TW|tw)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇹🇼|🇼🇸",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png`
        },
        新加坡: {
          weight: 30,
          pattern: "新加坡|坡|狮城|\\b(?:SG|sg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇸🇬",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Singapore.png`
        },
        日本: {
          weight: 40,
          pattern: "日本|川日|东京|大阪|泉日|埼玉|沪日|深日|\\b(?:JP|jp)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇯🇵",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Japan.png`
        },
        韩国: {
          weight: 45,
          pattern: "韩国|韩|韓|春川|Chuncheon|首尔|\\b(?:KR|kr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|ICN|🇰🇷",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Korea.png`
        },
        美国: {
          weight: 50,
          pattern: "美国|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|亚特兰大|迈阿密|华盛顿|\\b(?:US|us)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇺🇸",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_States.png`
        },
        加拿大: {
          weight: 55,
          pattern: "加拿大|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|\\b(?:CA|ca)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|YVR|YYZ|YUL|🇨🇦",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Canada.png`
        },
        英国: {
          weight: 60,
          pattern: "英国|伦敦|曼彻斯特|Manchester|\\b(?:UK|uk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Britain|United Kingdom|UNITED KINGDOM|England|GBR|LHR|MAN|🇬🇧",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png`
        },
        澳大利亚: {
          pattern: "澳洲|澳大利亚|\\b(?:AU|au)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Australia|🇦🇺",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Australia.png`
        },
        德国: {
          weight: 70,
          pattern: "德国|德|柏林|法兰克福|慕尼黑|Munich|\\b(?:DE|de)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Germany|GERMANY|DEU|MUC|🇩🇪",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Germany.png`
        },
        法国: {
          weight: 80,
          pattern: "法国|法|巴黎|马赛|Marseille|\\b(?:FR|fr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|CDG|MRS|🇫🇷",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/France.png`
        },
        俄罗斯: {
          pattern: "俄罗斯|俄|\\b(?:RU|ru)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Russia|🇷🇺",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Russia.png`
        },
        泰国: {
          pattern: "泰国|泰|\\b(?:TH|th)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Thailand|🇹🇭",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Thailand.png`
        },
        印度: {
          pattern: "印度|\\b(?:IN|in)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|India|🇮🇳",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/India.png`
        },
        马来西亚: {
          pattern: "马来西亚|马来|\\b(?:MY|my)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Malaysia|🇲🇾",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png`
        },
        阿根廷: {
          pattern: "阿根廷|布宜诺斯艾利斯|\\b(?:AR|ar)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Argentina|EZE|🇦🇷",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Argentina.png`
        },
        芬兰: {
          pattern: "芬兰|赫尔辛基|\\b(?:FI|fi)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Finland|HEL|🇫🇮",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Finland.png`
        },
        埃及: {
          pattern: "埃及|开罗|\\b(?:EG|eg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Egypt|CAI|🇪🇬",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Egypt.png`
        },
        菲律宾: {
          pattern: "菲律宾|马尼拉|\\b(?:PH|ph)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Philippines|MNL|🇵🇭",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Philippines.png`
        },
        土耳其: {
          pattern: "土耳其|伊斯坦布尔|\\b(?:TR|tr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Turkey|Türkiye|IST|🇹🇷",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Turkey.png`
        },
        乌克兰: {
          pattern: "乌克兰|基辅|\\b(?:UA|ua)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Ukraine|KBP|🇺🇦",
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Ukraine.png`
        }
      };
    }
  });

  // src/args.ts
  function parseRoutingType(value, defaultValue) {
    const parsed = parseTrimmedString(value, defaultValue).toLowerCase();
    return parsed === "blacklist" || parsed === "whitelist" ? parsed : defaultValue;
  }
  function parsePort(value, defaultValue) {
    const port = parseNumber(value, defaultValue);
    return port >= 1 && port <= 65535 ? port : defaultValue;
  }
  function parseString(value, defaultValue = "") {
    if (typeof value === "undefined" || value === null) return defaultValue;
    return String(value);
  }
  function parseTrimmedString(value, defaultValue = "") {
    return parseString(value, defaultValue).trim();
  }
  function parseNonEmptyTrimmedString(value, defaultValue) {
    const parsed = parseTrimmedString(value, defaultValue);
    return parsed || defaultValue;
  }
  function parseCommaSeparatedStrings(value, defaultValue = []) {
    const parsed = parseTrimmedString(value);
    if (!parsed) return [...defaultValue];
    return parsed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  function getListenHost(listen) {
    if (listen.startsWith("[")) {
      const bracketEnd = listen.indexOf("]");
      return bracketEnd > 0 ? listen.slice(1, bracketEnd) : listen;
    }
    const colonIndex = listen.lastIndexOf(":");
    if (colonIndex <= 0) return listen;
    const host = listen.slice(0, colonIndex);
    return host.includes(":") ? listen : host;
  }
  function isWildcardAddress(address) {
    return ["*", "0.0.0.0", "::", "[::]", ""].includes(address);
  }
  function resolveInboundBindAddress(value, dnsListen) {
    const explicitAddress = parseTrimmedString(value);
    if (explicitAddress) return explicitAddress;
    const listenHost = getListenHost(dnsListen);
    if (isWildcardAddress(listenHost)) {
      return FEATURE_FLAG_DEFAULTS.inboundBindAddress;
    }
    return listenHost;
  }
  function buildFeatureFlags(args) {
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
      panelSecret: parseString(args.panelsecret, FEATURE_FLAG_DEFAULTS.panelSecret)
    };
  }
  var FEATURE_FLAG_DEFAULTS;
  var init_args = __esm({
    "src/args.ts"() {
      "use strict";
      init_utils();
      FEATURE_FLAG_DEFAULTS = {
        routingType: "blacklist",
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
        inboundAuth: [],
        panelBindAddress: "127.0.0.1",
        countryThreshold: 0,
        panelPort: 9999,
        panelSecret: ""
      };
    }
  });

  // src/proxy_groups.ts
  function buildCountryProxyGroups({
    countries,
    landing,
    loadBalance,
    countrySelect,
    fallbackEnabled,
    regexFilter,
    countryInfo
  }) {
    const groups = [];
    const nodesByCountry = !regexFilter ? Object.fromEntries(countryInfo.map((item) => [item.country, item.nodes])) : null;
    for (const country of countries) {
      const meta = countriesMeta[country];
      if (!meta) continue;
      const baseFields = {
        name: `${country}${NODE_SUFFIX}`,
        icon: meta.icon
      };
      let groupConfig;
      if (loadBalance) {
        const testFields = {
          url: PROXY_TEST_URL,
          interval: 60,
          tolerance: 20
        };
        if (!regexFilter) {
          const nodeNames = nodesByCountry?.[country] ?? [];
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "load-balance",
            strategy: "sticky-sessions",
            proxies: nodeNames
          };
        } else {
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "load-balance",
            strategy: "sticky-sessions",
            "include-all": true,
            filter: meta.pattern,
            ...landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}
          };
        }
      } else if (fallbackEnabled) {
        const testFields = {
          url: PROXY_TEST_URL,
          interval: 60,
          tolerance: 20
        };
        if (!regexFilter) {
          const nodeNames = nodesByCountry?.[country] ?? [];
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "fallback",
            proxies: nodeNames
          };
        } else {
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "fallback",
            "include-all": true,
            filter: meta.pattern,
            ...landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}
          };
        }
      } else if (countrySelect) {
        if (!regexFilter) {
          const nodeNames = nodesByCountry?.[country] ?? [];
          groupConfig = {
            ...baseFields,
            type: "select",
            proxies: nodeNames
          };
        } else {
          groupConfig = {
            ...baseFields,
            type: "select",
            "include-all": true,
            filter: meta.pattern,
            ...landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}
          };
        }
      } else {
        const testFields = {
          url: PROXY_TEST_URL,
          interval: 60,
          tolerance: 20
        };
        if (!regexFilter) {
          const nodeNames = nodesByCountry?.[country] ?? [];
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "url-test",
            proxies: nodeNames
          };
        } else {
          groupConfig = {
            ...baseFields,
            ...testFields,
            type: "url-test",
            "include-all": true,
            filter: meta.pattern,
            ...landing ? { "exclude-filter": LANDING_NODE_MATCHER.pattern } : {}
          };
        }
      }
      groups.push(groupConfig);
    }
    return groups;
  }
  function buildProxyGroups({
    landing,
    regexFilter,
    fallbackEnabled,
    countryProxyGroups,
    lowCostNodes,
    landingNodes,
    defaultSelector,
    defaultFallback,
    frontProxySelector
  }) {
    const regionalProxyGroups = countryProxyGroups.map((group) => group.name);
    const hasLowCost = lowCostNodes.length > 0 || regexFilter;
    const lowCostGroup = hasLowCost ? PROXY_GROUPS.LOW_COST : false;
    const regionalProxyGroupSet = new Set(regionalProxyGroups);
    const proxyGroupProxies = buildList(
      PROXY_GROUPS.SELECT,
      landing && PROXY_GROUPS.LANDING,
      regionalProxyGroups,
      lowCostGroup,
      PROXY_GROUPS.MANUAL,
      BUILTIN_DIRECT
    );
    const domesticGroupProxies = buildList(
      BUILTIN_DIRECT,
      PROXY_GROUPS.SELECT,
      landing && PROXY_GROUPS.LANDING,
      regionalProxyGroups,
      lowCostGroup,
      PROXY_GROUPS.MANUAL
    );
    const rejectGroupProxies = [BUILTIN_REJECT, BUILTIN_REJECT_DROP, BUILTIN_DIRECT];
    const buildRegionalMediaProxies = (countries) => {
      const regionalFallback = countries.map((country) => `${country}${NODE_SUFFIX}`).filter((groupName) => regionalProxyGroupSet.has(groupName));
      return regionalFallback.length > 0 ? regionalFallback : proxyGroupProxies;
    };
    const groups = [
      {
        name: PROXY_GROUPS.SELECT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
        type: "select",
        proxies: defaultSelector
      },
      {
        name: PROXY_GROUPS.MANUAL,
        icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
        "include-all": true,
        type: "select"
      },
      landing ? {
        name: PROXY_GROUPS.FRONT_PROXY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
        type: "select",
        ...regexFilter ? {
          "include-all": true,
          "exclude-filter": LANDING_NODE_MATCHER.pattern,
          proxies: frontProxySelector
        } : { proxies: frontProxySelector }
      } : null,
      landing ? {
        name: PROXY_GROUPS.LANDING,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
        type: "select",
        ...regexFilter ? { "include-all": true, filter: LANDING_NODE_MATCHER.pattern } : { proxies: landingNodes }
      } : null,
      {
        name: PROXY_GROUPS.AD_BLOCK,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/adblock.png`,
        type: "select",
        proxies: rejectGroupProxies
      },
      {
        name: PROXY_GROUPS.PRIVACY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lock.png`,
        type: "select",
        proxies: rejectGroupProxies
      },
      {
        name: PROXY_GROUPS.AI_SERVICE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.OVERSEAS_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/streaming.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.HK_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/hk.png`,
        type: "select",
        proxies: buildRegionalMediaProxies(["香港", "台湾", "新加坡", "日本", "美国"])
      },
      {
        name: PROXY_GROUPS.TW_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/tw.png`,
        type: "select",
        proxies: buildRegionalMediaProxies(["台湾", "香港", "日本", "新加坡", "美国"])
      },
      {
        name: PROXY_GROUPS.JP_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/jp.png`,
        type: "select",
        proxies: buildRegionalMediaProxies(["日本", "韩国", "新加坡", "美国", "香港", "台湾"])
      },
      {
        name: PROXY_GROUPS.KR_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/kr.png`,
        type: "select",
        proxies: buildRegionalMediaProxies(["韩国", "日本", "新加坡", "美国", "香港", "台湾"])
      },
      {
        name: PROXY_GROUPS.DOMESTIC_SERVICES,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/china.png`,
        type: "select",
        proxies: domesticGroupProxies
      },
      {
        name: PROXY_GROUPS.SOCIAL,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/telegram.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.DEVELOPER,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/github.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.PRODUCTIVITY,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/microsoft.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.DOWNLOAD_STATIC,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/static.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.GAME,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/game.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.FINANCE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_1.png`,
        type: "select",
        proxies: proxyGroupProxies
      },
      {
        name: PROXY_GROUPS.ZJU,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bookpedia.png`,
        type: "select",
        proxies: [BUILTIN_DIRECT, PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL]
      },
      {
        name: PROXY_GROUPS.AUTO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
        type: "url-test",
        url: PROXY_TEST_URL,
        proxies: defaultFallback,
        interval: 60,
        tolerance: 20
      },
      !fallbackEnabled ? {
        name: PROXY_GROUPS.FALLBACK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
        type: "fallback",
        url: PROXY_TEST_URL,
        proxies: defaultFallback,
        interval: 60,
        tolerance: 20
      } : null,
      hasLowCost ? {
        name: PROXY_GROUPS.LOW_COST,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
        type: "url-test",
        url: PROXY_TEST_URL,
        interval: 60,
        tolerance: 20,
        ...!regexFilter ? { proxies: lowCostNodes } : { "include-all": true, filter: LOW_COST_NODE_MATCHER.pattern }
      } : null,
      ...countryProxyGroups
    ];
    return groups.filter(isNotNull);
  }
  var PROXY_TEST_URL;
  var init_proxy_groups = __esm({
    "src/proxy_groups.ts"() {
      "use strict";
      init_constants();
      init_utils();
      PROXY_TEST_URL = "http://cp.cloudflare.com/generate_204";
    }
  });

  // src/node_parser.ts
  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function buildCodeRegex(codes) {
    const codePattern = codes.map(escapeRegex).join("|");
    return new RegExp(
      String.raw`(?:^|[^A-Za-z0-9])(?:${codePattern})(?:[-_ ]?\d+(?:[-_ ]?[A-Za-z]{2,})?)?(?=$|[^A-Za-z0-9])`,
      "i"
    );
  }
  function buildFlagRegex(pattern) {
    const flags = Array.from(new Set(pattern.match(/\p{Regional_Indicator}{2}/gu) ?? []));
    if (flags.length === 0) return null;
    return new RegExp(flags.map(escapeRegex).join("|"), "u");
  }
  function resolveCountryByPriority(name) {
    for (const { country, flagRegex } of COUNTRY_MATCHERS) {
      if (!flagRegex?.test(name)) continue;
      return country;
    }
    for (const { country, codeRegex } of COUNTRY_MATCHERS) {
      if (!codeRegex?.test(name)) continue;
      return country;
    }
    for (const { country, fallbackRegex } of COUNTRY_MATCHERS) {
      if (!fallbackRegex.test(name)) continue;
      return country;
    }
    return null;
  }
  function parseLowCost(config) {
    return (config.proxies || []).filter((proxy) => LOW_COST_NODE_MATCHER.regex.test(proxy.name || "")).map((proxy) => proxy.name).filter((name) => Boolean(name));
  }
  function parseNodesByLanding(config) {
    const landingNodes = [];
    const nonLandingNodes = [];
    for (const proxy of config.proxies || []) {
      const name = proxy.name;
      if (!name) continue;
      if (LANDING_NODE_MATCHER.regex.test(name)) {
        landingNodes.push(name);
        continue;
      }
      nonLandingNodes.push(name);
    }
    return { landingNodes, nonLandingNodes };
  }
  function parseCountries(config, landing = false) {
    const proxies = config.proxies || [];
    const countryNodes = /* @__PURE__ */ Object.create(null);
    for (const proxy of proxies) {
      const name = proxy.name || "";
      if (landing && LANDING_NODE_MATCHER.regex.test(name)) continue;
      const country = resolveCountryByPriority(name);
      if (!country) continue;
      if (!countryNodes[country]) {
        countryNodes[country] = [];
      }
      countryNodes[country].push(name);
    }
    return Object.entries(countryNodes).map(([country, nodes]) => ({ country, nodes }));
  }
  function getCountryGroupNames(countryInfo, minCount) {
    const filtered = countryInfo.filter((item) => item.nodes.length >= minCount);
    filtered.sort((a, b) => {
      const wa = countriesMeta[a.country]?.weight ?? Infinity;
      const wb = countriesMeta[b.country]?.weight ?? Infinity;
      return wa - wb;
    });
    return filtered.map((item) => item.country + NODE_SUFFIX);
  }
  function stripNodeSuffix(groupNames) {
    const suffixPattern = new RegExp(`${NODE_SUFFIX}$`);
    return groupNames.map((name) => name.replace(suffixPattern, ""));
  }
  var COUNTRY_CODE_ALIASES, COUNTRY_MATCHERS;
  var init_node_parser = __esm({
    "src/node_parser.ts"() {
      "use strict";
      init_constants();
      COUNTRY_CODE_ALIASES = {
        香港: ["HK", "HKG"],
        澳门: ["MO"],
        台湾: ["TW", "TWN", "TPE", "ROC"],
        新加坡: ["SG", "SIN"],
        日本: ["JP", "JPN", "NRT", "HND", "KIX", "TYO", "OSA"],
        韩国: ["KR", "KOR", "ICN"],
        美国: [
          "US",
          "USA",
          "JFK",
          "EWR",
          "IAD",
          "ATL",
          "ORD",
          "MIA",
          "NYC",
          "LAX",
          "SFO",
          "SEA",
          "DFW",
          "SJC"
        ],
        加拿大: ["CA", "CAN", "YVR", "YYZ", "YUL"],
        英国: ["UK", "GB", "GBR", "LHR", "MAN"],
        澳大利亚: ["AU"],
        德国: ["DE", "DEU", "MUC"],
        法国: ["FR", "FRA", "CDG", "MRS"],
        俄罗斯: ["RU"],
        泰国: ["TH"],
        印度: ["IN"],
        马来西亚: ["MY"],
        阿根廷: ["AR", "EZE"],
        芬兰: ["FI", "HEL"],
        埃及: ["EG", "CAI"],
        菲律宾: ["PH", "MNL"],
        土耳其: ["TR", "IST"],
        乌克兰: ["UA", "KBP"]
      };
      COUNTRY_MATCHERS = Object.entries(countriesMeta).map(([country, meta]) => ({
        country,
        flagRegex: buildFlagRegex(meta.pattern),
        codeRegex: COUNTRY_CODE_ALIASES[country] ? buildCodeRegex(COUNTRY_CODE_ALIASES[country]) : null,
        fallbackRegex: new RegExp(meta.pattern.replace(/^\(\?i\)/, ""))
      }));
    }
  });

  // src/ipv6_nodes.ts
  function uniqueValues(values) {
    return Array.from(new Set(values));
  }
  function normalizeServerAddress(value) {
    if (typeof value !== "string") return null;
    const address = value.trim();
    if (!address) return null;
    if (address.startsWith("[") && address.endsWith("]")) {
      return address.slice(1, -1);
    }
    return address;
  }
  function stripIpv6Zone(address) {
    const zoneIndex = address.indexOf("%");
    return zoneIndex === -1 ? address : address.slice(0, zoneIndex);
  }
  function isIPv6Literal(address) {
    const normalized = stripIpv6Zone(address);
    return normalized.includes(":") && /^[0-9A-Fa-f:.]+$/.test(normalized) && /[0-9A-Fa-f]/.test(normalized);
  }
  function isIPv6OnlyHost(address) {
    if (isIPv6Literal(address)) return false;
    return IPV6_DDNS_HOST_PATTERN.test(address);
  }
  function isIPv6OnlyProxy(proxy) {
    const name = proxy.name || "";
    const server = normalizeServerAddress(proxy.server);
    return IPV6_ONLY_NAME_PATTERN.test(name) || Boolean(server && (isIPv6Literal(server) || isIPv6OnlyHost(server)));
  }
  function buildTunExcludeAddress(proxy) {
    const server = normalizeServerAddress(proxy.server);
    if (!server) return null;
    if (isIPv6Literal(server)) {
      return `${stripIpv6Zone(server)}/128`;
    }
    return null;
  }
  function applyIPv6NodeOptions({
    proxies,
    ipv6InterfaceName
  }) {
    if (!proxies) {
      return { proxies, routeExcludeAddress: [] };
    }
    const routeExcludeAddress = [];
    const nextProxies = proxies.map((proxy) => {
      const isIPv6Only = isIPv6OnlyProxy(proxy);
      if (!isIPv6Only) return proxy;
      const excludeAddress = buildTunExcludeAddress(proxy);
      if (excludeAddress) {
        routeExcludeAddress.push(excludeAddress);
      }
      return {
        ...proxy,
        "ip-version": "ipv6",
        ...ipv6InterfaceName ? { "interface-name": ipv6InterfaceName } : {}
      };
    });
    return {
      proxies: nextProxies,
      routeExcludeAddress: uniqueValues(routeExcludeAddress)
    };
  }
  var IPV6_ONLY_NAME_PATTERN, IPV6_DDNS_HOST_PATTERN;
  var init_ipv6_nodes = __esm({
    "src/ipv6_nodes.ts"() {
      "use strict";
      IPV6_ONLY_NAME_PATTERN = /(?:^|[^A-Za-z0-9])(?:ipv6|ip6|v6)(?:[-_\s]*only)?(?=$|[^A-Za-z0-9])|(?:纯|only[-_\s]*)(?:ipv6|ip6|v6)/i;
      IPV6_DDNS_HOST_PATTERN = /(?:^|[._-])(?:ipv6|ip6|v6)(?:$|[._-])|dynv6|(?:^|[._-])(?:v6.*ddns|ddns.*v6)(?:$|[._-])/i;
    }
  });

  // src/rule_catalog.ts
  function httpProvider({
    behavior,
    format,
    url,
    path
  }) {
    return {
      type: "http",
      behavior,
      format,
      interval: RULESET_INTERVAL,
      url,
      path
    };
  }
  function selfClassical(name) {
    return httpProvider({
      behavior: "classical",
      format: "text",
      url: `${SELF_CDN_URL}/ruleset/${name}.list`,
      path: `./ruleset/${name}.list`
    });
  }
  function sukkaRule({
    name,
    directory,
    file,
    behavior
  }) {
    return httpProvider({
      behavior,
      format: "text",
      url: `${SUKKA_CLASH_BASE}/${directory}/${file}.txt`,
      path: `./ruleset/${name}.txt`
    });
  }
  function blackmatrixClassical(ruleName, file = `${ruleName}_No_Resolve.yaml`) {
    return httpProvider({
      behavior: "classical",
      format: "yaml",
      url: `${BLACKMATRIX_CLASH_BASE}/${ruleName}/${file}`,
      path: `./ruleset/${ruleName}.yaml`
    });
  }
  function blackmatrixDomain(ruleName, file = `${ruleName}_Domain.txt`) {
    return httpProvider({
      behavior: "domain",
      format: "text",
      url: `${BLACKMATRIX_CLASH_BASE}/${ruleName}/${file}`,
      path: `./ruleset/${ruleName}_Domain.txt`
    });
  }
  function catalogItem(name, provider, target, stage) {
    return { name, provider, target, stage };
  }
  function sukkaDomainSet(name, file, target, stage) {
    return catalogItem(
      name,
      sukkaRule({ name, directory: "domainset", file, behavior: "domain" }),
      target,
      stage
    );
  }
  function sukkaClassical(name, directory, file, target, stage) {
    return catalogItem(
      name,
      sukkaRule({ name, directory, file, behavior: "classical" }),
      target,
      stage
    );
  }
  function blackmatrixItem(key, ruleName, target, stage, file) {
    return catalogItem(key, blackmatrixClassical(ruleName, file), target, stage);
  }
  var RULESET_INTERVAL, SUKKA_CLASH_BASE, BLACKMATRIX_CLASH_BASE, ruleCatalog;
  var init_rule_catalog = __esm({
    "src/rule_catalog.ts"() {
      "use strict";
      init_constants();
      RULESET_INTERVAL = 86400;
      SUKKA_CLASH_BASE = "https://ruleset.skk.moe/Clash";
      BLACKMATRIX_CLASH_BASE = `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/rule/Clash`;
      ruleCatalog = [
        catalogItem("ZJUInternal", selfClassical("ZJUInternal"), BUILTIN_DIRECT, "hardDirect"),
        catalogItem("ZJU", selfClassical("ZJU"), PROXY_GROUPS.ZJU, "hardDirect"),
        blackmatrixItem("Lan", "Lan", BUILTIN_DIRECT, "hardDirect"),
        catalogItem(
          "ADBlock",
          httpProvider({
            behavior: "domain",
            format: "yaml",
            url: `${CDN_URL}/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.yaml`,
            path: "./ruleset/ADBlock.yaml"
          }),
          PROXY_GROUPS.AD_BLOCK,
          "guard"
        ),
        catalogItem(
          "AdditionalFilter",
          selfClassical("AdditionalFilter"),
          PROXY_GROUPS.AD_BLOCK,
          "guard"
        ),
        catalogItem(
          "AdvertisingLite",
          blackmatrixDomain("AdvertisingLite"),
          PROXY_GROUPS.AD_BLOCK,
          "guard"
        ),
        sukkaClassical("SogouInput", "non_ip", "sogouinput", PROXY_GROUPS.PRIVACY, "guard"),
        blackmatrixItem("BlockHttpDNS", "BlockHttpDNS", PROXY_GROUPS.PRIVACY, "guard"),
        sukkaClassical("SukkaAI", "non_ip", "ai", PROXY_GROUPS.AI_SERVICE, "ai"),
        sukkaClassical(
          "AppleIntelligence",
          "non_ip",
          "apple_intelligence",
          PROXY_GROUPS.AI_SERVICE,
          "ai"
        ),
        blackmatrixItem("OpenAI", "OpenAI", PROXY_GROUPS.AI_SERVICE, "ai"),
        blackmatrixItem("Gemini", "Gemini", PROXY_GROUPS.AI_SERVICE, "ai"),
        blackmatrixItem("Claude", "Claude", PROXY_GROUPS.AI_SERVICE, "ai"),
        blackmatrixItem("Copilot", "Copilot", PROXY_GROUPS.AI_SERVICE, "ai"),
        blackmatrixItem("Civitai", "Civitai", PROXY_GROUPS.AI_SERVICE, "ai"),
        sukkaClassical("StreamUS", "non_ip", "stream_us", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        sukkaClassical("StreamUSIP", "ip", "stream_us", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        sukkaClassical("StreamEU", "non_ip", "stream_eu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        sukkaClassical("StreamEUIP", "ip", "stream_eu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("Netflix", "Netflix", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("YouTube", "YouTube", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("Disney", "Disney", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem(
          "AmazonPrimeVideo",
          "AmazonPrimeVideo",
          PROXY_GROUPS.OVERSEAS_MEDIA,
          "overseasMedia"
        ),
        blackmatrixItem("HBO", "HBO", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("Hulu", "Hulu", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("Spotify", "Spotify", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("TikTok", "TikTok", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("Twitch", "Twitch", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("ParamountPlus", "ParamountPlus", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        blackmatrixItem("DAZN", "DAZN", PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        catalogItem("EHentai", selfClassical("EHentai"), PROXY_GROUPS.OVERSEAS_MEDIA, "overseasMedia"),
        sukkaClassical("StreamHK", "non_ip", "stream_hk", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
        sukkaClassical("StreamHKIP", "ip", "stream_hk", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
        blackmatrixItem("TVB", "TVB", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
        blackmatrixItem("ViuTV", "ViuTV", PROXY_GROUPS.HK_MEDIA, "hkMedia"),
        sukkaClassical("StreamTW", "non_ip", "stream_tw", PROXY_GROUPS.TW_MEDIA, "twMedia"),
        sukkaClassical("StreamTWIP", "ip", "stream_tw", PROXY_GROUPS.TW_MEDIA, "twMedia"),
        blackmatrixItem("Bahamut", "Bahamut", PROXY_GROUPS.TW_MEDIA, "twMedia"),
        blackmatrixItem("KKTV", "KKTV", PROXY_GROUPS.TW_MEDIA, "twMedia"),
        blackmatrixItem("LiTV", "LiTV", PROXY_GROUPS.TW_MEDIA, "twMedia"),
        sukkaClassical("StreamJP", "non_ip", "stream_jp", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
        sukkaClassical("StreamJPIP", "ip", "stream_jp", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
        blackmatrixItem("AbemaTV", "AbemaTV", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
        blackmatrixItem("Niconico", "Niconico", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
        blackmatrixItem("HuluJP", "HuluJP", PROXY_GROUPS.JP_MEDIA, "jpMedia"),
        sukkaClassical("StreamKR", "non_ip", "stream_kr", PROXY_GROUPS.KR_MEDIA, "krMedia"),
        sukkaClassical("StreamKRIP", "ip", "stream_kr", PROXY_GROUPS.KR_MEDIA, "krMedia"),
        blackmatrixItem("BiliBili", "BiliBili", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        catalogItem("Weibo", selfClassical("Weibo"), PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("XiaoHongShu", "XiaoHongShu", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("DouYin", "DouYin", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("WeChat", "WeChat", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        catalogItem(
          "Tencent",
          blackmatrixDomain("Tencent"),
          PROXY_GROUPS.DOMESTIC_SERVICES,
          "domestic"
        ),
        blackmatrixItem("TencentVideo", "TencentVideo", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("iQIYI", "iQIYI", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("Youku", "Youku", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("NetEaseMusic", "NetEaseMusic", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        catalogItem(
          "GoogleFCM",
          selfClassical("FirebaseCloudMessaging"),
          PROXY_GROUPS.DOMESTIC_SERVICES,
          "domestic"
        ),
        sukkaClassical("AppleCN", "non_ip", "apple_cn", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("Telegram", "Telegram", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Twitter", "Twitter", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Facebook", "Facebook", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Instagram", "Instagram", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Threads", "Threads", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Reddit", "Reddit", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Discord", "Discord", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Whatsapp", "Whatsapp", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("Line", "Line", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("TruthSocial", "TruthSocial", PROXY_GROUPS.SOCIAL, "social"),
        blackmatrixItem("GitHub", "GitHub", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("GitLab", "GitLab", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Developer", "Developer", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Docker", "Docker", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Npmjs", "Npmjs", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Python", "Python", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Jetbrains", "Jetbrains", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Vercel", "Vercel", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("Cloudflare", "Cloudflare", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("HashiCorp", "HashiCorp", PROXY_GROUPS.DEVELOPER, "developer"),
        blackmatrixItem("SourceForge", "SourceForge", PROXY_GROUPS.DEVELOPER, "developer"),
        sukkaClassical("Microsoft", "non_ip", "microsoft", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        sukkaClassical(
          "AppleServices",
          "non_ip",
          "apple_services",
          PROXY_GROUPS.PRODUCTIVITY,
          "productivity"
        ),
        sukkaClassical(
          "AppleServicesIP",
          "ip",
          "apple_services",
          PROXY_GROUPS.PRODUCTIVITY,
          "productivity"
        ),
        blackmatrixItem("OneDrive", "OneDrive", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        blackmatrixItem("GoogleDrive", "GoogleDrive", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        blackmatrixItem("Dropbox", "Dropbox", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        blackmatrixItem("Notion", "Notion", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        blackmatrixItem("Slack", "Slack", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        blackmatrixItem("Teams", "Teams", PROXY_GROUPS.PRODUCTIVITY, "productivity"),
        sukkaDomainSet("StaticResources", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaClassical("CDNResources", "non_ip", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaClassical("CDNResourcesIP", "ip", "cdn", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaDomainSet("DownloadDomain", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaDomainSet("GameDownloadDomain", "game-download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaClassical("DownloadNonIP", "non_ip", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        sukkaClassical("DownloadIP", "ip", "download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        blackmatrixItem("Download", "Download", PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        catalogItem(
          "AdditionalCDNResources",
          selfClassical("AdditionalCDNResources"),
          PROXY_GROUPS.DOWNLOAD_STATIC,
          "download"
        ),
        catalogItem("SteamFix", selfClassical("SteamFix"), PROXY_GROUPS.DOWNLOAD_STATIC, "download"),
        blackmatrixItem("Steam", "Steam", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("SteamCN", "SteamCN", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Xbox", "Xbox", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("PlayStation", "PlayStation", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Nintendo", "Nintendo", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Epic", "Epic", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Blizzard", "Blizzard", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("EA", "EA", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Riot", "Riot", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("Ubisoft", "Ubisoft", PROXY_GROUPS.GAME, "game"),
        blackmatrixItem("HoYoverse", "HoYoverse", PROXY_GROUPS.GAME, "game"),
        catalogItem("Crypto", selfClassical("Crypto"), PROXY_GROUPS.FINANCE, "finance"),
        blackmatrixItem("Binance", "Binance", PROXY_GROUPS.FINANCE, "finance"),
        blackmatrixItem("OKX", "OKX", PROXY_GROUPS.FINANCE, "finance"),
        blackmatrixItem("PayPal", "PayPal", PROXY_GROUPS.FINANCE, "finance"),
        blackmatrixItem("Stripe", "Stripe", PROXY_GROUPS.FINANCE, "finance")
      ];
    }
  });

  // src/rules.ts
  function buildRuleSetRules(stage) {
    return ruleCatalog.filter((item) => item.stage === stage).map((item) => `RULE-SET,${item.name},${item.target}`);
  }
  function buildRules({
    routingType,
    quicEnabled,
    webRTCEnabled
  }) {
    const ruleList = [NTP_UDP_DIRECT_RULE];
    if (!quicEnabled) {
      ruleList.push(`AND,((DST-PORT,443),(NETWORK,UDP)),${BUILTIN_REJECT}`);
    }
    if (routingType === "whitelist") {
      ruleList.push(...STEAM_P2P_UDP_RULES);
      if (!webRTCEnabled) {
        ruleList.push(...WEBRTC_STUN_PROXY_RULES);
      }
    }
    return [...ruleList, ...routingType === "blacklist" ? BLACKLIST_RULES : WHITELIST_RULES];
  }
  var WEBRTC_STUN_UDP_PORTS, NTP_UDP_DIRECT_RULE, AGENTFN_DIRECT_RULE, STEAM_P2P_UDP_PORTS, WEBRTC_STUN_PROXY_RULES, STEAM_P2P_UDP_RULES, CORE_DIRECT_RULES, DOMESTIC_BASE_RULES, DOMESTIC_PLATFORM_RULES, AI_RULES, OVERSEAS_MEDIA_RULES, TW_MEDIA_RULES, DOMESTIC_SERVICE_RULES, SOCIAL_RULES, DEVELOPER_RULES, PRODUCTIVITY_RULES, DOWNLOAD_RULES, GAME_RULES, FALLBACK_RULES, WHITELIST_RULES, BLACKLIST_DIRECT_RULES, REGIONAL_ROUTING_RULES, BLACKLIST_PROXY_RULES, BLACKLIST_RULES;
  var init_rules = __esm({
    "src/rules.ts"() {
      "use strict";
      init_constants();
      init_rule_catalog();
      WEBRTC_STUN_UDP_PORTS = [
        3478,
        3479,
        5349,
        5350,
        19302,
        19303,
        19304,
        19305,
        19306,
        19307,
        19308,
        19309
      ];
      NTP_UDP_DIRECT_RULE = `AND,((DST-PORT,123),(NETWORK,UDP)),${BUILTIN_DIRECT}`;
      AGENTFN_DIRECT_RULE = `DOMAIN-SUFFIX,agentfn.io-vii.com,${BUILTIN_DIRECT}`;
      STEAM_P2P_UDP_PORTS = [
        3478,
        4379,
        4380,
        27014,
        27015,
        27016,
        27017,
        27018,
        27019,
        27020,
        27021,
        27022,
        27023,
        27024,
        27025,
        27026,
        27027,
        27028,
        27029,
        27030
      ];
      WEBRTC_STUN_PROXY_RULES = [
        `AND,((DOMAIN-KEYWORD,stun),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`,
        ...WEBRTC_STUN_UDP_PORTS.map(
          (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`
        )
      ];
      STEAM_P2P_UDP_RULES = STEAM_P2P_UDP_PORTS.map(
        (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.GAME}`
      );
      CORE_DIRECT_RULES = [
        `GEOSITE,private,${BUILTIN_DIRECT}`,
        `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
        AGENTFN_DIRECT_RULE,
        `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
        ...buildRuleSetRules("hardDirect")
      ];
      DOMESTIC_BASE_RULES = [
        `GEOSITE,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
        `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES},no-resolve`
      ];
      DOMESTIC_PLATFORM_RULES = [
        `GEOSITE,google-play@cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
        `GEOSITE,microsoft@cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`
      ];
      AI_RULES = [`GEOSITE,category-ai-!cn,${PROXY_GROUPS.AI_SERVICE}`];
      OVERSEAS_MEDIA_RULES = [
        `GEOSITE,youtube,${PROXY_GROUPS.OVERSEAS_MEDIA}`,
        `GEOSITE,netflix,${PROXY_GROUPS.OVERSEAS_MEDIA}`,
        `GEOIP,netflix,${PROXY_GROUPS.OVERSEAS_MEDIA},no-resolve`,
        `GEOSITE,spotify,${PROXY_GROUPS.OVERSEAS_MEDIA}`
      ];
      TW_MEDIA_RULES = [`GEOSITE,bahamut,${PROXY_GROUPS.TW_MEDIA}`];
      DOMESTIC_SERVICE_RULES = [`GEOSITE,bilibili,${PROXY_GROUPS.DOMESTIC_SERVICES}`];
      SOCIAL_RULES = [
        `GEOSITE,telegram,${PROXY_GROUPS.SOCIAL}`,
        `GEOIP,telegram,${PROXY_GROUPS.SOCIAL},no-resolve`,
        `GEOSITE,twitter,${PROXY_GROUPS.SOCIAL}`
      ];
      DEVELOPER_RULES = [`GEOSITE,github,${PROXY_GROUPS.DEVELOPER}`];
      PRODUCTIVITY_RULES = [
        `GEOSITE,apple,${PROXY_GROUPS.PRODUCTIVITY}`,
        `GEOSITE,microsoft,${PROXY_GROUPS.PRODUCTIVITY}`,
        `GEOSITE,google,${PROXY_GROUPS.PRODUCTIVITY}`
      ];
      DOWNLOAD_RULES = [`GEOSITE,pikpak,${PROXY_GROUPS.DOWNLOAD_STATIC}`];
      GAME_RULES = [`GEOSITE,xbox,${PROXY_GROUPS.GAME}`];
      FALLBACK_RULES = [
        `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
        `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
        `MATCH,${PROXY_GROUPS.SELECT}`
      ];
      WHITELIST_RULES = [
        ...CORE_DIRECT_RULES,
        ...DOMESTIC_BASE_RULES,
        ...buildRuleSetRules("guard"),
        ...buildRuleSetRules("ai"),
        ...AI_RULES,
        ...buildRuleSetRules("overseasMedia"),
        ...OVERSEAS_MEDIA_RULES,
        ...buildRuleSetRules("hkMedia"),
        ...buildRuleSetRules("twMedia"),
        ...TW_MEDIA_RULES,
        ...buildRuleSetRules("jpMedia"),
        ...buildRuleSetRules("krMedia"),
        ...DOMESTIC_PLATFORM_RULES,
        ...buildRuleSetRules("domestic"),
        ...DOMESTIC_SERVICE_RULES,
        ...buildRuleSetRules("social"),
        ...SOCIAL_RULES,
        ...buildRuleSetRules("developer"),
        ...DEVELOPER_RULES,
        ...buildRuleSetRules("productivity"),
        ...PRODUCTIVITY_RULES,
        ...buildRuleSetRules("download"),
        ...DOWNLOAD_RULES,
        ...buildRuleSetRules("game"),
        ...GAME_RULES,
        ...buildRuleSetRules("finance"),
        ...FALLBACK_RULES
      ];
      BLACKLIST_DIRECT_RULES = [
        `GEOSITE,private,${BUILTIN_DIRECT}`,
        `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
        AGENTFN_DIRECT_RULE,
        `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
        `RULE-SET,ZJUInternal,${BUILTIN_DIRECT}`,
        `RULE-SET,ZJU,${BUILTIN_DIRECT}`,
        `RULE-SET,Lan,${BUILTIN_DIRECT}`,
        `GEOSITE,cn,${BUILTIN_DIRECT}`,
        `GEOIP,cn,${BUILTIN_DIRECT},no-resolve`
      ];
      REGIONAL_ROUTING_RULES = [
        ...buildRuleSetRules("overseasMedia"),
        ...OVERSEAS_MEDIA_RULES,
        ...buildRuleSetRules("hkMedia"),
        ...buildRuleSetRules("twMedia"),
        ...TW_MEDIA_RULES,
        ...buildRuleSetRules("jpMedia"),
        ...buildRuleSetRules("krMedia")
      ];
      BLACKLIST_PROXY_RULES = [
        ...AI_RULES,
        `RULE-SET,StaticResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
        `RULE-SET,CDNResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
        `RULE-SET,CDNResourcesIP,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
        `RULE-SET,AdditionalCDNResources,${PROXY_GROUPS.DOWNLOAD_STATIC}`,
        ...REGIONAL_ROUTING_RULES,
        `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
        `GEOIP,cn,${BUILTIN_DIRECT}`,
        `MATCH,${BUILTIN_DIRECT}`
      ];
      BLACKLIST_RULES = [...BLACKLIST_DIRECT_RULES, ...BLACKLIST_PROXY_RULES];
    }
  });

  // src/rule_providers.ts
  var ruleProviders;
  var init_rule_providers = __esm({
    "src/rule_providers.ts"() {
      "use strict";
      init_rule_catalog();
      ruleProviders = Object.fromEntries(
        ruleCatalog.map(({ name, provider }) => [name, provider])
      );
    }
  });

  // src/dns.ts
  function buildDnsConfig({
    mode,
    ipv6Enabled,
    lanEnabled,
    dnsListen,
    fakeIpFilter
  }) {
    const config = {
      enable: true,
      ...lanEnabled ? { listen: dnsListen } : {},
      ipv6: ipv6Enabled,
      // Mihomo docs explicitly discourage combining prefer-h3 with respect-rules.
      "prefer-h3": false,
      "respect-rules": true,
      "enhanced-mode": mode,
      "proxy-server-nameserver": [...INTERNAL_DNS_SERVERS],
      "default-nameserver": [...INTERNAL_DNS_SERVERS],
      nameserver: ["tcp://1.1.1.1:53", "tcp://8.8.8.8:53"],
      fallback: ["tcp://1.0.0.1:53", "tcp://8.8.4.4:53", "tls://1.1.1.1:853"],
      "nameserver-policy": {
        "+.zju.edu.cn": [...INTERNAL_DNS_SERVERS],
        "geosite:cn": [...INTERNAL_DNS_SERVERS],
        ...Object.fromEntries(
          [...ZJU_DNS_POLICY_RULE_SETS, ...WECHAT_QQ_DNS_POLICY_RULE_SETS].map((ruleSet) => [
            ruleSet,
            [...INTERNAL_DNS_SERVERS]
          ])
        )
      }
    };
    if (fakeIpFilter) {
      config["fake-ip-range"] = "198.18.0.1/16";
      config["fake-ip-range6"] = "fd88:413:626:821::/64";
      config["fake-ip-filter"] = fakeIpFilter;
    }
    return config;
  }
  function buildDns({
    fakeIPEnabled,
    ipv6Enabled,
    lanEnabled,
    dnsListen
  }) {
    if (fakeIPEnabled) {
      return buildDnsConfig({
        mode: "fake-ip",
        ipv6Enabled,
        lanEnabled,
        dnsListen,
        fakeIpFilter: BASE_FAKE_IP_FILTER
      });
    }
    return buildDnsConfig({ mode: "redir-host", ipv6Enabled, lanEnabled, dnsListen });
  }
  var INTERNAL_DNS_SERVERS, ZJU_DNS_POLICY_RULE_SETS, WECHAT_QQ_DNS_POLICY_RULE_SETS, LOCAL_DOMAIN_FAKE_IP_FILTER, NTP_FAKE_IP_FILTER, BASE_FAKE_IP_FILTER, snifferConfig;
  var init_dns = __esm({
    "src/dns.ts"() {
      "use strict";
      INTERNAL_DNS_SERVERS = ["10.10.0.21", "10.10.2.21"];
      ZJU_DNS_POLICY_RULE_SETS = ["rule-set:ZJU"];
      WECHAT_QQ_DNS_POLICY_RULE_SETS = ["rule-set:Tencent", "rule-set:WeChat"];
      LOCAL_DOMAIN_FAKE_IP_FILTER = [
        "+.lan",
        "+.local",
        "+.localdomain",
        "+.home",
        "+.home.arpa",
        "+.internal"
      ];
      NTP_FAKE_IP_FILTER = [
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
        "time5.cloud.tencent.com"
      ];
      BASE_FAKE_IP_FILTER = [
        "geosite:cn",
        "geosite:private",
        "geosite:connectivity-check",
        ...ZJU_DNS_POLICY_RULE_SETS,
        ...LOCAL_DOMAIN_FAKE_IP_FILTER,
        ...NTP_FAKE_IP_FILTER,
        "Mijia Cloud",
        "dlg.io.mi.com",
        "localhost.ptlogin2.qq.com",
        "+.icloud.com",
        "+.push.apple.com"
      ];
      snifferConfig = {
        sniff: {
          TLS: {
            ports: [443, 8443]
          },
          HTTP: {
            ports: [80, "8080-8880"],
            "override-destination": true
          },
          QUIC: {
            ports: [443, 8443]
          }
        },
        "override-destination": false,
        enable: true,
        "force-dns-mapping": true,
        "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"]
      };
    }
  });

  // src/tun.ts
  function uniqueValues2(values) {
    return Array.from(new Set(values));
  }
  function buildTunConfig({
    tunEnabled,
    lanEnabled,
    routeExcludeAddress = []
  }) {
    const baseRouteExcludeAddress = lanEnabled ? LAN_ROUTE_EXCLUDE_ADDRESS : DEFAULT_ROUTE_EXCLUDE_ADDRESS;
    return {
      enable: tunEnabled,
      stack: "system",
      device: "Mihomo_Tun",
      "route-exclude-address": uniqueValues2([...baseRouteExcludeAddress, ...routeExcludeAddress]),
      "dns-hijack": ["any:53", "tcp://any:53", "tls://any:853"],
      mtu: 1500,
      "auto-route": true,
      ...tunEnabled && lanEnabled ? { "auto-redirect": true } : {},
      "auto-detect-interface": true,
      "strict-route": true
    };
  }
  var DEFAULT_ROUTE_EXCLUDE_ADDRESS, LAN_ROUTE_EXCLUDE_ADDRESS;
  var init_tun = __esm({
    "src/tun.ts"() {
      "use strict";
      DEFAULT_ROUTE_EXCLUDE_ADDRESS = [
        "10.0.0.0/8",
        "172.16.0.0/12",
        "100.64.0.0/10",
        "192.168.0.0/16",
        "fd7a:115c:a1e0::/48"
      ];
      LAN_ROUTE_EXCLUDE_ADDRESS = DEFAULT_ROUTE_EXCLUDE_ADDRESS.filter(
        (address) => address !== "10.0.0.0/8"
      );
    }
  });

  // src/selectors.ts
  function buildBaseLists({
    landing,
    lowCostNodes,
    countryGroupNames,
    nonLandingNodes,
    regexFilter,
    fallbackEnabled
  }) {
    const lowCost = lowCostNodes.length > 0 || regexFilter;
    const defaultSelector = buildList(
      PROXY_GROUPS.AUTO,
      !fallbackEnabled && PROXY_GROUPS.FALLBACK,
      landing && PROXY_GROUPS.LANDING,
      countryGroupNames,
      lowCost && PROXY_GROUPS.LOW_COST,
      PROXY_GROUPS.MANUAL,
      BUILTIN_DIRECT
    );
    const defaultFallback = buildList(
      landing && PROXY_GROUPS.LANDING,
      countryGroupNames,
      lowCost && PROXY_GROUPS.LOW_COST,
      PROXY_GROUPS.MANUAL,
      BUILTIN_DIRECT
    );
    const frontProxySelector = buildList(
      countryGroupNames,
      BUILTIN_DIRECT,
      !regexFilter && nonLandingNodes
    );
    return {
      defaultSelector,
      defaultFallback,
      frontProxySelector
    };
  }
  var init_selectors = __esm({
    "src/selectors.ts"() {
      "use strict";
      init_constants();
      init_utils();
    }
  });

  // src/clash_verge_rules.ts
  var CLASH_VERGE_RULES;
  var init_clash_verge_rules = __esm({
    "src/clash_verge_rules.ts"() {
      "use strict";
      CLASH_VERGE_RULES = [
        "AND,((IP-CIDR,180.184.249.140/32),(DST-PORT,11468)),SenseCore Cluster",
        "DOMAIN-SUFFIX,chatgpt.com,OpenAI",
        "DOMAIN-SUFFIX,openai.com,OpenAI",
        "DOMAIN-SUFFIX,oaistatic.com,OpenAI",
        "DOMAIN-SUFFIX,oaiusercontent.com,OpenAI",
        "IP-CIDR,180.184.249.129/32,SenseCore Cluster,no-resolve",
        "DOMAIN-SUFFIX,sensecore.cn,SenseCore Cluster",
        "DOMAIN-KEYWORD,sensecore,SenseCore Cluster",
        "DOMAIN,management.sensecoreapi.cn,SenseCore Cluster",
        "PROCESS-NAME,ssh.exe,DIRECT",
        "DST-PORT,1145,DIRECT",
        "DOMAIN-SUFFIX,qpic.cn,DIRECT",
        "DOMAIN-SUFFIX,qlogo.cn,DIRECT",
        "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
        "DOMAIN-SUFFIX,wechat.com,DIRECT",
        "DOMAIN-SUFFIX,qq.com,DIRECT",
        "DOMAIN-SUFFIX,tencent.com,DIRECT",
        "DOMAIN-KEYWORD,weixin,DIRECT",
        "DOMAIN-KEYWORD,wechat,DIRECT",
        "DOMAIN-KEYWORD,nexushd,DIRECT",
        "DOMAIN-SUFFIX,yunazju.fun,DIRECT",
        "DOMAIN-KEYWORD,zju,DIRECT",
        "DOMAIN-SUFFIX,zju.edu.cn,DIRECT",
        "IP-CIDR,8.209.202.169/32,DIRECT",
        "IP-CIDR,10.0.0.0/8,DIRECT",
        "GEOIP,CN,DIRECT",
        "DST-PORT,8080,DIRECT",
        "DOMAIN-SUFFIX,localhost,DIRECT",
        "DOMAIN-SUFFIX,localhost.localdomain,DIRECT",
        "DOMAIN-SUFFIX,local,DIRECT",
        "DOMAIN-SUFFIX,.internal,DIRECT",
        "DOMAIN-SUFFIX,.intranet,DIRECT",
        "DOMAIN-SUFFIX,.corp,DIRECT",
        "DOMAIN-SUFFIX,.private,DIRECT",
        "DOMAIN-SUFFIX,router.asus.com,DIRECT",
        "DOMAIN-SUFFIX,tplinkwifi.net,DIRECT",
        "DOMAIN-SUFFIX,tplogin.cn,DIRECT",
        "DOMAIN-SUFFIX,tendawifi.com,DIRECT",
        "DOMAIN-SUFFIX,miwifi.com,DIRECT",
        "DOMAIN-SUFFIX,router.ctc,DIRECT",
        "DOMAIN-SUFFIX,my.router,DIRECT",
        "DOMAIN-SUFFIX,fritz.box,DIRECT",
        "DOMAIN-SUFFIX,myrouter.local,DIRECT",
        "DOMAIN-SUFFIX,netgear.com,DIRECT",
        "DOMAIN-SUFFIX,routerlogin.net,DIRECT",
        "DOMAIN-SUFFIX,linksyssmartwifi.com,DIRECT",
        "DOMAIN-SUFFIX,synology.me,DIRECT",
        "DOMAIN-SUFFIX,myqnapcloud.com,DIRECT",
        "DOMAIN-SUFFIX,.test,DIRECT",
        "DOMAIN-SUFFIX,.example,DIRECT",
        "DOMAIN-SUFFIX,.invalid,DIRECT",
        "DOMAIN-SUFFIX,.localhost,DIRECT",
        "DOMAIN-SUFFIX,.dev.local,DIRECT",
        "DOMAIN-SUFFIX,.test.local,DIRECT",
        "DOMAIN-SUFFIX,localdomain,DIRECT",
        "DOMAIN-KEYWORD,.local,DIRECT",
        "DOMAIN-KEYWORD,localhost,DIRECT",
        "DOMAIN-SUFFIX,test-01-cn.gladns.com,DIRECT",
        "DOMAIN-SUFFIX,test-01-cn.gladns.net,DIRECT",
        "DOMAIN-SUFFIX,glados.vip,US Fixed IP",
        "DOMAIN-SUFFIX,glados.work,TW Fixed IP",
        "DOMAIN-SUFFIX,ipinfo.io,Default Proxy",
        "DOMAIN-SUFFIX,ip-api.com,Default Proxy",
        "DOMAIN-SUFFIX,ipapi.co,Default Proxy",
        "DOMAIN-SUFFIX,ipify.org,Default Proxy",
        "DOMAIN-SUFFIX,api.ipify.org,Default Proxy",
        "DOMAIN-SUFFIX,icanhazip.com,Default Proxy",
        "DOMAIN-SUFFIX,ifconfig.me,Default Proxy",
        "DOMAIN-SUFFIX,ifconfig.co,Default Proxy",
        "DOMAIN-SUFFIX,checkip.amazonaws.com,Default Proxy",
        "DOMAIN-SUFFIX,ipecho.net,Default Proxy",
        "DOMAIN-SUFFIX,myip.com,Default Proxy",
        "DOMAIN-SUFFIX,whatismyip.com,Default Proxy",
        "DOMAIN-SUFFIX,whatismyipaddress.com,Default Proxy",
        "DOMAIN-SUFFIX,whoer.net,Default Proxy",
        "DOMAIN-SUFFIX,ipleak.net,Default Proxy",
        "DOMAIN-SUFFIX,ipleak.org,Default Proxy",
        "DOMAIN-SUFFIX,ip.me,Default Proxy",
        "DOMAIN-SUFFIX,ip.sb,Default Proxy",
        "DOMAIN-SUFFIX,ip.gs,Default Proxy",
        "DOMAIN-SUFFIX,ip138.com,Default Proxy",
        "DOMAIN-SUFFIX,ipip.net,Default Proxy",
        "DOMAIN-SUFFIX,cip.cc,Default Proxy",
        "DOMAIN-SUFFIX,myip.la,Default Proxy",
        "DOMAIN-SUFFIX,ip.skk.moe,Default Proxy",
        "DOMAIN-SUFFIX,ip.tool.lu,Default Proxy",
        "DOMAIN-SUFFIX,dnsleaktest.com,Default Proxy",
        "DOMAIN-SUFFIX,dnsleak.com,Default Proxy",
        "DOMAIN-SUFFIX,browserleaks.com,Default Proxy",
        "DOMAIN-SUFFIX,bash.ws,Default Proxy",
        "DOMAIN-SUFFIX,webrtc-leak.glitch.me,Default Proxy",
        "DOMAIN-SUFFIX,ip2location.com,Default Proxy",
        "DOMAIN-SUFFIX,maxmind.com,Default Proxy",
        "DOMAIN-SUFFIX,geoiplookup.net,Default Proxy",
        "DOMAIN-SUFFIX,db-ip.com,Default Proxy",
        "DOMAIN-SUFFIX,ipgeolocation.io,Default Proxy",
        "DOMAIN-SUFFIX,ipstack.com,Default Proxy",
        "DOMAIN-SUFFIX,ipdata.co,Default Proxy",
        "DOMAIN-SUFFIX,abstractapi.com,Default Proxy",
        "DOMAIN-SUFFIX,ip-score.com,Default Proxy",
        "DOMAIN-SUFFIX,speedtest.net,Default Proxy",
        "DOMAIN-SUFFIX,fast.com,Default Proxy",
        "DOMAIN-SUFFIX,speedof.me,Default Proxy",
        "DOMAIN-KEYWORD,whatismyip,Default Proxy",
        "DOMAIN-KEYWORD,myipaddress,Default Proxy",
        "DOMAIN-KEYWORD,ipleak,Default Proxy",
        "DOMAIN-KEYWORD,ipcheck,Default Proxy",
        "DOMAIN-KEYWORD,checkip,Default Proxy",
        "DOMAIN-SUFFIX,microsoft.com,DIRECT",
        "DOMAIN-SUFFIX,microsoftonline.com,DIRECT",
        "DOMAIN-SUFFIX,msftauth.net,DIRECT",
        "DOMAIN-SUFFIX,msauth.net,DIRECT",
        "DOMAIN-SUFFIX,msauthimages.net,DIRECT",
        "DOMAIN-SUFFIX,msftauthimages.net,DIRECT",
        "DOMAIN-SUFFIX,msn.com,DIRECT",
        "DOMAIN-SUFFIX,live.com,DIRECT",
        "DOMAIN-SUFFIX,office.com,DIRECT",
        "DOMAIN-SUFFIX,office365.com,DIRECT",
        "DOMAIN-SUFFIX,sharepoint.com,DIRECT",
        "DOMAIN-SUFFIX,outlook.com,DIRECT",
        "DOMAIN-SUFFIX,hotmail.com,DIRECT",
        "DOMAIN-SUFFIX,windows.com,DIRECT",
        "DOMAIN-SUFFIX,windows.net,DIRECT",
        "DOMAIN-SUFFIX,azure.com,DIRECT",
        "DOMAIN-SUFFIX,azure.net,DIRECT",
        "DOMAIN-SUFFIX,azureedge.net,DIRECT",
        "DOMAIN-SUFFIX,azurewebsites.net,DIRECT",
        "DOMAIN-SUFFIX,bing.com,DIRECT",
        "DOMAIN-SUFFIX,bing.net,DIRECT",
        "DOMAIN-SUFFIX,skype.com,DIRECT",
        "DOMAIN-SUFFIX,linkedin.com,DIRECT",
        "DOMAIN-SUFFIX,licdn.com,DIRECT",
        "DOMAIN-SUFFIX,onenote.com,DIRECT",
        "DOMAIN-SUFFIX,onenote.net,DIRECT",
        "DOMAIN-SUFFIX,onedrive.com,DIRECT",
        "DOMAIN-SUFFIX,onedrive.live.com,DIRECT",
        "DOMAIN-SUFFIX,teams.microsoft.com,DIRECT",
        "DOMAIN-SUFFIX,visualstudio.com,DIRECT",
        "DOMAIN-SUFFIX,xbox.com,DIRECT",
        "DOMAIN-SUFFIX,xboxlive.com,DIRECT",
        "DOMAIN-SUFFIX,windowsupdate.com,DIRECT",
        "DOMAIN-SUFFIX,msedge.net,DIRECT",
        "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
        "DOMAIN-SUFFIX,exp-tas.com,DIRECT",
        "DOMAIN-KEYWORD,microsoft,DIRECT",
        "DOMAIN-KEYWORD,msft,DIRECT",
        "DOMAIN-SUFFIX,apple.com,DIRECT",
        "DOMAIN-SUFFIX,apple.com.cn,DIRECT",
        "DOMAIN-SUFFIX,cdn-apple.com,DIRECT",
        "DOMAIN-SUFFIX,icloud.com,DIRECT",
        "DOMAIN-SUFFIX,icloud-content.com,DIRECT",
        "DOMAIN-SUFFIX,me.com,DIRECT",
        "DOMAIN-SUFFIX,appsto.re,DIRECT",
        "DOMAIN-SUFFIX,apps.apple.com,DIRECT",
        "DOMAIN-SUFFIX,mzstatic.com,DIRECT",
        "DOMAIN-SUFFIX,itunes.apple.com,DIRECT",
        "DOMAIN-SUFFIX,iosapps.itunes.apple.com,DIRECT",
        "DOMAIN-SUFFIX,osxapps.itunes.apple.com,DIRECT",
        "DOMAIN-SUFFIX,music.apple.com,DIRECT",
        "DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT",
        "DOMAIN-SUFFIX,apple-livephotoskit.com,DIRECT",
        "DOMAIN-SUFFIX,appleid.apple.com,DIRECT",
        "DOMAIN-SUFFIX,appleid.cdn-apple.com,DIRECT",
        "DOMAIN-SUFFIX,appleiphonecell.com,DIRECT",
        "DOMAIN-SUFFIX,apzones.com,DIRECT",
        "DOMAIN-SUFFIX,swcdn.apple.com,DIRECT",
        "DOMAIN-SUFFIX,swdist.apple.com,DIRECT",
        "DOMAIN-SUFFIX,swdownload.apple.com,DIRECT",
        "DOMAIN-SUFFIX,updates.cdn-apple.com,DIRECT",
        "DOMAIN-SUFFIX,updates-http.cdn-apple.com,DIRECT",
        "DOMAIN-SUFFIX,appldnld.apple.com,DIRECT",
        "DOMAIN-SUFFIX,xp.apple.com,DIRECT",
        "DOMAIN-SUFFIX,gdmf.apple.com,DIRECT",
        "DOMAIN-SUFFIX,mesu.apple.com,DIRECT",
        "DOMAIN-SUFFIX,osrecovery.apple.com,DIRECT",
        "DOMAIN-SUFFIX,tv.apple.com,DIRECT",
        "DOMAIN-SUFFIX,news.apple.com,DIRECT",
        "DOMAIN-SUFFIX,apple.news,DIRECT",
        "DOMAIN-SUFFIX,push.apple.com,DIRECT",
        "DOMAIN-SUFFIX,setup.icloud.com,DIRECT",
        "DOMAIN-SUFFIX,www.apple.com,DIRECT",
        "DOMAIN-SUFFIX,aaplimg.com,DIRECT",
        "DOMAIN-SUFFIX,apple.co,DIRECT",
        "DOMAIN-SUFFIX,applimg.com,DIRECT",
        "DOMAIN-KEYWORD,apple,DIRECT",
        "DOMAIN-KEYWORD,icloud,DIRECT",
        "DOMAIN-KEYWORD,itunes,DIRECT",
        "DOMAIN-SUFFIX,telegram.org,Default Proxy",
        "DOMAIN-SUFFIX,t.me,Default Proxy",
        "DOMAIN-SUFFIX,telegram.me,Default Proxy",
        "DOMAIN-SUFFIX,telegra.ph,Default Proxy",
        "DOMAIN-SUFFIX,telesco.pe,Default Proxy",
        "DOMAIN-SUFFIX,discord.com,Default Proxy",
        "DOMAIN-SUFFIX,discord.gg,Default Proxy",
        "DOMAIN-SUFFIX,discordapp.com,Default Proxy",
        "DOMAIN-SUFFIX,discordapp.net,Default Proxy",
        "DOMAIN-SUFFIX,discord.media,Default Proxy",
        "DOMAIN-SUFFIX,whatsapp.com,Default Proxy",
        "DOMAIN-SUFFIX,whatsapp.net,Default Proxy",
        "DOMAIN-SUFFIX,wa.me,Default Proxy",
        "DOMAIN-KEYWORD,telegram,Default Proxy",
        "DOMAIN-KEYWORD,discord,Default Proxy",
        "DOMAIN-SUFFIX,twitter.com,SpaceX",
        "DOMAIN-SUFFIX,x.com,SpaceX",
        "DOMAIN-SUFFIX,twimg.com,SpaceX",
        "DOMAIN-SUFFIX,t.co,SpaceX",
        "DOMAIN-SUFFIX,twittercdn.com,SpaceX",
        "DOMAIN-SUFFIX,x.ai,SpaceX",
        "DOMAIN-SUFFIX,grok.com,SpaceX",
        "DOMAIN-SUFFIX,grokipedia.com,SpaceX",
        "DOMAIN-SUFFIX,spacex.com,SpaceX",
        "DOMAIN-SUFFIX,starlink.com,SpaceX",
        "DOMAIN-SUFFIX,tesla.com,SpaceX",
        "DOMAIN-SUFFIX,teslamotors.com,SpaceX",
        "DOMAIN-SUFFIX,tesla.services,SpaceX",
        "DOMAIN-SUFFIX,teslaenergy.services,SpaceX",
        "DOMAIN-SUFFIX,teslazta.net,SpaceX",
        "DOMAIN-SUFFIX,solarcity.com,SpaceX",
        "DOMAIN-SUFFIX,ts.la,SpaceX",
        "DOMAIN-KEYWORD,twitter,SpaceX",
        "DOMAIN-SUFFIX,twitter.com,Default Proxy",
        "DOMAIN-SUFFIX,x.com,Default Proxy",
        "DOMAIN-SUFFIX,twimg.com,Default Proxy",
        "DOMAIN-SUFFIX,t.co,Default Proxy",
        "DOMAIN-SUFFIX,twittercdn.com,Default Proxy",
        "DOMAIN-SUFFIX,facebook.com,Default Proxy",
        "DOMAIN-SUFFIX,fbcdn.net,Default Proxy",
        "DOMAIN-SUFFIX,fb.com,Default Proxy",
        "DOMAIN-SUFFIX,fb.me,Default Proxy",
        "DOMAIN-SUFFIX,fbsbx.com,Default Proxy",
        "DOMAIN-SUFFIX,facebook.net,Default Proxy",
        "DOMAIN-SUFFIX,tfbnw.net,Default Proxy",
        "DOMAIN-SUFFIX,instagram.com,Default Proxy",
        "DOMAIN-SUFFIX,cdninstagram.com,Default Proxy",
        "DOMAIN-SUFFIX,instagr.am,Default Proxy",
        "DOMAIN-SUFFIX,reddit.com,Default Proxy",
        "DOMAIN-SUFFIX,redd.it,Default Proxy",
        "DOMAIN-SUFFIX,redditmedia.com,Default Proxy",
        "DOMAIN-SUFFIX,redditstatic.com,Default Proxy",
        "DOMAIN-KEYWORD,twitter,Default Proxy",
        "DOMAIN-KEYWORD,facebook,Default Proxy",
        "DOMAIN-KEYWORD,instagram,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.global,Default Proxy",
        "DOMAIN-SUFFIX,lbctrl.com,Default Proxy",
        "DOMAIN-SUFFIX,lbkrs.com,Default Proxy",
        "DOMAIN-SUFFIX,wbrks.com,Default Proxy",
        "DOMAIN-SUFFIX,lbkg.net,Default Proxy",
        "DOMAIN-SUFFIX,lb-static.com,Default Proxy",
        "DOMAIN-SUFFIX,longportapp.cn,Default Proxy",
        "DOMAIN-SUFFIX,longportapp.com,Default Proxy",
        "DOMAIN-SUFFIX,longportapp.hk,Default Proxy",
        "DOMAIN-SUFFIX,longbridgeapp.com,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.com,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.cloud,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.cn,Default Proxy",
        "DOMAIN-SUFFIX,longbridgehk.com,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.hk,Default Proxy",
        "DOMAIN-SUFFIX,longbridge.sg,Default Proxy",
        "DOMAIN-SUFFIX,longbridge-inc.com,Default Proxy",
        "DOMAIN-SUFFIX,futuhk.com,Default Proxy",
        "DOMAIN-SUFFIX,futusg.com,Default Proxy",
        "DOMAIN-SUFFIX,futu.link,Default Proxy",
        "DOMAIN-SUFFIX,futunn.com,Default Proxy",
        "DOMAIN-SUFFIX,futunn.cn,Default Proxy",
        "DOMAIN-SUFFIX,futuhn.com,Default Proxy",
        "DOMAIN-SUFFIX,futusign.com,Default Proxy",
        "DOMAIN-SUFFIX,futuinc.com,Default Proxy",
        "DOMAIN-SUFFIX,futu.com,Default Proxy",
        "DOMAIN-SUFFIX,futu0.com,Default Proxy",
        "DOMAIN-SUFFIX,futu1.com,Default Proxy",
        "DOMAIN-SUFFIX,futu2.com,Default Proxy",
        "DOMAIN-SUFFIX,futu3.com,Default Proxy",
        "DOMAIN-SUFFIX,futu4.com,Default Proxy",
        "DOMAIN-SUFFIX,futu5.com,Default Proxy",
        "DOMAIN-SUFFIX,futu6.com,Default Proxy",
        "DOMAIN-SUFFIX,futu7.com,Default Proxy",
        "DOMAIN-SUFFIX,futu8.com,Default Proxy",
        "DOMAIN-SUFFIX,futu9.com,Default Proxy",
        "DOMAIN-SUFFIX,futuniuniu.com,Default Proxy",
        "DOMAIN-SUFFIX,futu.cn,Default Proxy",
        "DOMAIN-SUFFIX,futufin.com,Default Proxy",
        "DOMAIN-SUFFIX,futuhk2.com,Default Proxy",
        "DOMAIN-SUFFIX,futuholdings.com,Default Proxy",
        "DOMAIN-SUFFIX,futuesop.com,Default Proxy",
        "DOMAIN-SUFFIX,futuau.com,Default Proxy",
        "DOMAIN-SUFFIX,futuhk1.com,Default Proxy",
        "DOMAIN-SUFFIX,futuhkapp.com,Default Proxy",
        "DOMAIN-SUFFIX,futuoa.com,Default Proxy",
        "DOMAIN-SUFFIX,futubull.cn,Default Proxy",
        "DOMAIN-SUFFIX,futuchain.com,Default Proxy",
        "DOMAIN-SUFFIX,futuone.com,Default Proxy",
        "DOMAIN-SUFFIX,futuclean.com,Default Proxy",
        "DOMAIN-SUFFIX,ftnndn.com,Default Proxy",
        "DOMAIN-SUFFIX,futuweb.com,Default Proxy",
        "DOMAIN-SUFFIX,futures.hk,Default Proxy",
        "DOMAIN-SUFFIX,moomoo.com,Default Proxy",
        "DOMAIN-SUFFIX,moomoo-us.com,Default Proxy",
        "DOMAIN-SUFFIX,moomooequity.com,Default Proxy",
        "DOMAIN-SUFFIX,moomootrustee.com,Default Proxy",
        "DOMAIN-SUFFIX,fututrade.com,Default Proxy",
        "DOMAIN-SUFFIX,futusecurities.com,Default Proxy",
        "DOMAIN-SUFFIX,futumkt.com,Default Proxy",
        "DOMAIN-SUFFIX,futu.sg,Default Proxy",
        "DOMAIN-SUFFIX,futu.au,Default Proxy",
        "DOMAIN-SUFFIX,futustatic.com,Default Proxy",
        "DOMAIN-SUFFIX,atigrpulse.com,Default Proxy",
        "DOMAIN-SUFFIX,atigrzen.com,Default Proxy",
        "DOMAIN-SUFFIX,itigergrowth.com,Default Proxy",
        "DOMAIN-SUFFIX,itigergrowtha.com,Default Proxy",
        "DOMAIN-SUFFIX,skytigris.cn,Default Proxy",
        "DOMAIN-SUFFIX,skytigris.com,Default Proxy",
        "DOMAIN-SUFFIX,tigrdw.com,Default Proxy",
        "DOMAIN-SUFFIX,tigrwd.com,Default Proxy",
        "DOMAIN-SUFFIX,tigerbrokers.com,Default Proxy",
        "DOMAIN-SUFFIX,tigerbrokers.com.au,Default Proxy",
        "DOMAIN-SUFFIX,tigerbrokers.com.hk,Default Proxy",
        "DOMAIN-SUFFIX,tigerbrokers.com.sg,Default Proxy",
        "DOMAIN-SUFFIX,tigerbrokers.nz,Default Proxy",
        "DOMAIN-SUFFIX,tigersecurities.com,Default Proxy",
        "DOMAIN-SUFFIX,tradeup.com,Default Proxy",
        "DOMAIN-SUFFIX,laohu8.com,Default Proxy",
        "DOMAIN-SUFFIX,tigerbbs.cn,Default Proxy",
        "DOMAIN-SUFFIX,tigerbbs.com,Default Proxy",
        "DOMAIN-SUFFIX,xiaohu8.com,Default Proxy",
        "DOMAIN-SUFFIX,zhijianfengyi.cn,Default Proxy",
        "DOMAIN-SUFFIX,zhijianfengyi.com,Default Proxy",
        "DOMAIN-KEYWORD,futunn,Default Proxy",
        "DOMAIN-KEYWORD,futubull,Default Proxy",
        "DOMAIN-KEYWORD,futuhk,Default Proxy",
        "DOMAIN-KEYWORD,futufin,Default Proxy",
        "DOMAIN-KEYWORD,futuholdings,Default Proxy",
        "DOMAIN-KEYWORD,futuniuniu,Default Proxy",
        "DOMAIN-KEYWORD,futuesop,Default Proxy",
        "DOMAIN-KEYWORD,moomoo,Default Proxy",
        "DOMAIN-KEYWORD,tigerbrokers,Default Proxy",
        "DOMAIN-SUFFIX,huggingface.co,Download",
        "DOMAIN-SUFFIX,cdn-lfs.huggingface.co,Download",
        "DOMAIN-SUFFIX,cdn-lfs-us-1.huggingface.co,Download",
        "DOMAIN-SUFFIX,cdn-lfs-eu-1.huggingface.co,Download",
        "DOMAIN-SUFFIX,s3.amazonaws.com,Download",
        "DOMAIN-SUFFIX,hf.co,Download",
        "DOMAIN-SUFFIX,cdn.openai.com,Download",
        "DOMAIN-SUFFIX,oaistatic.com,Download",
        "DOMAIN-SUFFIX,files.oaiusercontent.com,Download",
        "DOMAIN-SUFFIX,civitai.com,Download",
        "DOMAIN-SUFFIX,image.civitai.com,Download",
        "DOMAIN-SUFFIX,model.civitai.com,Download",
        "DOMAIN-SUFFIX,replicate.com,Download",
        "DOMAIN-SUFFIX,replicate.delivery,Download",
        "DOMAIN-SUFFIX,wandb.ai,Download",
        "DOMAIN-SUFFIX,api.wandb.ai,Download",
        "DOMAIN-SUFFIX,kaggle.com,Download",
        "DOMAIN-SUFFIX,storage.googleapis.com,Download",
        "DOMAIN-SUFFIX,modelzoo.co,Download",
        "DOMAIN-SUFFIX,download.pytorch.org,Download",
        "DOMAIN-SUFFIX,download.tensorflow.org,Download",
        "DOMAIN-SUFFIX,ngc.nvidia.com,Download",
        "DOMAIN-SUFFIX,api.ngc.nvidia.com,Download",
        "DOMAIN-SUFFIX,ollama.ai,Download",
        "DOMAIN-SUFFIX,ollama.com,Download",
        "DOMAIN-SUFFIX,registry.ollama.ai,Download",
        "DOMAIN-SUFFIX,lmstudio.ai,Download",
        "DOMAIN-SUFFIX,gemini.google.com,Google",
        "DOMAIN-SUFFIX,gemini.google,Google",
        "DOMAIN-SUFFIX,bard.google.com,Google",
        "DOMAIN-SUFFIX,chat.google.com,Google",
        "DOMAIN-SUFFIX,aistudio.google.com,Google",
        "DOMAIN-SUFFIX,makersuite.google.com,Google",
        "DOMAIN-SUFFIX,ai.studio,Google",
        "DOMAIN-SUFFIX,generativeai.google,Google",
        "DOMAIN-SUFFIX,generativelanguage.googleapis.com,Google",
        "DOMAIN-SUFFIX,ai.google.dev,Google",
        "DOMAIN-SUFFIX,aiplatform.googleapis.com,Google",
        "DOMAIN-SUFFIX,aicode.googleapis.com,Google",
        "DOMAIN-SUFFIX,ai.google,Google",
        "DOMAIN-SUFFIX,ai.google.com,Google",
        "DOMAIN-SUFFIX,gemini.gstatic.com,Google",
        "DOMAIN-SUFFIX,labs.google.com,Google",
        "DOMAIN-SUFFIX,labs.google,Google",
        "DOMAIN-SUFFIX,jules.google,Google",
        "DOMAIN-SUFFIX,jules.google.com,Google",
        "DOMAIN-SUFFIX,antigravity.google,Google",
        "DOMAIN-SUFFIX,flow.google,Google",
        "DOMAIN-SUFFIX,flow.google.com,Google",
        "DOMAIN-SUFFIX,stitch.withgoogle.com,Google",
        "DOMAIN-SUFFIX,cloud.google.com,Google",
        "DOMAIN-SUFFIX,notebooklm.google.com,Google",
        "DOMAIN-SUFFIX,notebooklm.google,Google",
        "DOMAIN-SUFFIX,notebook.google,Google",
        "DOMAIN-SUFFIX,notebook.google.com,Google",
        "DOMAIN-SUFFIX,labstailwind.pa.googleapis.com,Google",
        "DOMAIN-KEYWORD,gemini.google,Google",
        "DOMAIN-KEYWORD,generativelanguage,Google",
        "DOMAIN-SUFFIX,gemini.google.com,Google",
        "DOMAIN-SUFFIX,bard.google.com,Google",
        "DOMAIN-SUFFIX,deepmind.com,Google",
        "DOMAIN-SUFFIX,deepmind.google,Google",
        "DOMAIN-SUFFIX,aistudio.google.com,Google",
        "DOMAIN-SUFFIX,makersuite.google.com,Google",
        "DOMAIN-SUFFIX,flow.google.com,Google",
        "DOMAIN-SUFFIX,notebook.google,Google",
        "DOMAIN-SUFFIX,labstailwind.pa.googleapis.com,Google",
        "DOMAIN-SUFFIX,chat.com,OpenAI",
        "DOMAIN-SUFFIX,chatgpt.com,OpenAI",
        "DOMAIN-SUFFIX,chatgpt.site,OpenAI",
        "DOMAIN-SUFFIX,crixet.com,OpenAI",
        "DOMAIN-SUFFIX,oaistatic.com,OpenAI",
        "DOMAIN-SUFFIX,oaistatsig.com,OpenAI",
        "DOMAIN-SUFFIX,oaiusercontent.com,OpenAI",
        "DOMAIN-SUFFIX,openai.com,OpenAI",
        "DOMAIN-SUFFIX,sora.com,OpenAI",
        "DOMAIN-KEYWORD,openai,OpenAI",
        "DOMAIN-SUFFIX,anthropic.com,Claude",
        "DOMAIN-SUFFIX,claude.ai,Claude",
        "DOMAIN-SUFFIX,claude.com,Claude",
        "DOMAIN-SUFFIX,clau.de,Claude",
        "DOMAIN-SUFFIX,claude.dev,Claude",
        "DOMAIN-SUFFIX,claudeusercontent.com,Claude",
        "DOMAIN-SUFFIX,claudemcpclient.com,Claude",
        "DOMAIN-SUFFIX,claudemcpcontent.com,Claude",
        "DOMAIN-KEYWORD,claude,Claude",
        "DOMAIN-KEYWORD,anthropic,Claude",
        "DOMAIN-SUFFIX,perplexity.ai,US",
        "DOMAIN-SUFFIX,mistral.ai,US",
        "DOMAIN-SUFFIX,cohere.ai,US",
        "DOMAIN-SUFFIX,cohere.com,US",
        "DOMAIN-SUFFIX,groq.com,US",
        "DOMAIN-SUFFIX,cursor.com,US",
        "DOMAIN-SUFFIX,cursor.sh,US",
        "DOMAIN-SUFFIX,cursorapi.com,US",
        "DOMAIN-SUFFIX,cursor-cdn.com,US",
        "DOMAIN-SUFFIX,together.ai,US",
        "DOMAIN-SUFFIX,replicate.com,US",
        "DOMAIN-SUFFIX,stability.ai,US",
        "DOMAIN-SUFFIX,midjourney.com,US",
        "DOMAIN-SUFFIX,poe.com,US",
        "DOMAIN-SUFFIX,character.ai,US",
        "DOMAIN-SUFFIX,inflection.ai,US",
        "DOMAIN-SUFFIX,pi.ai,US",
        "DOMAIN-KEYWORD,cursor,US",
        "DOMAIN-SUFFIX,youtube.com,Express",
        "DOMAIN-SUFFIX,ytimg.com,Express",
        "DOMAIN-SUFFIX,googlevideo.com,Express",
        "DOMAIN-SUFFIX,youtu.be,Express",
        "DOMAIN-SUFFIX,youtube-nocookie.com,Express",
        "DOMAIN-SUFFIX,yt.be,Express",
        "DOMAIN-KEYWORD,youtube,Express",
        "DOMAIN-SUFFIX,google.com,Google",
        "DOMAIN-SUFFIX,google.com.hk,Google",
        "DOMAIN-SUFFIX,google.co.jp,Google",
        "DOMAIN-SUFFIX,googleapis.com,Google",
        "DOMAIN-SUFFIX,googleapis.cn,Google",
        "DOMAIN-SUFFIX,gstatic.com,Google",
        "DOMAIN-SUFFIX,ggpht.com,Google",
        "DOMAIN-SUFFIX,googleusercontent.com,Google",
        "DOMAIN-SUFFIX,googlesyndication.com,Google",
        "DOMAIN-SUFFIX,googleadservices.com,Google",
        "DOMAIN-SUFFIX,google-analytics.com,Google",
        "DOMAIN-SUFFIX,play.google.com,Google",
        "DOMAIN-SUFFIX,play.googleapis.com,Google",
        "DOMAIN-SUFFIX,android.clients.google.com,Google",
        "DOMAIN-SUFFIX,android.com,Google",
        "DOMAIN-SUFFIX,googleplay.com,Google",
        "DOMAIN-SUFFIX,play-fe.googleapis.com,Google",
        "DOMAIN-SUFFIX,play-games.googleusercontent.com,Google",
        "DOMAIN-SUFFIX,play-lh.googleusercontent.com,Google",
        "DOMAIN-SUFFIX,xn--ngstr-lra8j.com,Google",
        "DOMAIN-SUFFIX,arxiv.org,Google",
        "DOMAIN-SUFFIX,biorxiv.org,Google",
        "DOMAIN-SUFFIX,medrxiv.org,Google",
        "DOMAIN-SUFFIX,ssrn.com,Google",
        "DOMAIN-SUFFIX,philpapers.org,Google",
        "DOMAIN-SUFFIX,zenodo.org,Google",
        "DOMAIN-SUFFIX,figshare.com,Google",
        "DOMAIN-SUFFIX,osf.io,Google",
        "DOMAIN-SUFFIX,springer.com,Google",
        "DOMAIN-SUFFIX,springerlink.com,Google",
        "DOMAIN-SUFFIX,link.springer.com,Google",
        "DOMAIN-SUFFIX,sciencedirect.com,Google",
        "DOMAIN-SUFFIX,elsevier.com,Google",
        "DOMAIN-SUFFIX,nature.com,Google",
        "DOMAIN-SUFFIX,science.org,Google",
        "DOMAIN-SUFFIX,sciencemag.org,Google",
        "DOMAIN-SUFFIX,wiley.com,Google",
        "DOMAIN-SUFFIX,onlinelibrary.wiley.com,Google",
        "DOMAIN-SUFFIX,tandfonline.com,Google",
        "DOMAIN-SUFFIX,sagepub.com,Google",
        "DOMAIN-SUFFIX,cambridge.org,Google",
        "DOMAIN-SUFFIX,oxfordjournals.org,Google",
        "DOMAIN-SUFFIX,academic.oup.com,Google",
        "DOMAIN-SUFFIX,oup.com,Google",
        "DOMAIN-SUFFIX,pnas.org,Google",
        "DOMAIN-SUFFIX,cell.com,Google",
        "DOMAIN-SUFFIX,thelancet.com,Google",
        "DOMAIN-SUFFIX,bmj.com,Google",
        "DOMAIN-SUFFIX,nejm.org,Google",
        "DOMAIN-SUFFIX,acs.org,Google",
        "DOMAIN-SUFFIX,pubs.acs.org,Google",
        "DOMAIN-SUFFIX,rsc.org,Google",
        "DOMAIN-SUFFIX,iop.org,Google",
        "DOMAIN-SUFFIX,iopscience.iop.org,Google",
        "DOMAIN-SUFFIX,aip.org,Google",
        "DOMAIN-SUFFIX,aps.org,Google",
        "DOMAIN-SUFFIX,mdpi.com,Google",
        "DOMAIN-SUFFIX,frontiersin.org,Google",
        "DOMAIN-SUFFIX,plos.org,Google",
        "DOMAIN-SUFFIX,plosone.org,Google",
        "DOMAIN-SUFFIX,hindawi.com,Google",
        "DOMAIN-SUFFIX,degruyter.com,Google",
        "DOMAIN-SUFFIX,karger.com,Google",
        "DOMAIN-SUFFIX,emerald.com,Google",
        "DOMAIN-SUFFIX,ingentaconnect.com,Google",
        "DOMAIN-SUFFIX,annualreviews.org,Google",
        "DOMAIN-SUFFIX,ieee.org,Google",
        "DOMAIN-SUFFIX,ieeexplore.ieee.org,Google",
        "DOMAIN-SUFFIX,acm.org,Google",
        "DOMAIN-SUFFIX,dl.acm.org,Google",
        "DOMAIN-SUFFIX,jstor.org,Google",
        "DOMAIN-SUFFIX,muse.jhu.edu,Google",
        "DOMAIN-SUFFIX,projecteuclid.org,Google",
        "DOMAIN-SUFFIX,mathscinet.ams.org,Google",
        "DOMAIN-SUFFIX,ams.org,Google",
        "DOMAIN-SUFFIX,siam.org,Google",
        "DOMAIN-SUFFIX,doi.org,Google",
        "DOMAIN-SUFFIX,crossref.org,Google",
        "DOMAIN-SUFFIX,orcid.org,Google",
        "DOMAIN-SUFFIX,scopus.com,Google",
        "DOMAIN-SUFFIX,webofscience.com,Google",
        "DOMAIN-SUFFIX,clarivate.com,Google",
        "DOMAIN-SUFFIX,dimensions.ai,Google",
        "DOMAIN-SUFFIX,lens.org,Google",
        "DOMAIN-SUFFIX,nih.gov,Google",
        "DOMAIN-SUFFIX,ncbi.nlm.nih.gov,Google",
        "DOMAIN-SUFFIX,pubmed.gov,Google",
        "DOMAIN-SUFFIX,pubmedcentral.nih.gov,Google",
        "DOMAIN-SUFFIX,clinicaltrials.gov,Google",
        "DOMAIN-SUFFIX,cochranelibrary.com,Google",
        "DOMAIN-SUFFIX,uptodate.com,Google",
        "DOMAIN-SUFFIX,medscape.com,Google",
        "DOMAIN-SUFFIX,webmd.com,Google",
        "DOMAIN-SUFFIX,scholar.google.com,Google",
        "DOMAIN-SUFFIX,semanticscholar.org,Google",
        "DOMAIN-SUFFIX,academia.edu,Google",
        "DOMAIN-SUFFIX,researchgate.net,Google",
        "DOMAIN-SUFFIX,mendeley.com,Google",
        "DOMAIN-SUFFIX,zotero.org,Google",
        "DOMAIN-SUFFIX,connectedpapers.com,Google",
        "DOMAIN-SUFFIX,scite.ai,Google",
        "DOMAIN-SUFFIX,litmaps.com,Google",
        "DOMAIN-SUFFIX,inciteful.xyz,Google",
        "DOMAIN-SUFFIX,base-search.net,Google",
        "DOMAIN-SUFFIX,core.ac.uk,Google",
        "DOMAIN-SUFFIX,worldcat.org,Google",
        "DOMAIN-SUFFIX,loc.gov,Google",
        "DOMAIN-SUFFIX,proquest.com,Google",
        "DOMAIN-SUFFIX,ebsco.com,Google",
        "DOMAIN-SUFFIX,ebscohost.com,Google",
        "DOMAIN-SUFFIX,gale.com,Google",
        "DOMAIN-SUFFIX,dblp.org,Google",
        "DOMAIN-SUFFIX,paperswithcode.com,Google",
        "DOMAIN-SUFFIX,openreview.net,Google",
        "DOMAIN-SUFFIX,aclweb.org,Google",
        "DOMAIN-SUFFIX,aclanthology.org,Google",
        "DOMAIN-SUFFIX,neurips.cc,Google",
        "DOMAIN-SUFFIX,icml.cc,Google",
        "DOMAIN-SUFFIX,iclr.cc,Google",
        "DOMAIN-SUFFIX,cvpr.org,Google",
        "DOMAIN-SUFFIX,thecvf.com,Google",
        "DOMAIN-SUFFIX,wolfram.com,Google",
        "DOMAIN-SUFFIX,wolframalpha.com,Google",
        "DOMAIN-SUFFIX,mathworld.wolfram.com,Google",
        "DOMAIN-SUFFIX,overleaf.com,Google",
        "DOMAIN-SUFFIX,sharelatex.com,Google",
        "DOMAIN-SUFFIX,authorea.com,Google",
        "DOMAIN-SUFFIX,hypothes.is,Google",
        "DOMAIN-SUFFIX,gmail.com,Google",
        "DOMAIN-SUFFIX,googlemail.com,Google",
        "DOMAIN-SUFFIX,mail.google.com,Google",
        "DOMAIN-SUFFIX,gemini.google.com,Google",
        "DOMAIN-SUFFIX,bard.google.com,Google",
        "DOMAIN-SUFFIX,deepmind.com,Google",
        "DOMAIN-SUFFIX,deepmind.google,Google",
        "DOMAIN-SUFFIX,aistudio.google.com,Google",
        "DOMAIN-SUFFIX,makersuite.google.com,Google",
        "DOMAIN-SUFFIX,flow.google.com,Google",
        "DOMAIN-SUFFIX,notebook.google,Google",
        "DOMAIN-SUFFIX,labstailwind.pa.googleapis.com,Google",
        "DOMAIN-KEYWORD,google,Google",
        "DOMAIN-KEYWORD,scholar.google,Google",
        "DOMAIN-SUFFIX,arxiv.org,Google",
        "DOMAIN-SUFFIX,biorxiv.org,Google",
        "DOMAIN-SUFFIX,medrxiv.org,Google",
        "DOMAIN-SUFFIX,ssrn.com,Google",
        "DOMAIN-SUFFIX,philpapers.org,Google",
        "DOMAIN-SUFFIX,zenodo.org,Google",
        "DOMAIN-SUFFIX,figshare.com,Google",
        "DOMAIN-SUFFIX,osf.io,Google",
        "DOMAIN-SUFFIX,springer.com,Google",
        "DOMAIN-SUFFIX,springerlink.com,Google",
        "DOMAIN-SUFFIX,link.springer.com,Google",
        "DOMAIN-SUFFIX,sciencedirect.com,Google",
        "DOMAIN-SUFFIX,elsevier.com,Google",
        "DOMAIN-SUFFIX,nature.com,Google",
        "DOMAIN-SUFFIX,science.org,Google",
        "DOMAIN-SUFFIX,sciencemag.org,Google",
        "DOMAIN-SUFFIX,wiley.com,Google",
        "DOMAIN-SUFFIX,onlinelibrary.wiley.com,Google",
        "DOMAIN-SUFFIX,tandfonline.com,Google",
        "DOMAIN-SUFFIX,sagepub.com,Google",
        "DOMAIN-SUFFIX,cambridge.org,Google",
        "DOMAIN-SUFFIX,oxfordjournals.org,Google",
        "DOMAIN-SUFFIX,academic.oup.com,Google",
        "DOMAIN-SUFFIX,oup.com,Google",
        "DOMAIN-SUFFIX,pnas.org,Google",
        "DOMAIN-SUFFIX,cell.com,Google",
        "DOMAIN-SUFFIX,thelancet.com,Google",
        "DOMAIN-SUFFIX,bmj.com,Google",
        "DOMAIN-SUFFIX,nejm.org,Google",
        "DOMAIN-SUFFIX,acs.org,Google",
        "DOMAIN-SUFFIX,pubs.acs.org,Google",
        "DOMAIN-SUFFIX,rsc.org,Google",
        "DOMAIN-SUFFIX,iop.org,Google",
        "DOMAIN-SUFFIX,iopscience.iop.org,Google",
        "DOMAIN-SUFFIX,aip.org,Google",
        "DOMAIN-SUFFIX,aps.org,Google",
        "DOMAIN-SUFFIX,mdpi.com,Google",
        "DOMAIN-SUFFIX,frontiersin.org,Google",
        "DOMAIN-SUFFIX,plos.org,Google",
        "DOMAIN-SUFFIX,plosone.org,Google",
        "DOMAIN-SUFFIX,hindawi.com,Google",
        "DOMAIN-SUFFIX,degruyter.com,Google",
        "DOMAIN-SUFFIX,karger.com,Google",
        "DOMAIN-SUFFIX,emerald.com,Google",
        "DOMAIN-SUFFIX,ingentaconnect.com,Google",
        "DOMAIN-SUFFIX,annualreviews.org,Google",
        "DOMAIN-SUFFIX,ieee.org,Google",
        "DOMAIN-SUFFIX,ieeexplore.ieee.org,Google",
        "DOMAIN-SUFFIX,acm.org,Google",
        "DOMAIN-SUFFIX,dl.acm.org,Google",
        "DOMAIN-SUFFIX,jstor.org,Google",
        "DOMAIN-SUFFIX,muse.jhu.edu,Google",
        "DOMAIN-SUFFIX,projecteuclid.org,Google",
        "DOMAIN-SUFFIX,mathscinet.ams.org,Google",
        "DOMAIN-SUFFIX,ams.org,Google",
        "DOMAIN-SUFFIX,siam.org,Google",
        "DOMAIN-SUFFIX,doi.org,Google",
        "DOMAIN-SUFFIX,crossref.org,Google",
        "DOMAIN-SUFFIX,orcid.org,Google",
        "DOMAIN-SUFFIX,scopus.com,Google",
        "DOMAIN-SUFFIX,webofscience.com,Google",
        "DOMAIN-SUFFIX,clarivate.com,Google",
        "DOMAIN-SUFFIX,dimensions.ai,Google",
        "DOMAIN-SUFFIX,lens.org,Google",
        "DOMAIN-SUFFIX,nih.gov,Google",
        "DOMAIN-SUFFIX,ncbi.nlm.nih.gov,Google",
        "DOMAIN-SUFFIX,pubmed.gov,Google",
        "DOMAIN-SUFFIX,pubmedcentral.nih.gov,Google",
        "DOMAIN-SUFFIX,clinicaltrials.gov,Google",
        "DOMAIN-SUFFIX,cochranelibrary.com,Google",
        "DOMAIN-SUFFIX,uptodate.com,Google",
        "DOMAIN-SUFFIX,medscape.com,Google",
        "DOMAIN-SUFFIX,webmd.com,Google",
        "DOMAIN-SUFFIX,scholar.google.com,Google",
        "DOMAIN-SUFFIX,semanticscholar.org,Google",
        "DOMAIN-SUFFIX,academia.edu,Google",
        "DOMAIN-SUFFIX,researchgate.net,Google",
        "DOMAIN-SUFFIX,mendeley.com,Google",
        "DOMAIN-SUFFIX,zotero.org,Google",
        "DOMAIN-SUFFIX,connectedpapers.com,Google",
        "DOMAIN-SUFFIX,scite.ai,Google",
        "DOMAIN-SUFFIX,litmaps.com,Google",
        "DOMAIN-SUFFIX,inciteful.xyz,Google",
        "DOMAIN-SUFFIX,base-search.net,Google",
        "DOMAIN-SUFFIX,core.ac.uk,Google",
        "DOMAIN-SUFFIX,worldcat.org,Google",
        "DOMAIN-SUFFIX,loc.gov,Google",
        "DOMAIN-SUFFIX,proquest.com,Google",
        "DOMAIN-SUFFIX,ebsco.com,Google",
        "DOMAIN-SUFFIX,ebscohost.com,Google",
        "DOMAIN-SUFFIX,gale.com,Google",
        "DOMAIN-SUFFIX,dblp.org,Google",
        "DOMAIN-SUFFIX,paperswithcode.com,Google",
        "DOMAIN-SUFFIX,openreview.net,Google",
        "DOMAIN-SUFFIX,aclweb.org,Google",
        "DOMAIN-SUFFIX,aclanthology.org,Google",
        "DOMAIN-SUFFIX,neurips.cc,Google",
        "DOMAIN-SUFFIX,icml.cc,Google",
        "DOMAIN-SUFFIX,iclr.cc,Google",
        "DOMAIN-SUFFIX,cvpr.org,Google",
        "DOMAIN-SUFFIX,thecvf.com,Google",
        "DOMAIN-SUFFIX,wolfram.com,Google",
        "DOMAIN-SUFFIX,wolframalpha.com,Google",
        "DOMAIN-SUFFIX,mathworld.wolfram.com,Google",
        "DOMAIN-SUFFIX,overleaf.com,Google",
        "DOMAIN-SUFFIX,sharelatex.com,Google",
        "DOMAIN-SUFFIX,authorea.com,Google",
        "DOMAIN-SUFFIX,hypothes.is,Google",
        "DOMAIN-KEYWORD,scholar.google,Google",
        "DOMAIN-SUFFIX,netflix.com.edgesuite.net,Express",
        "DOMAIN-SUFFIX,us-west-2.amazonaws.com,Express",
        "DOMAIN-SUFFIX,netflix.com,Express",
        "DOMAIN-SUFFIX,netflix.net,Express",
        "DOMAIN-SUFFIX,nflximg.net,Express",
        "DOMAIN-SUFFIX,nflximg.com,Express",
        "DOMAIN-SUFFIX,nflxvideo.net,Express",
        "DOMAIN-SUFFIX,nflxso.net,Express",
        "DOMAIN-SUFFIX,nflxext.com,Express",
        "DOMAIN-SUFFIX,twitch.tv,Express",
        "DOMAIN-SUFFIX,twitchcdn.net,Express",
        "DOMAIN-SUFFIX,twitchsvc.net,Express",
        "DOMAIN-SUFFIX,jtvnw.net,Express",
        "DOMAIN-SUFFIX,twitchcon.com,Express",
        "DOMAIN-SUFFIX,spotify.com,Express",
        "DOMAIN-SUFFIX,spotifycdn.com,Express",
        "DOMAIN-SUFFIX,scdn.co,Express",
        "DOMAIN-SUFFIX,spoti.fi,Express",
        "DOMAIN-SUFFIX,spotify.link,Express",
        "DOMAIN-SUFFIX,disneyplus.com,Express",
        "DOMAIN-SUFFIX,disney-plus.net,Express",
        "DOMAIN-SUFFIX,dssott.com,Express",
        "DOMAIN-SUFFIX,bamgrid.com,Express",
        "DOMAIN-SUFFIX,disney.com,Express",
        "DOMAIN-SUFFIX,disneystreaming.com,Express",
        "DOMAIN-SUFFIX,disneyaccount.com,Express",
        "DOMAIN-SUFFIX,disneyplus.bn5x.net,Express",
        "DOMAIN-SUFFIX,hulu.com,Express",
        "DOMAIN-SUFFIX,huluim.com,Express",
        "DOMAIN-SUFFIX,hulustream.com,Express",
        "DOMAIN-SUFFIX,pornhub.com,Express",
        "DOMAIN-SUFFIX,pornhubpremium.com,Express",
        "DOMAIN-SUFFIX,phncdn.com,Express",
        "DOMAIN-SUFFIX,xvideos.com,Express",
        "DOMAIN-SUFFIX,xvideos-cdn.com,Express",
        "DOMAIN-SUFFIX,xnxx.com,Express",
        "DOMAIN-SUFFIX,xhamster.com,Express",
        "DOMAIN-SUFFIX,xhamsterlive.com,Express",
        "DOMAIN-SUFFIX,xhcdn.com,Express",
        "DOMAIN-SUFFIX,redtube.com,Express",
        "DOMAIN-SUFFIX,redtubefiles.com,Express",
        "DOMAIN-SUFFIX,youporn.com,Express",
        "DOMAIN-SUFFIX,ypncdn.com,Express",
        "DOMAIN-SUFFIX,tube8.com,Express",
        "DOMAIN-SUFFIX,spankbang.com,Express",
        "DOMAIN-SUFFIX,spankbang.party,Express",
        "DOMAIN-SUFFIX,sb-cd.com,Express",
        "DOMAIN-SUFFIX,eporner.com,Express",
        "DOMAIN-SUFFIX,eporner.sex,Express",
        "DOMAIN-SUFFIX,tnaflix.com,Express",
        "DOMAIN-SUFFIX,empflix.com,Express",
        "DOMAIN-SUFFIX,txxx.com,Express",
        "DOMAIN-SUFFIX,hdzog.com,Express",
        "DOMAIN-SUFFIX,hclips.com,Express",
        "DOMAIN-SUFFIX,upornia.com,Express",
        "DOMAIN-SUFFIX,vjav.com,Express",
        "DOMAIN-SUFFIX,jav.guru,Express",
        "DOMAIN-SUFFIX,javhd.com,Express",
        "DOMAIN-SUFFIX,javlibrary.com,Express",
        "DOMAIN-SUFFIX,r18.com,Express",
        "DOMAIN-SUFFIX,dmm.co.jp,Express",
        "DOMAIN-SUFFIX,stripchat.com,Express",
        "DOMAIN-SUFFIX,chaturbate.com,Express",
        "DOMAIN-SUFFIX,cam4.com,Express",
        "DOMAIN-SUFFIX,livejasmin.com,Express",
        "DOMAIN-SUFFIX,bongacams.com,Express",
        "DOMAIN-SUFFIX,myfreecams.com,Express",
        "DOMAIN-SUFFIX,camsoda.com,Express",
        "DOMAIN-SUFFIX,streamate.com,Express",
        "DOMAIN-SUFFIX,flirt4free.com,Express",
        "DOMAIN-SUFFIX,imlive.com,Express",
        "DOMAIN-SUFFIX,rule34.xxx,Express",
        "DOMAIN-SUFFIX,rule34.paheal.net,Express",
        "DOMAIN-SUFFIX,e-hentai.org,Express",
        "DOMAIN-SUFFIX,exhentai.org,Express",
        "DOMAIN-SUFFIX,ehgt.org,Express",
        "DOMAIN-SUFFIX,nhentai.net,Express",
        "DOMAIN-SUFFIX,hitomi.la,Express",
        "DOMAIN-SUFFIX,gelbooru.com,Express",
        "DOMAIN-SUFFIX,danbooru.donmai.us,Express",
        "DOMAIN-SUFFIX,sankakucomplex.com,Express",
        "DOMAIN-SUFFIX,konachan.com,Express",
        "DOMAIN-SUFFIX,yande.re,Express",
        "DOMAIN-SUFFIX,sex.com,Express",
        "DOMAIN-SUFFIX,imagefap.com,Express",
        "DOMAIN-SUFFIX,fapello.com,Express",
        "DOMAIN-SUFFIX,coomer.party,Express",
        "DOMAIN-SUFFIX,kemono.party,Express",
        "DOMAIN-SUFFIX,simpcity.su,Express",
        "DOMAIN-SUFFIX,f95zone.to,Express",
        "DOMAIN-SUFFIX,lewdzone.com,Express",
        "DOMAIN-SUFFIX,leakedbb.com,Express",
        "DOMAIN-SUFFIX,avgle.com,Express",
        "DOMAIN-SUFFIX,thisav.com,Express",
        "DOMAIN-SUFFIX,missav.com,Express",
        "DOMAIN-SUFFIX,supjav.com,Express",
        "DOMAIN-SUFFIX,jable.tv,Express",
        "DOMAIN-SUFFIX,91porn.com,Express",
        "DOMAIN-SUFFIX,caoliu.com,Express",
        "DOMAIN-SUFFIX,sexinsex.net,Express",
        "DOMAIN-SUFFIX,t66y.com,Express",
        "DOMAIN-SUFFIX,xart.com,Express",
        "DOMAIN-SUFFIX,brazzers.com,Express",
        "DOMAIN-SUFFIX,realitykings.com,Express",
        "DOMAIN-SUFFIX,mofos.com,Express",
        "DOMAIN-SUFFIX,bangbros.com,Express",
        "DOMAIN-SUFFIX,naughtyamerica.com,Express",
        "DOMAIN-SUFFIX,digitalplayground.com,Express",
        "DOMAIN-SUFFIX,fakehub.com,Express",
        "DOMAIN-SUFFIX,teamskeet.com,Express",
        "DOMAIN-SUFFIX,vixen.com,Express",
        "DOMAIN-SUFFIX,blacked.com,Express",
        "DOMAIN-SUFFIX,tushy.com,Express",
        "DOMAIN-SUFFIX,vixengroup.com,Express",
        "DOMAIN-SUFFIX,blackedraw.com,Express",
        "DOMAIN-SUFFIX,tushyraw.com,Express",
        "DOMAIN-SUFFIX,deeper.com,Express",
        "DOMAIN-SUFFIX,milfy.com,Express",
        "DOMAIN-SUFFIX,slayed.com,Express",
        "DOMAIN-SUFFIX,onlyfans.com,Express",
        "DOMAIN-SUFFIX,fansly.com,Express",
        "DOMAIN-SUFFIX,fanvue.com,Express",
        "DOMAIN-SUFFIX,patreon.com,Express",
        "DOMAIN-SUFFIX,gumroad.com,Express",
        "DOMAIN-SUFFIX,loyalfans.com,Express",
        "DOMAIN-SUFFIX,justfor.fans,Express",
        "DOMAIN-SUFFIX,manyvids.com,Express",
        "DOMAIN-SUFFIX,clips4sale.com,Express",
        "DOMAIN-SUFFIX,iwantclips.com,Express",
        "DOMAIN-SUFFIX,pstatp.com,Express",
        "DOMAIN-SUFFIX,rncdn1.com,Express",
        "DOMAIN-SUFFIX,rncdn2.com,Express",
        "DOMAIN-SUFFIX,rncdn3.com,Express",
        "DOMAIN-SUFFIX,rncdn7.com,Express",
        "DOMAIN-SUFFIX,hbomax.com,Express",
        "DOMAIN-SUFFIX,max.com,Express",
        "DOMAIN-SUFFIX,hbo.com,Express",
        "DOMAIN-SUFFIX,hbo,Express",
        "DOMAIN-SUFFIX,h264.io,Express",
        "DOMAIN-KEYWORD,netflix,Express",
        "DOMAIN-KEYWORD,twitch,Express",
        "DOMAIN-KEYWORD,porn,Express",
        "DOMAIN-KEYWORD,xxx,Express",
        "DOMAIN-KEYWORD,xnxx,Express",
        "DOMAIN-KEYWORD,hentai,Express",
        "DOMAIN-KEYWORD,adult,Express",
        "DOMAIN-SUFFIX,github.com,Default Proxy",
        "DOMAIN-SUFFIX,github.io,Default Proxy",
        "DOMAIN-SUFFIX,githubusercontent.com,Default Proxy",
        "DOMAIN-SUFFIX,githubassets.com,Default Proxy",
        "DOMAIN-SUFFIX,ghcr.io,Default Proxy",
        "DOMAIN-SUFFIX,github.dev,Default Proxy",
        "DOMAIN-SUFFIX,copilot.github.com,Default Proxy",
        "DOMAIN-SUFFIX,ghe.com,Default Proxy",
        "DOMAIN-SUFFIX,githubsupport.com,Default Proxy",
        "DOMAIN-SUFFIX,gitlab.com,Default Proxy",
        "DOMAIN-SUFFIX,gitlab.io,Default Proxy",
        "DOMAIN-SUFFIX,npmjs.com,Default Proxy",
        "DOMAIN-SUFFIX,npmjs.org,Default Proxy",
        "DOMAIN-SUFFIX,yarnpkg.com,Default Proxy",
        "DOMAIN-SUFFIX,unpkg.com,Default Proxy",
        "DOMAIN-SUFFIX,jsdelivr.net,Default Proxy",
        "DOMAIN-SUFFIX,esm.sh,Default Proxy",
        "DOMAIN-SUFFIX,pypi.org,Default Proxy",
        "DOMAIN-SUFFIX,pythonhosted.org,Default Proxy",
        "DOMAIN-SUFFIX,python.org,Default Proxy",
        "DOMAIN-SUFFIX,docker.com,Default Proxy",
        "DOMAIN-SUFFIX,docker.io,Default Proxy",
        "DOMAIN-SUFFIX,dockerhub.com,Default Proxy",
        "DOMAIN-SUFFIX,registry-1.docker.io,Default Proxy",
        "DOMAIN-SUFFIX,auth.docker.io,Default Proxy",
        "DOMAIN-SUFFIX,index.docker.io,Default Proxy",
        "DOMAIN-SUFFIX,production.cloudflare.docker.com,Default Proxy",
        "DOMAIN-SUFFIX,vercel.com,Default Proxy",
        "DOMAIN-SUFFIX,vercel.app,Default Proxy",
        "DOMAIN-SUFFIX,netlify.com,Default Proxy",
        "DOMAIN-SUFFIX,netlify.app,Default Proxy",
        "DOMAIN-SUFFIX,heroku.com,Default Proxy",
        "DOMAIN-SUFFIX,railway.app,Default Proxy",
        "DOMAIN-SUFFIX,render.com,Default Proxy",
        "DOMAIN-SUFFIX,fly.io,Default Proxy",
        "DOMAIN-SUFFIX,replit.com,Default Proxy",
        "DOMAIN-SUFFIX,glitch.com,Default Proxy",
        "DOMAIN-SUFFIX,supabase.com,Default Proxy",
        "DOMAIN-SUFFIX,supabase.co,Default Proxy",
        "DOMAIN-SUFFIX,planetscale.com,Default Proxy",
        "DOMAIN-SUFFIX,neon.tech,Default Proxy",
        "DOMAIN-SUFFIX,codepen.io,Default Proxy",
        "DOMAIN-SUFFIX,codesandbox.io,Default Proxy",
        "DOMAIN-SUFFIX,jsfiddle.net,Default Proxy",
        "DOMAIN-SUFFIX,stackblitz.com,Default Proxy",
        "DOMAIN-SUFFIX,v2ex.com,Default Proxy",
        "DOMAIN-SUFFIX,stackoverflow.com,Default Proxy",
        "DOMAIN-SUFFIX,stackexchange.com,Default Proxy",
        "DOMAIN-SUFFIX,dev.to,Default Proxy",
        "DOMAIN-SUFFIX,hashnode.com,Default Proxy",
        "DOMAIN-SUFFIX,medium.com,Default Proxy",
        "DOMAIN-SUFFIX,figma.com,Default Proxy",
        "DOMAIN-SUFFIX,notion.so,Default Proxy",
        "DOMAIN-SUFFIX,notion.site,Default Proxy",
        "DOMAIN-SUFFIX,linear.app,Default Proxy",
        "DOMAIN-SUFFIX,trello.com,Default Proxy",
        "DOMAIN-SUFFIX,asana.com,Default Proxy",
        "DOMAIN-SUFFIX,slack.com,Default Proxy",
        "DOMAIN-SUFFIX,atlassian.com,Default Proxy",
        "DOMAIN-SUFFIX,atlassian.net,Default Proxy",
        "DOMAIN-SUFFIX,jira.com,Default Proxy",
        "DOMAIN-SUFFIX,confluence.com,Default Proxy",
        "DOMAIN-SUFFIX,airtable.com,Default Proxy",
        "DOMAIN-SUFFIX,clickup.com,Default Proxy",
        "DOMAIN-SUFFIX,monday.com,Default Proxy",
        "DOMAIN-KEYWORD,github,Default Proxy",
        "DOMAIN-SUFFIX,download.microsoft.com,Express",
        "DOMAIN-SUFFIX,windowsupdate.com,Express",
        "DOMAIN-SUFFIX,update.microsoft.com,Express",
        "DOMAIN-SUFFIX,wustat.windows.com,Express",
        "DOMAIN-SUFFIX,ntservicepack.microsoft.com,Express",
        "DOMAIN-SUFFIX,go.microsoft.com,Express",
        "DOMAIN-SUFFIX,dl.delivery.mp.microsoft.com,Express",
        "DOMAIN-SUFFIX,emdl.ws.microsoft.com,Express",
        "DOMAIN-SUFFIX,msftconnecttest.com,Express",
        "DOMAIN-SUFFIX,msftncsi.com,Express",
        "DOMAIN-SUFFIX,swcdn.apple.com,Express",
        "DOMAIN-SUFFIX,swdist.apple.com,Express",
        "DOMAIN-SUFFIX,swdownload.apple.com,Express",
        "DOMAIN-SUFFIX,updates.cdn-apple.com,Express",
        "DOMAIN-SUFFIX,appldnld.apple.com,Express",
        "DOMAIN-SUFFIX,iosapps.itunes.apple.com,Express",
        "DOMAIN-SUFFIX,osxapps.itunes.apple.com,Express",
        "DOMAIN-SUFFIX,updates-http.cdn-apple.com,Express",
        "DOMAIN-SUFFIX,xp.apple.com,Express",
        "DOMAIN-SUFFIX,gdmf.apple.com,Express",
        "DOMAIN-SUFFIX,mesu.apple.com,Express",
        "DOMAIN-SUFFIX,osrecovery.apple.com,Express",
        "DOMAIN-SUFFIX,ccmdl.adobe.com,Express",
        "DOMAIN-SUFFIX,ccmdls.adobe.com,Express",
        "DOMAIN-SUFFIX,adobedownloads.edgesuite.net,Express",
        "DOMAIN-SUFFIX,ardownload.adobe.com,Express",
        "DOMAIN-SUFFIX,armdl.adobe.com,Express",
        "DOMAIN-SUFFIX,download.jetbrains.com,Express",
        "DOMAIN-SUFFIX,plugins.jetbrains.com,Express",
        "DOMAIN-SUFFIX,update.code.visualstudio.com,Express",
        "DOMAIN-SUFFIX,az764295.vo.msecnd.net,Express",
        "DOMAIN-SUFFIX,vscode.download.prss.microsoft.com,Express",
        "DOMAIN-SUFFIX,dl.google.com,Express",
        "DOMAIN-SUFFIX,edgedl.me.gvt1.com,Express",
        "DOMAIN-SUFFIX,redirector.gvt1.com,Express",
        "DOMAIN-SUFFIX,update.googleapis.com,Express",
        "DOMAIN-SUFFIX,download.mozilla.org,Express",
        "DOMAIN-SUFFIX,archive.mozilla.org,Express",
        "DOMAIN-SUFFIX,aus5.mozilla.org,Express",
        "DOMAIN-SUFFIX,wetransfer.com,Express",
        "DOMAIN-SUFFIX,we.tl,Express",
        "DOMAIN-SUFFIX,send-anywhere.com,Express",
        "DOMAIN-SUFFIX,sendgb.com,Express",
        "DOMAIN-SUFFIX,transfer.sh,Express",
        "DOMAIN-SUFFIX,file.io,Express",
        "DOMAIN-SUFFIX,gofile.io,Express",
        "DOMAIN-SUFFIX,anonfiles.com,Express",
        "DOMAIN-SUFFIX,bayfiles.com,Express",
        "DOMAIN-SUFFIX,fileditch.com,Express",
        "DOMAIN-SUFFIX,archive.org,Express",
        "DOMAIN-SUFFIX,ia600.us.archive.org,Express",
        "DOMAIN-SUFFIX,ia800.us.archive.org,Express",
        "DOMAIN-SUFFIX,ia900.us.archive.org,Express",
        "DOMAIN-SUFFIX,web.archive.org,Express",
        "DOMAIN-SUFFIX,catbox.moe,Express",
        "DOMAIN-SUFFIX,files.catbox.moe,Express",
        "DOMAIN-SUFFIX,litter.catbox.moe,Express",
        "DOMAIN-SUFFIX,imgur.com,Express",
        "DOMAIN-SUFFIX,i.imgur.com,Express",
        "DOMAIN-SUFFIX,streamable.com,Express",
        "DOMAIN-SUFFIX,ufile.io,Express",
        "DOMAIN-SUFFIX,uploadfiles.io,Express",
        "DOMAIN-SUFFIX,zippyshare.com,Express",
        "DOMAIN-SUFFIX,1fichier.com,Express",
        "DOMAIN-SUFFIX,rapidgator.net,Express",
        "DOMAIN-SUFFIX,uploaded.net,Express",
        "DOMAIN-SUFFIX,ul.to,Express",
        "DOMAIN-SUFFIX,turbobit.net,Express",
        "DOMAIN-SUFFIX,nitroflare.com,Express",
        "DOMAIN-SUFFIX,store.steampowered.com,Download",
        "DOMAIN-SUFFIX,steampowered.com,Download",
        "DOMAIN-SUFFIX,steamgames.com,Download",
        "DOMAIN-SUFFIX,valvesoftware.com,Download",
        "DOMAIN-SUFFIX,s.team,Download",
        "DOMAIN-SUFFIX,steamcommunity.com,Download",
        "DOMAIN-SUFFIX,steamusercontent.com,Download",
        "DOMAIN-SUFFIX,steamstatic.com,Download",
        "DOMAIN-SUFFIX,steamcdn-a.akamaihd.net,Download",
        "DOMAIN-SUFFIX,cdn.cloudflare.steamstatic.com,Download",
        "DOMAIN-SUFFIX,cdn.akamai.steamstatic.com,Download",
        "DOMAIN-SUFFIX,steam-chat.com,Download",
        "DOMAIN-SUFFIX,steamcontent.com,Download",
        "DOMAIN-SUFFIX,steampipe.akamaized.net,Download",
        "DOMAIN-SUFFIX,lancache.steamcontent.com,Download",
        "DOMAIN-SUFFIX,edgecast.steamstatic.com,Download",
        "DOMAIN-SUFFIX,steambroadcast.akamaized.net,Download",
        "DOMAIN-SUFFIX,steamtv.cloud,Download",
        "DOMAIN-SUFFIX,api.steampowered.com,Download",
        "DOMAIN-SUFFIX,partner.steamgames.com,Download",
        "DOMAIN-SUFFIX,help.steampowered.com,Download",
        "DOMAIN-SUFFIX,support.steampowered.com,Download",
        "DOMAIN-SUFFIX,login.steampowered.com,Download",
        "DOMAIN-SUFFIX,checkout.steampowered.com,Download",
        "DOMAIN-SUFFIX,steamuserimages-a.akamaihd.net,Download",
        "DOMAIN-SUFFIX,steamvideo-a.akamaihd.net,Download",
        "DOMAIN-SUFFIX,steamcommunity-a.akamaihd.net,Download",
        "DOMAIN-SUFFIX,steamstore-a.akamaihd.net,Download",
        "DOMAIN-SUFFIX,media.steampowered.com,Download",
        "DOMAIN-SUFFIX,video.steampowered.com,Download",
        "DOMAIN-SUFFIX,workshop.steampowered.com,Download",
        "DOMAIN-SUFFIX,cloud.steampowered.com,Download",
        "DOMAIN-SUFFIX,steamcloud-us-west1.storage.googleapis.com,Download",
        "DOMAIN-SUFFIX,steamcloud-eu-west1.storage.googleapis.com,Download",
        "DOMAIN-SUFFIX,cache.steamcontent.com,Download",
        "DOMAIN-SUFFIX,content-origin.steampowered.com,Download",
        "DOMAIN-SUFFIX,valve.net,Download",
        "DOMAIN-SUFFIX,steamconnecttest.com,Download",
        "DOMAIN-SUFFIX,dota2.com,Download",
        "DOMAIN-SUFFIX,steamchina.com,Download",
        "DOMAIN-SUFFIX,csgo.wmsj.cn,Download",
        "DOMAIN-SUFFIX,wmsjsteam.com,Download",
        "DOMAIN-SUFFIX,epicgames.com,Download",
        "DOMAIN-SUFFIX,epicgames.dev,Download",
        "DOMAIN-SUFFIX,unrealengine.com,Download",
        "DOMAIN-SUFFIX,fortnite.com,Download",
        "DOMAIN-SUFFIX,fortnite-vod.akamaized.net,Download",
        "DOMAIN-KEYWORD,steamcdn,Download",
        "DOMAIN-KEYWORD,steamcontent,Download",
        "DOMAIN-KEYWORD,steampowered,Download",
        "DOMAIN-KEYWORD,steamcommunity,Download",
        "DOMAIN-SUFFIX,akamai.net,Default Proxy",
        "DOMAIN-SUFFIX,akamaized.net,Default Proxy",
        "DOMAIN-SUFFIX,akamaihd.net,Default Proxy",
        "DOMAIN-SUFFIX,akamaitechnologies.com,Default Proxy",
        "DOMAIN-SUFFIX,akadns.net,Default Proxy",
        "DOMAIN-SUFFIX,akam.net,Default Proxy",
        "DOMAIN-SUFFIX,edgesuite.net,Default Proxy",
        "DOMAIN-SUFFIX,edgekey.net,Default Proxy",
        "DOMAIN-SUFFIX,cloudflare.com,Default Proxy",
        "DOMAIN-SUFFIX,cloudflare-dns.com,Default Proxy",
        "DOMAIN-SUFFIX,cdnjs.cloudflare.com,Default Proxy",
        "DOMAIN-SUFFIX,cloudflareinsights.com,Default Proxy",
        "DOMAIN-SUFFIX,fastly.net,Default Proxy",
        "DOMAIN-SUFFIX,fastlylb.net,Default Proxy",
        "DOMAIN-SUFFIX,fastly.com,Default Proxy",
        "DOMAIN-SUFFIX,cloudfront.net,Default Proxy",
        "DOMAIN-SUFFIX,azureedge.net,Default Proxy",
        "DOMAIN-SUFFIX,msecnd.net,Default Proxy",
        "DOMAIN-SUFFIX,azure.com,Default Proxy",
        "DOMAIN-SUFFIX,blob.core.windows.net,Default Proxy",
        "DOMAIN-SUFFIX,vo.msecnd.net,Default Proxy",
        "DOMAIN-SUFFIX,gstatic.com,Default Proxy",
        "DOMAIN-SUFFIX,googleapis.com,Default Proxy",
        "DOMAIN-SUFFIX,stackpath.com,Default Proxy",
        "DOMAIN-SUFFIX,stackpathdns.com,Default Proxy",
        "DOMAIN-SUFFIX,maxcdn.com,Default Proxy",
        "DOMAIN-SUFFIX,netdna-cdn.com,Default Proxy",
        "DOMAIN-SUFFIX,netdna-ssl.com,Default Proxy",
        "DOMAIN-SUFFIX,kxcdn.com,Default Proxy",
        "DOMAIN-SUFFIX,keycdn.com,Default Proxy",
        "DOMAIN-SUFFIX,cdn77.org,Default Proxy",
        "DOMAIN-SUFFIX,cdn77.com,Default Proxy",
        "DOMAIN-SUFFIX,limelight.com,Default Proxy",
        "DOMAIN-SUFFIX,llnwd.net,Default Proxy",
        "DOMAIN-SUFFIX,llnw.net,Default Proxy",
        "DOMAIN-SUFFIX,hwcdn.net,Default Proxy",
        "DOMAIN-SUFFIX,cachefly.net,Default Proxy",
        "DOMAIN-SUFFIX,b-cdn.net,Default Proxy",
        "DOMAIN-SUFFIX,bunnycdn.com,Default Proxy",
        "DOMAIN-SUFFIX,jsdelivr.net,Default Proxy",
        "DOMAIN-SUFFIX,unpkg.com,Default Proxy",
        "DOMAIN-SUFFIX,cdnjs.com,Default Proxy",
        "DOMAIN-SUFFIX,bootstrapcdn.com,Default Proxy",
        "DOMAIN-SUFFIX,ajax.googleapis.com,Default Proxy",
        "DOMAIN-KEYWORD,cloudflare,Default Proxy",
        "DOMAIN-KEYWORD,fastly,Default Proxy",
        "DOMAIN-KEYWORD,jsdelivr,Default Proxy",
        "DOMAIN-SUFFIX,tiktok.com,US",
        "DOMAIN-SUFFIX,tiktokcdn.com,US",
        "DOMAIN-SUFFIX,tiktokv.com,US",
        "DOMAIN-SUFFIX,byteoversea.com,US",
        "DOMAIN-SUFFIX,muscdn.com,US",
        "DOMAIN-SUFFIX,musical.ly,US",
        "DOMAIN-SUFFIX,tiktokcdn-us.com,US",
        "DOMAIN-SUFFIX,ttcdn-us.com,US",
        "DOMAIN-SUFFIX,ibytedtos.com,US",
        "DOMAIN-KEYWORD,tiktok,US",
        "DOMAIN-SUFFIX,cn,DIRECT",
        "DOMAIN-SUFFIX,com.cn,DIRECT",
        "DOMAIN-SUFFIX,net.cn,DIRECT",
        "DOMAIN-SUFFIX,org.cn,DIRECT",
        "DOMAIN-SUFFIX,gov.cn,DIRECT",
        "DOMAIN-SUFFIX,edu.cn,DIRECT",
        "DOMAIN-SUFFIX,ip111.cn,DIRECT",
        "DOMAIN-SUFFIX,ip.cn,DIRECT",
        "DOMAIN-SUFFIX,qq.com,DIRECT",
        "DOMAIN-SUFFIX,tencent.com,DIRECT",
        "DOMAIN-SUFFIX,weixin.com,DIRECT",
        "DOMAIN-SUFFIX,wechat.com,DIRECT",
        "DOMAIN-SUFFIX,wx.qq.com,DIRECT",
        "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
        "DOMAIN-SUFFIX,qpic.cn,DIRECT",
        "DOMAIN-SUFFIX,gtimg.cn,DIRECT",
        "DOMAIN-SUFFIX,gtimg.com,DIRECT",
        "DOMAIN-SUFFIX,idqqimg.com,DIRECT",
        "DOMAIN-SUFFIX,qlogo.cn,DIRECT",
        "DOMAIN-SUFFIX,myqcloud.com,DIRECT",
        "DOMAIN-SUFFIX,tenpay.com,DIRECT",
        "DOMAIN-SUFFIX,tengxun.com,DIRECT",
        "DOMAIN-SUFFIX,taobao.com,DIRECT",
        "DOMAIN-SUFFIX,tmall.com,DIRECT",
        "DOMAIN-SUFFIX,alipay.com,DIRECT",
        "DOMAIN-SUFFIX,aliyun.com,DIRECT",
        "DOMAIN-SUFFIX,alicdn.com,DIRECT",
        "DOMAIN-SUFFIX,alibaba.com,DIRECT",
        "DOMAIN-SUFFIX,alibabacloud.com,DIRECT",
        "DOMAIN-SUFFIX,aliyuncs.com,DIRECT",
        "DOMAIN-SUFFIX,1688.com,DIRECT",
        "DOMAIN-SUFFIX,aliexpress.com,DIRECT",
        "DOMAIN-SUFFIX,alimama.com,DIRECT",
        "DOMAIN-SUFFIX,alipayobjects.com,DIRECT",
        "DOMAIN-SUFFIX,mmstat.com,DIRECT",
        "DOMAIN-SUFFIX,tbcdn.cn,DIRECT",
        "DOMAIN-SUFFIX,taobaocdn.com,DIRECT",
        "DOMAIN-SUFFIX,cainiao.com,DIRECT",
        "DOMAIN-SUFFIX,ele.me,DIRECT",
        "DOMAIN-SUFFIX,elemecdn.com,DIRECT",
        "DOMAIN-SUFFIX,amap.com,DIRECT",
        "DOMAIN-SUFFIX,autonavi.com,DIRECT",
        "DOMAIN-SUFFIX,dingtalk.com,DIRECT",
        "DOMAIN-SUFFIX,dingtalkapps.com,DIRECT",
        "DOMAIN-SUFFIX,xiami.com,DIRECT",
        "DOMAIN-SUFFIX,youku.com,DIRECT",
        "DOMAIN-SUFFIX,ykimg.com,DIRECT",
        "DOMAIN-SUFFIX,tudou.com,DIRECT",
        "DOMAIN-SUFFIX,cibntv.net,DIRECT",
        "DOMAIN-SUFFIX,ucweb.com,DIRECT",
        "DOMAIN-SUFFIX,baidu.com,DIRECT",
        "DOMAIN-SUFFIX,baidubce.com,DIRECT",
        "DOMAIN-SUFFIX,baidustatic.com,DIRECT",
        "DOMAIN-SUFFIX,bdstatic.com,DIRECT",
        "DOMAIN-SUFFIX,bdimg.com,DIRECT",
        "DOMAIN-SUFFIX,bcebos.com,DIRECT",
        "DOMAIN-SUFFIX,baiducontent.com,DIRECT",
        "DOMAIN-SUFFIX,baidupcs.com,DIRECT",
        "DOMAIN-SUFFIX,baifubao.com,DIRECT",
        "DOMAIN-SUFFIX,hao123.com,DIRECT",
        "DOMAIN-SUFFIX,nuomi.com,DIRECT",
        "DOMAIN-SUFFIX,tieba.com,DIRECT",
        "DOMAIN-SUFFIX,pan.baidu.com,DIRECT",
        "DOMAIN-SUFFIX,bytedance.com,DIRECT",
        "DOMAIN-SUFFIX,bytedance.net,DIRECT",
        "DOMAIN-SUFFIX,bytecdn.cn,DIRECT",
        "DOMAIN-SUFFIX,byteimg.com,DIRECT",
        "DOMAIN-SUFFIX,bytegoofy.com,DIRECT",
        "DOMAIN-SUFFIX,douyin.com,DIRECT",
        "DOMAIN-SUFFIX,douyincdn.com,DIRECT",
        "DOMAIN-SUFFIX,douyinpic.com,DIRECT",
        "DOMAIN-SUFFIX,douyinstatic.com,DIRECT",
        "DOMAIN-SUFFIX,amemv.com,DIRECT",
        "DOMAIN-SUFFIX,snssdk.com,DIRECT",
        "DOMAIN-SUFFIX,toutiao.com,DIRECT",
        "DOMAIN-SUFFIX,toutiaocdn.com,DIRECT",
        "DOMAIN-SUFFIX,toutiaoimg.com,DIRECT",
        "DOMAIN-SUFFIX,pstatp.com,DIRECT",
        "DOMAIN-SUFFIX,ixigua.com,DIRECT",
        "DOMAIN-SUFFIX,ixiguavideo.com,DIRECT",
        "DOMAIN-SUFFIX,huoshan.com,DIRECT",
        "DOMAIN-SUFFIX,huoshanzhibo.com,DIRECT",
        "DOMAIN-SUFFIX,feiliao.com,DIRECT",
        "DOMAIN-SUFFIX,zjurl.cn,DIRECT",
        "DOMAIN-SUFFIX,zijieapi.com,DIRECT",
        "DOMAIN-SUFFIX,feishu.cn,DIRECT",
        "DOMAIN-SUFFIX,feishucdn.com,DIRECT",
        "DOMAIN-SUFFIX,larkoffice.com,DIRECT",
        "DOMAIN-SUFFIX,bilibili.com,DIRECT",
        "DOMAIN-SUFFIX,bilivideo.com,DIRECT",
        "DOMAIN-SUFFIX,bilivideo.cn,DIRECT",
        "DOMAIN-SUFFIX,biliapi.net,DIRECT",
        "DOMAIN-SUFFIX,biliapi.com,DIRECT",
        "DOMAIN-SUFFIX,hdslb.com,DIRECT",
        "DOMAIN-SUFFIX,acgvideo.com,DIRECT",
        "DOMAIN-SUFFIX,im9.com,DIRECT",
        "DOMAIN-SUFFIX,163.com,DIRECT",
        "DOMAIN-SUFFIX,126.com,DIRECT",
        "DOMAIN-SUFFIX,netease.com,DIRECT",
        "DOMAIN-SUFFIX,netease.im,DIRECT",
        "DOMAIN-SUFFIX,ntes.com,DIRECT",
        "DOMAIN-SUFFIX,ydstatic.com,DIRECT",
        "DOMAIN-SUFFIX,youdao.com,DIRECT",
        "DOMAIN-SUFFIX,163yun.com,DIRECT",
        "DOMAIN-SUFFIX,neteasegames.com,DIRECT",
        "DOMAIN-SUFFIX,nie.netease.com,DIRECT",
        "DOMAIN-SUFFIX,yeah.net,DIRECT",
        "DOMAIN-SUFFIX,jd.com,DIRECT",
        "DOMAIN-SUFFIX,jd.hk,DIRECT",
        "DOMAIN-SUFFIX,jdcloud.com,DIRECT",
        "DOMAIN-SUFFIX,jdpay.com,DIRECT",
        "DOMAIN-SUFFIX,360buyimg.com,DIRECT",
        "DOMAIN-SUFFIX,jcloudcache.com,DIRECT",
        "DOMAIN-SUFFIX,jcloudcdn.com,DIRECT",
        "DOMAIN-SUFFIX,jddebug.com,DIRECT",
        "DOMAIN-SUFFIX,jdcache.com,DIRECT",
        "DOMAIN-SUFFIX,iqiyi.com,DIRECT",
        "DOMAIN-SUFFIX,iqiyipic.com,DIRECT",
        "DOMAIN-SUFFIX,qiyi.com,DIRECT",
        "DOMAIN-SUFFIX,qiyipic.com,DIRECT",
        "DOMAIN-SUFFIX,pps.tv,DIRECT",
        "DOMAIN-SUFFIX,ppstream.com,DIRECT",
        "DOMAIN-SUFFIX,qy.net,DIRECT",
        "DOMAIN-SUFFIX,qiyipic.com,DIRECT",
        "DOMAIN-SUFFIX,sina.com,DIRECT",
        "DOMAIN-SUFFIX,sina.com.cn,DIRECT",
        "DOMAIN-SUFFIX,sinaimg.cn,DIRECT",
        "DOMAIN-SUFFIX,sinajs.cn,DIRECT",
        "DOMAIN-SUFFIX,sina.cn,DIRECT",
        "DOMAIN-SUFFIX,weibo.com,DIRECT",
        "DOMAIN-SUFFIX,weibo.cn,DIRECT",
        "DOMAIN-SUFFIX,weibocdn.com,DIRECT",
        "DOMAIN-SUFFIX,miaopai.com,DIRECT",
        "DOMAIN-SUFFIX,zhihu.com,DIRECT",
        "DOMAIN-SUFFIX,zhimg.com,DIRECT",
        "DOMAIN-SUFFIX,xiaomi.com,DIRECT",
        "DOMAIN-SUFFIX,xiaomi.cn,DIRECT",
        "DOMAIN-SUFFIX,mi.com,DIRECT",
        "DOMAIN-SUFFIX,miui.com,DIRECT",
        "DOMAIN-SUFFIX,miwifi.com,DIRECT",
        "DOMAIN-SUFFIX,xiaomiyoupin.com,DIRECT",
        "DOMAIN-SUFFIX,duokan.com,DIRECT",
        "DOMAIN-SUFFIX,huawei.com,DIRECT",
        "DOMAIN-SUFFIX,vmall.com,DIRECT",
        "DOMAIN-SUFFIX,huaweicloud.com,DIRECT",
        "DOMAIN-SUFFIX,hicloud.com,DIRECT",
        "DOMAIN-SUFFIX,hichina.com,DIRECT",
        "DOMAIN-SUFFIX,dbankcloud.com,DIRECT",
        "DOMAIN-SUFFIX,kuaishou.com,DIRECT",
        "DOMAIN-SUFFIX,gifshow.com,DIRECT",
        "DOMAIN-SUFFIX,yxixy.com,DIRECT",
        "DOMAIN-SUFFIX,kwimgs.com,DIRECT",
        "DOMAIN-SUFFIX,kuaishouzt.com,DIRECT",
        "DOMAIN-SUFFIX,pinduoduo.com,DIRECT",
        "DOMAIN-SUFFIX,yangkeduo.com,DIRECT",
        "DOMAIN-SUFFIX,pinduoduo.net,DIRECT",
        "DOMAIN-SUFFIX,meituan.com,DIRECT",
        "DOMAIN-SUFFIX,meituan.net,DIRECT",
        "DOMAIN-SUFFIX,dianping.com,DIRECT",
        "DOMAIN-SUFFIX,dpfile.com,DIRECT",
        "DOMAIN-SUFFIX,maoyan.com,DIRECT",
        "DOMAIN-SUFFIX,didiglobal.com,DIRECT",
        "DOMAIN-SUFFIX,didialift.com,DIRECT",
        "DOMAIN-SUFFIX,xiaojukeji.com,DIRECT",
        "DOMAIN-SUFFIX,udache.com,DIRECT",
        "DOMAIN-SUFFIX,sohu.com,DIRECT",
        "DOMAIN-SUFFIX,sogou.com,DIRECT",
        "DOMAIN-SUFFIX,sogoucdn.com,DIRECT",
        "DOMAIN-SUFFIX,sogo.com,DIRECT",
        "DOMAIN-SUFFIX,so.com,DIRECT",
        "DOMAIN-SUFFIX,360.cn,DIRECT",
        "DOMAIN-SUFFIX,360.com,DIRECT",
        "DOMAIN-SUFFIX,qihoo.com,DIRECT",
        "DOMAIN-SUFFIX,qhimg.com,DIRECT",
        "DOMAIN-SUFFIX,qhimgs.com,DIRECT",
        "DOMAIN-SUFFIX,douban.com,DIRECT",
        "DOMAIN-SUFFIX,doubanio.com,DIRECT",
        "DOMAIN-SUFFIX,ctrip.com,DIRECT",
        "DOMAIN-SUFFIX,c-ctrip.com,DIRECT",
        "DOMAIN-SUFFIX,ly.com,DIRECT",
        "DOMAIN-SUFFIX,qunar.com,DIRECT",
        "DOMAIN-SUFFIX,fliggy.com,DIRECT",
        "DOMAIN-SUFFIX,tuniu.com,DIRECT",
        "DOMAIN-SUFFIX,suning.com,DIRECT",
        "DOMAIN-SUFFIX,suning.cn,DIRECT",
        "DOMAIN-SUFFIX,vip.com,DIRECT",
        "DOMAIN-SUFFIX,vipstatic.com,DIRECT",
        "DOMAIN-SUFFIX,gome.com.cn,DIRECT",
        "DOMAIN-SUFFIX,xunlei.com,DIRECT",
        "DOMAIN-SUFFIX,sandai.net,DIRECT",
        "DOMAIN-SUFFIX,wandoujia.com,DIRECT",
        "DOMAIN-SUFFIX,coolapk.com,DIRECT",
        "DOMAIN-SUFFIX,oppo.com,DIRECT",
        "DOMAIN-SUFFIX,vivo.com,DIRECT",
        "DOMAIN-SUFFIX,meizu.com,DIRECT",
        "DOMAIN-SUFFIX,flyme.cn,DIRECT",
        "DOMAIN-SUFFIX,lenovo.com,DIRECT",
        "DOMAIN-SUFFIX,zol.com.cn,DIRECT",
        "DOMAIN-SUFFIX,ccb.com,DIRECT",
        "DOMAIN-SUFFIX,icbc.com.cn,DIRECT",
        "DOMAIN-SUFFIX,boc.cn,DIRECT",
        "DOMAIN-SUFFIX,abchina.com,DIRECT",
        "DOMAIN-SUFFIX,psbc.com,DIRECT",
        "DOMAIN-SUFFIX,cmbchina.com,DIRECT",
        "DOMAIN-SUFFIX,unionpay.com,DIRECT",
        "DOMAIN-SUFFIX,bankcomm.com,DIRECT",
        "DOMAIN-SUFFIX,spdb.com.cn,DIRECT",
        "DOMAIN-SUFFIX,cebbank.com,DIRECT",
        "DOMAIN-SUFFIX,cmbc.com.cn,DIRECT",
        "DOMAIN-SUFFIX,ifeng.com,DIRECT",
        "DOMAIN-SUFFIX,thepaper.cn,DIRECT",
        "DOMAIN-SUFFIX,caixin.com,DIRECT",
        "DOMAIN-SUFFIX,yicai.com,DIRECT",
        "DOMAIN-SUFFIX,jiemian.com,DIRECT",
        "DOMAIN-SUFFIX,cctv.com,DIRECT",
        "DOMAIN-SUFFIX,cctv.cn,DIRECT",
        "DOMAIN-SUFFIX,xinhuanet.com,DIRECT",
        "DOMAIN-SUFFIX,people.com.cn,DIRECT",
        "DOMAIN-SUFFIX,chinadaily.com.cn,DIRECT",
        "DOMAIN-SUFFIX,huanqiu.com,DIRECT",
        "DOMAIN-SUFFIX,guancha.cn,DIRECT",
        "DOMAIN-SUFFIX,cankaoxiaoxi.com,DIRECT",
        "DOMAIN-SUFFIX,bjnews.com.cn,DIRECT",
        "DOMAIN-SUFFIX,csdn.net,DIRECT",
        "DOMAIN-SUFFIX,oschina.net,DIRECT",
        "DOMAIN-SUFFIX,gitee.com,DIRECT",
        "DOMAIN-SUFFIX,iteye.com,DIRECT",
        "DOMAIN-SUFFIX,infoq.cn,DIRECT",
        "DOMAIN-SUFFIX,51cto.com,DIRECT",
        "DOMAIN-SUFFIX,cnblogs.com,DIRECT",
        "DOMAIN-SUFFIX,jianshu.com,DIRECT",
        "DOMAIN-SUFFIX,juejin.cn,DIRECT",
        "DOMAIN-SUFFIX,segmentfault.com,DIRECT",
        "DOMAIN-SUFFIX,xuetangx.com,DIRECT",
        "DOMAIN-SUFFIX,icourse163.org,DIRECT",
        "DOMAIN-SUFFIX,mooc.cn,DIRECT",
        "DOMAIN-SUFFIX,study.163.com,DIRECT",
        "DOMAIN-SUFFIX,yuketang.cn,DIRECT",
        "DOMAIN-SUFFIX,taptap.com,DIRECT",
        "DOMAIN-SUFFIX,taptapdada.com,DIRECT",
        "DOMAIN-SUFFIX,37.com,DIRECT",
        "DOMAIN-SUFFIX,4399.com,DIRECT",
        "DOMAIN-SUFFIX,7k7k.com,DIRECT",
        "DOMAIN-SUFFIX,yy.com,DIRECT",
        "DOMAIN-SUFFIX,duowan.com,DIRECT",
        "DOMAIN-SUFFIX,huya.com,DIRECT",
        "DOMAIN-SUFFIX,douyu.com,DIRECT",
        "DOMAIN-SUFFIX,douyucdn.cn,DIRECT",
        "DOMAIN-SUFFIX,douyutv.com,DIRECT",
        "DOMAIN-SUFFIX,aliyuncdn.com,DIRECT",
        "DOMAIN-SUFFIX,alikunlun.com,DIRECT",
        "DOMAIN-SUFFIX,kunlunaq.com,DIRECT",
        "DOMAIN-SUFFIX,kunlunca.com,DIRECT",
        "DOMAIN-SUFFIX,kunlunsl.com,DIRECT",
        "DOMAIN-SUFFIX,kunlunpi.com,DIRECT",
        "DOMAIN-SUFFIX,kunlungr.com,DIRECT",
        "DOMAIN-SUFFIX,cdnhwc2.com,DIRECT",
        "DOMAIN-SUFFIX,cdnhwc3.com,DIRECT",
        "DOMAIN-SUFFIX,hwcloudcdn.com,DIRECT",
        "DOMAIN-SUFFIX,baishan.com,DIRECT",
        "DOMAIN-SUFFIX,baishancloud.com,DIRECT",
        "DOMAIN-SUFFIX,baishancdnx.com,DIRECT",
        "DOMAIN-SUFFIX,qiniucdn.com,DIRECT",
        "DOMAIN-SUFFIX,qiniudn.com,DIRECT",
        "DOMAIN-SUFFIX,qbox.me,DIRECT",
        "DOMAIN-SUFFIX,upyun.com,DIRECT",
        "DOMAIN-SUFFIX,upaiyun.com,DIRECT",
        "DOMAIN-SUFFIX,clouddn.com,DIRECT",
        "DOMAIN-SUFFIX,ksyuncdn.com,DIRECT",
        "DOMAIN-SUFFIX,ksyun.com,DIRECT",
        "DOMAIN-SUFFIX,ks-cdn.com,DIRECT",
        "DOMAIN-SUFFIX,kscdnx.com,DIRECT",
        "DOMAIN-SUFFIX,chinanetcenter.com,DIRECT",
        "DOMAIN-SUFFIX,wangsu.com,DIRECT",
        "DOMAIN-SUFFIX,wscdns.com,DIRECT",
        "DOMAIN-SUFFIX,wsglb0.com,DIRECT",
        "DOMAIN-SUFFIX,cdn20.com,DIRECT",
        "DOMAIN-SUFFIX,cdn30.com,DIRECT",
        "DOMAIN-SUFFIX,staticdn.net,DIRECT",
        "DOMAIN-SUFFIX,bdydns.com,DIRECT",
        "DOMAIN-SUFFIX,bdydns.net,DIRECT",
        "DOMAIN-SUFFIX,tencentcloudcdn.com,DIRECT",
        "DOMAIN-SUFFIX,dnsv1.com,DIRECT",
        "DOMAIN-SUFFIX,tdnsv5.com,DIRECT",
        "DOMAIN-SUFFIX,tdnsv6.com,DIRECT",
        "DOMAIN-SUFFIX,cdntip.com,DIRECT",
        "DOMAIN-SUFFIX,cdntips.com,DIRECT",
        "DOMAIN-SUFFIX,cdnle.com,DIRECT",
        "DOMAIN-SUFFIX,txcdns.com,DIRECT",
        "DOMAIN-SUFFIX,qcloud.com,DIRECT",
        "DOMAIN-SUFFIX,qcloudcdn.com,DIRECT",
        "DOMAIN-SUFFIX,qcloudimg.com,DIRECT",
        "DOMAIN-SUFFIX,qcloudcos.com,DIRECT",
        "DOMAIN-SUFFIX,myqcloud.cos,DIRECT",
        "DOMAIN-SUFFIX,cloudfront.cn,DIRECT",
        "DOMAIN-SUFFIX,mtyun.com,DIRECT",
        "DOMAIN-SUFFIX,ctcdn.cn,DIRECT",
        "DOMAIN-SUFFIX,ctyun.cn,DIRECT",
        "DOMAIN-SUFFIX,ctyunapi.cn,DIRECT",
        "DOMAIN-SUFFIX,chinacache.com,DIRECT",
        "DOMAIN-SUFFIX,chinacache.net,DIRECT",
        "DOMAIN-SUFFIX,ccgslb.com,DIRECT",
        "DOMAIN-SUFFIX,ccgslb.net,DIRECT",
        "DOMAIN-SUFFIX,lxdns.com,DIRECT",
        "DOMAIN-SUFFIX,lxcdn.com,DIRECT",
        "DOMAIN-SUFFIX,fastweb.com.cn,DIRECT",
        "DOMAIN-SUFFIX,fastcdn.com,DIRECT",
        "DOMAIN-SUFFIX,cloudglb.com,DIRECT",
        "DOMAIN-SUFFIX,cloudgslb.com,DIRECT",
        "GEOIP,CN,DIRECT",
        "GEOIP,PRIVATE,DIRECT",
        "MATCH,Default Proxy"
      ];
    }
  });

  // src/clash_verge.ts
  function unique(values) {
    return [...new Set(values)];
  }
  function selectGroup(name, proxies) {
    return {
      name,
      type: "select",
      proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT])
    };
  }
  function urlTestGroup(name, proxies, interval, tolerance = 100) {
    return {
      name,
      type: "url-test",
      url: PROXY_TEST_URL2,
      interval,
      tolerance,
      proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT])
    };
  }
  function fallbackGroup(name, proxies, interval) {
    return {
      name,
      type: "fallback",
      url: PROXY_TEST_URL2,
      interval,
      tolerance: 100,
      proxies: unique(proxies.length > 0 ? proxies : [BUILTIN_DIRECT])
    };
  }
  function buildGroups(proxies) {
    const nodeNames = proxies.map((proxy) => proxy.name).filter(Boolean);
    const nodeSet = new Set(nodeNames);
    const isGroupName = (value) => GROUP_NAMES.includes(value);
    const matchingNodes = (pattern) => nodeNames.filter((name) => pattern.test(name));
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
    const usable = (values) => unique(values).filter(
      (value) => value === BUILTIN_DIRECT || nodeSet.has(value) || isGroupName(value)
    );
    const groups = [
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
          ...captainNodes
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
          ...captainNodes
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
          ...captainNodes
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
          ...captainNodes
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
          ...captainNodes
        ])
      ),
      selectGroup("Download", usable([...usXNodes, BUILTIN_DIRECT, ...captainNodes])),
      selectGroup("SenseCore Cluster", senseNodes)
    ];
    return groups;
  }
  function buildClashVergeConfig(config) {
    const { proxies, routeExcludeAddress } = applyIPv6NodeOptions({
      proxies: config.proxies,
      ipv6InterfaceName: ""
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
      profile: { ...config.profile ?? {}, "store-selected": true },
      dns: CLASH_VERGE_DNS,
      tun: {
        enable: true,
        stack: "gvisor",
        device: "Mihomo_Tun",
        "route-exclude-address": routeExcludeAddress,
        "dns-hijack": ["any:53"],
        mtu: 1420,
        "auto-route": true,
        "strict-route": false,
        "auto-detect-interface": true
      },
      "proxy-groups": groups,
      rules: [...CLASH_VERGE_RULES]
    };
  }
  var PROXY_TEST_URL2, GROUP_NAMES, CLASH_VERGE_DNS;
  var init_clash_verge = __esm({
    "src/clash_verge.ts"() {
      "use strict";
      init_ipv6_nodes();
      init_clash_verge_rules();
      init_constants();
      PROXY_TEST_URL2 = "http://www.gstatic.com/generate_204";
      GROUP_NAMES = [
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
        "SenseCore Cluster"
      ];
      CLASH_VERGE_DNS = {
        enable: true,
        ipv6: true,
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        listen: "0.0.0.0:23453",
        "default-nameserver": ["119.29.29.29", "114.114.114.114", "223.5.5.5"],
        nameserver: [
          "119.29.29.29",
          "114.114.114.114",
          "223.5.5.5",
          "https://223.5.5.5/dns-query",
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
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
          "+.yunazju.fun"
        ],
        "nameserver-policy": {
          "+.zju.edu.cn": "system",
          "+.zju.edu": "system",
          "+.yunazju.fun": "system"
        }
      };
    }
  });

  // src/main.ts
  var require_main = __commonJS({
    "src/main.ts"() {
      init_constants();
      init_args();
      init_proxy_groups();
      init_node_parser();
      init_ipv6_nodes();
      init_rules();
      init_rule_providers();
      init_dns();
      init_tun();
      init_selectors();
      init_clash_verge();
      var geoxURL = {
        geoip: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat`,
        geosite: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat`,
        mmdb: `${CDN_URL}/gh/Loyalsoldier/geoip@release/Country.mmdb`,
        asn: `${CDN_URL}/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb`
      };
      function getRawArgs() {
        try {
          return $arguments;
        } catch {
          console.log("[Alex-WU-Gen-9-png 的覆写脚本] 未检测到传入参数，使用默认参数。", {});
          return {};
        }
      }
      var rawArgs = getRawArgs();
      var {
        routingType,
        loadBalance,
        countrySelect,
        fallbackEnabled,
        landing,
        ipv6Enabled,
        ipv6InterfaceName,
        fullConfig,
        keepAliveEnabled,
        fakeIPEnabled,
        quicEnabled,
        webRTCEnabled,
        regexFilter,
        tunEnabled,
        lanEnabled,
        dnsListen,
        inboundLanEnabled,
        inboundBindAddress,
        inboundAuth,
        countryThreshold,
        panelBindAddress,
        panelPort,
        panelSecret
      } = buildFeatureFlags(rawArgs);
      function main(config) {
        if (rawArgs.profile?.trim().toLowerCase() === "clash-verge") {
          return buildClashVergeConfig(config);
        }
        const { proxies, routeExcludeAddress } = applyIPv6NodeOptions({
          proxies: config.proxies,
          ipv6InterfaceName
        });
        const countryInfo = parseCountries(config, landing);
        const lowCostNodes = parseLowCost(config);
        const countryGroupNames = getCountryGroupNames(countryInfo, countryThreshold);
        const countries = stripNodeSuffix(countryGroupNames);
        const { landingNodes, nonLandingNodes } = landing ? parseNodesByLanding(config) : { landingNodes: [], nonLandingNodes: [] };
        const { defaultSelector, defaultFallback, frontProxySelector } = buildBaseLists({
          landing,
          lowCostNodes,
          countryGroupNames,
          nonLandingNodes,
          regexFilter,
          fallbackEnabled
        });
        const countryProxyGroups = buildCountryProxyGroups({
          countries,
          landing,
          loadBalance,
          countrySelect,
          fallbackEnabled,
          regexFilter,
          countryInfo
        });
        const proxyGroups = buildProxyGroups({
          landing,
          regexFilter,
          fallbackEnabled,
          countryProxyGroups,
          lowCostNodes,
          landingNodes,
          defaultSelector,
          defaultFallback,
          frontProxySelector
        });
        const globalProxies = [...proxyGroups.map((item) => String(item.name)), BUILTIN_DIRECT];
        proxyGroups.push({
          name: PROXY_GROUPS.GLOBAL,
          icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Global.png`,
          "include-all": true,
          type: "select",
          proxies: globalProxies
        });
        const finalRules = buildRules({ routingType, quicEnabled, webRTCEnabled });
        const profile = {
          ...fullConfig ? { "store-selected": true } : {},
          ...fakeIPEnabled ? { "store-fake-ip": true } : {}
        };
        return {
          proxies,
          ...fullConfig && {
            "mixed-port": 7890,
            "redir-port": 7892,
            "tproxy-port": 7893,
            "allow-lan": inboundLanEnabled,
            "bind-address": inboundBindAddress,
            ...inboundAuth.length > 0 ? { authentication: inboundAuth } : {},
            ipv6: ipv6Enabled,
            mode: "rule",
            "unified-delay": true,
            "tcp-concurrent": true,
            "find-process-mode": "off",
            "log-level": "info",
            "geodata-loader": "standard",
            "external-controller": `${panelBindAddress}:${panelPort}`,
            "external-ui": "ui",
            "external-ui-name": "xd",
            "external-ui-url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
            ...panelSecret && { secret: panelSecret },
            "disable-keep-alive": !keepAliveEnabled
          },
          ...Object.keys(profile).length > 0 ? { profile } : {},
          "proxy-groups": proxyGroups,
          "rule-providers": ruleProviders,
          rules: finalRules,
          sniffer: snifferConfig,
          dns: buildDns({ fakeIPEnabled, ipv6Enabled, lanEnabled, dnsListen }),
          tun: buildTunConfig({ tunEnabled, lanEnabled, routeExcludeAddress }),
          "geodata-mode": true,
          "geox-url": geoxURL
        };
      }
      globalThis.main = main;
    }
  });
  require_main();
})();
