/*!
powerfullz 的 Substore 订阅转换脚本
https://github.com/powerfullz/override-rules

支持的传入参数：
- loadbalance: 启用负载均衡（load-balance，默认 false）
- countryselect: 国家/地区节点使用手动选择（默认 true；传 false 时在非负载均衡模式下改用 url-test）
- landing: 启用落地节点功能（如机场家宽/星链/落地分组，默认 false）
- ipv6: 启用 IPv6 支持（默认 false）
- ipv6interface/ipv6_interface: IPv6 Only 节点绑定的出站网卡（默认空）
- tun: 启用 TUN 模式（默认 false）
- lan: 启用局域网代理支持（默认 false；透明代理需配合 tun=true）
- full: 输出完整配置（适合纯内核启动，默认 false）
- keepalive: 启用 tcp-keep-alive（默认 false）
- fakeip: DNS 使用 FakeIP 模式（默认 true；传 false 时为 RedirHost）
- quic: 允许 QUIC 流量（UDP 443，默认 false）
- webrtc: 允许 WebRTC/STUN 按普通规则分流（默认 false；默认强制 STUN UDP 走代理）
- threshold: 地区节点数量小于该值时不显示分组 (默认 0)
- regex: 使用正则过滤模式（include-all + filter）写入各地区代理组，而非直接枚举节点名称（默认 false）
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
        ASIA_MEDIA: "港台日韩媒体",
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
  function buildFeatureFlags(args) {
    return {
      loadBalance: parseBool(args.loadbalance, FEATURE_FLAG_DEFAULTS.loadBalance),
      countrySelect: parseBool(args.countryselect, FEATURE_FLAG_DEFAULTS.countrySelect),
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
        loadBalance: false,
        countrySelect: true,
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
        name: PROXY_GROUPS.ASIA_MEDIA,
        icon: `${CDN_URL}/gh/blackmatrix7/ios_rule_script@master/icon/color/streamingcn.png`,
        type: "select",
        proxies: proxyGroupProxies
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
      {
        name: PROXY_GROUPS.FALLBACK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
        type: "fallback",
        url: PROXY_TEST_URL,
        proxies: defaultFallback,
        interval: 60,
        tolerance: 20
      },
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
        sukkaClassical("StreamHK", "non_ip", "stream_hk", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamHKIP", "ip", "stream_hk", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamTW", "non_ip", "stream_tw", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamTWIP", "ip", "stream_tw", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamJP", "non_ip", "stream_jp", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamJPIP", "ip", "stream_jp", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamKR", "non_ip", "stream_kr", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        sukkaClassical("StreamKRIP", "ip", "stream_kr", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("Bahamut", "Bahamut", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("BiliBiliIntl", "BiliBiliIntl", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("AbemaTV", "AbemaTV", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("TVB", "TVB", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("ViuTV", "ViuTV", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("Niconico", "Niconico", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("HuluJP", "HuluJP", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("KKTV", "KKTV", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("LiTV", "LiTV", PROXY_GROUPS.ASIA_MEDIA, "asiaMedia"),
        blackmatrixItem("BiliBili", "BiliBili", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        catalogItem("Weibo", selfClassical("Weibo"), PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("XiaoHongShu", "XiaoHongShu", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("DouYin", "DouYin", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("TencentVideo", "TencentVideo", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("iQIYI", "iQIYI", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("Youku", "Youku", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        blackmatrixItem("NetEaseMusic", "NetEaseMusic", PROXY_GROUPS.DOMESTIC_SERVICES, "domestic"),
        catalogItem(
          "GoogleFCM",
          selfClassical("GoogleFCM"),
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
    quicEnabled,
    webRTCEnabled
  }) {
    const ruleList = [];
    if (!webRTCEnabled) {
      ruleList.push(...WEBRTC_STUN_PROXY_RULES);
    }
    if (!quicEnabled) {
      ruleList.push(`AND,((DST-PORT,443),(NETWORK,UDP)),${BUILTIN_REJECT}`);
    }
    return [...ruleList, ...baseRules];
  }
  var WEBRTC_STUN_UDP_PORTS, WEBRTC_STUN_PROXY_RULES, CORE_DIRECT_RULES, DOMESTIC_PLATFORM_RULES, AI_RULES, OVERSEAS_MEDIA_RULES, ASIA_MEDIA_RULES, DOMESTIC_SERVICE_RULES, SOCIAL_RULES, DEVELOPER_RULES, PRODUCTIVITY_RULES, DOWNLOAD_RULES, GAME_RULES, FALLBACK_RULES, baseRules;
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
      WEBRTC_STUN_PROXY_RULES = [
        `AND,((DOMAIN-KEYWORD,stun),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`,
        ...WEBRTC_STUN_UDP_PORTS.map(
          (port) => `AND,((DST-PORT,${port}),(NETWORK,UDP)),${PROXY_GROUPS.SELECT}`
        )
      ];
      CORE_DIRECT_RULES = [
        `GEOSITE,private,${BUILTIN_DIRECT}`,
        `GEOSITE,connectivity-check,${BUILTIN_DIRECT}`,
        `GEOIP,private,${BUILTIN_DIRECT},no-resolve`,
        ...buildRuleSetRules("hardDirect")
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
      ASIA_MEDIA_RULES = [`GEOSITE,bahamut,${PROXY_GROUPS.ASIA_MEDIA}`];
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
        `GEOSITE,cn,${PROXY_GROUPS.DOMESTIC_SERVICES}`,
        `GEOIP,cn,${PROXY_GROUPS.DOMESTIC_SERVICES},no-resolve`,
        `GEOSITE,gfw,${PROXY_GROUPS.SELECT}`,
        `MATCH,${PROXY_GROUPS.SELECT}`
      ];
      baseRules = [
        ...CORE_DIRECT_RULES,
        ...buildRuleSetRules("guard"),
        ...buildRuleSetRules("ai"),
        ...AI_RULES,
        ...buildRuleSetRules("overseasMedia"),
        ...OVERSEAS_MEDIA_RULES,
        ...buildRuleSetRules("asiaMedia"),
        ...ASIA_MEDIA_RULES,
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
    fakeIpFilter
  }) {
    const config = {
      enable: true,
      ...lanEnabled ? { listen: "0.0.0.0:53" } : {},
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
        "+.zju.edu.cn": "10.10.0.21"
      }
    };
    if (fakeIpFilter) {
      config["fake-ip-range"] = "198.18.0.1/16";
      config["fake-ip-range6"] = "fd88:413:626:821::/64";
      config["fake-ip-filter"] = fakeIpFilter;
    }
    return config;
  }
  function buildDns({ fakeIPEnabled, ipv6Enabled, lanEnabled }) {
    if (fakeIPEnabled) {
      return buildDnsConfig({
        mode: "fake-ip",
        ipv6Enabled,
        lanEnabled,
        fakeIpFilter: FAKE_IP_FILTER
      });
    }
    return buildDnsConfig({ mode: "redir-host", ipv6Enabled, lanEnabled });
  }
  var LOCAL_DOMAIN_FAKE_IP_FILTER, FAKE_IP_FILTER, snifferConfig;
  var init_dns = __esm({
    "src/dns.ts"() {
      "use strict";
      LOCAL_DOMAIN_FAKE_IP_FILTER = [
        "+.lan",
        "+.local",
        "+.localdomain",
        "+.home",
        "+.home.arpa",
        "+.internal"
      ];
      FAKE_IP_FILTER = [
        "geosite:private",
        "geosite:connectivity-check",
        "geosite:cn",
        "+.zju.edu.cn",
        ...LOCAL_DOMAIN_FAKE_IP_FILTER,
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
        "fd00::/8",
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
    regexFilter
  }) {
    const lowCost = lowCostNodes.length > 0 || regexFilter;
    const defaultSelector = buildList(
      PROXY_GROUPS.AUTO,
      PROXY_GROUPS.FALLBACK,
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
          console.log("[powerfullz 的覆写脚本] 未检测到传入参数，使用默认参数。", {});
          return {};
        }
      }
      var rawArgs = getRawArgs();
      var {
        loadBalance,
        countrySelect,
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
        countryThreshold,
        panelPort,
        panelSecret
      } = buildFeatureFlags(rawArgs);
      function main(config) {
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
          regexFilter
        });
        const countryProxyGroups = buildCountryProxyGroups({
          countries,
          landing,
          loadBalance,
          countrySelect,
          regexFilter,
          countryInfo
        });
        const proxyGroups = buildProxyGroups({
          landing,
          regexFilter,
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
        const finalRules = buildRules({ quicEnabled, webRTCEnabled });
        return {
          proxies,
          ...fullConfig && {
            "mixed-port": 7890,
            "redir-port": 7892,
            "tproxy-port": 7893,
            "routing-mark": 7894,
            "allow-lan": true,
            "bind-address": "*",
            ipv6: ipv6Enabled,
            mode: "rule",
            "unified-delay": true,
            "tcp-concurrent": true,
            "find-process-mode": "off",
            "log-level": "info",
            "geodata-loader": "standard",
            "external-controller": `:${panelPort}`,
            "external-ui": "ui",
            "external-ui-name": "xd",
            "external-ui-url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
            ...panelSecret && { secret: panelSecret },
            "disable-keep-alive": !keepAliveEnabled,
            profile: { "store-selected": true }
          },
          "proxy-groups": proxyGroups,
          "rule-providers": ruleProviders,
          rules: finalRules,
          sniffer: snifferConfig,
          dns: buildDns({ fakeIPEnabled, ipv6Enabled, lanEnabled }),
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
