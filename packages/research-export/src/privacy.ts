export const REIDENTIFICATION_WARNING =
  "隐私警告：即使已移除案例别名、地点与研究文本，出生日期、出生时间和时区仍可能用于重新识别个人。" as const;

export const FULL_AUDIT_PRIVACY_WARNING =
  "敏感资料警告：完整审计 JSON 包含两个案例的别名、出生输入、地点、坐标、来源说明、确切 ID、规则快照、摘要与完整运限轨道；仅应保存到受控设备或交给明确授权的研究者。" as const;

export const PAIR_REIDENTIFICATION_WARNING =
  "双案例匿名报告仍保留出生日期、时间、时区、性别、四柱与同步运限事实；这些信息组合后仍可能指向具体个人。" as const;
