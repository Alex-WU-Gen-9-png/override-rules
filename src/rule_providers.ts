import { ruleCatalog } from "./rule_catalog";
import type { RuleProvider } from "./types";

export const ruleProviders: Record<string, RuleProvider> = Object.fromEntries(
    ruleCatalog.map(({ name, provider }) => [name, provider])
);
