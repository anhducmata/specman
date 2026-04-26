// ─── Shared Types ───

export interface SpecmanConfig {
  version: number;
  specsDir: string;
  caseMaxBytes: number;
  approvedRequired: boolean;
  aiTools: {
    claude: boolean;
    codex: boolean;
    agents: boolean;
    cursor: boolean;
    copilot: boolean;
  };
  logicLock: {
    enabled: boolean;
    paths: string[];
  };
}

export interface SpecmanStatus {
  initialized: boolean;
  approved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface ScanResult {
  detectedFiles: string[];
  detectedStack: DetectedTech[];
  hasTests: boolean;
  hasSrc: boolean;
  hasDocker: boolean;
  hasCi: boolean;
  hasApi: boolean;
  hasMigrations: boolean;
  projectName: string | null;
  projectDescription: string | null;
}

export interface DetectedTech {
  name: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LogicLockSnapshot {
  version: number;
  createdAt: string;
  items: LogicLockItem[];
}

export interface LogicLockItem {
  id: string;
  type: 'file';
  path: string;
  hash: string;
}

export type CheckSeverity = 'ERROR' | 'WARN' | 'INFO';

export interface CheckResult {
  severity: CheckSeverity;
  message: string;
  file?: string;
  line?: number;
}

export interface CaseData {
  title: string;
  status: string;
  problem: string;
  context: string;
  rootCause: string;
  solution: string;
  before: string;
  after: string;
  result: string;
  whenToReuse: string;
  whenNotToUse: string;
  relatedSpecs: string[];
  tags: string[];
}

export interface SecretMatch {
  pattern: string;
  match: string;
  line: number;
  column: number;
}

export const DEFAULT_CONFIG: SpecmanConfig = {
  version: 1,
  specsDir: 'specs',
  caseMaxBytes: 12000,
  approvedRequired: false,
  aiTools: {
    claude: true,
    codex: true,
    agents: true,
    cursor: true,
    copilot: true,
  },
  logicLock: {
    enabled: true,
    paths: [
      'src/**/*.ts',
      'internal/**/*.go',
      'app/**/*.py',
    ],
  },
};

export const DEFAULT_STATUS: SpecmanStatus = {
  initialized: false,
  approved: false,
  approvedAt: null,
  approvedBy: null,
};
