export type PushStats = {
  added: number;
  removed: number;
};

export type SecretHit = {
  rule: string;
  file: string;
  line: number;
  preview: string;
};

export type PrePushReport = {
  timestamp: string;
  branch: string;
  comparedRange: string;
  stats: PushStats;
  secrets: SecretHit[];
  blocked: boolean;
};
