/** Additive explanation provenance. It does not version or replace the
 * original chapter text used by saved reports and personal adoption. */
export const NATAL_READING_RULE_APPLICATIONS_VERSION = "hakimi.natal-reading-rule-applications/0.1.0" as const;

export interface NatalReadingRuleApplication {
  ruleId: string;
  title: string;
  decision: string;
  support: string[];
  limitations: string[];
  sourceIds: string[];
  sourceSubjects: string[];
  provenance: {
    version: typeof NATAL_READING_RULE_APPLICATIONS_VERSION;
    producerVersion: string;
    selector: string;
    selection: string;
    factRefs: string[];
  };
}

export const NATAL_READING_PROVENANCE_LIMIT = "这项记录只说明实际采用的条件、对象或选择路径；来源关联不证明整段现代生活解释已获古籍逐句支持或现实验证。";
