export interface ProjectRef {
  id: string;
  name: string;
  rootPath: string;
  git: {
    repositoryRoot: string;
    defaultBranch: string;
    commit?: string;
  };
}

export interface DetectedTechnology {
  name: string;
  packageName?: string;
  version?: string;
  category?: string;
  confidence: number;
  evidence: string[];
}

export interface ProjectConvention {
  id: string;
  description: string;
  evidence: string[];
}

export interface ProjectCapability {
  name: string;
  script: string;
  command: string;
  packageManager: string;
  workingDirectory: string;
}

export interface ProjectConstraint {
  id: string;
  description: string;
  evidence: string[];
}

export interface ProjectProfile {
  project: ProjectRef;
  runtime?: { name: string; version?: string; evidence: string[] };
  packageManager?: { name: string; version?: string; evidence: string[] };
  technologies: DetectedTechnology[];
  scripts: Record<string, string>;
  paths: {
    root: string;
    manifests: string[];
    sourceDirectories: string[];
    configFiles: string[];
  };
  architecture: { style: string; roots: string[]; evidence: string[] };
  conventions: ProjectConvention[];
  capabilities: ProjectCapability[];
  constraints: ProjectConstraint[];
}

export type RuleSource = "user" | "knowledge" | "mandatory" | "project" | "model";

export interface EngineeringRule {
  id: string;
  title: string;
  description: string;
  source: RuleSource;
  priority: number;
  appliesTo: string[];
  evidence?: string[];
  mandatory: boolean;
}

export interface KnowledgeReference {
  id: string;
  path: string;
  title: string;
  summary: string;
  domains: string[];
}

export interface KnowledgeGap {
  domain: string;
  status: "missing-user-knowledge";
  fallbackRequired: true;
}

export interface WorkRequest {
  raw: string;
  mode: "inspect" | "prepare" | "implement" | "verify";
  constraints: string[];
}

export interface WorkContext {
  relevantFiles: Array<{ path: string; reason: string }>;
  relevantModules: string[];
  relevantTechnologies: DetectedTechnology[];
  applicableKnowledge: KnowledgeReference[];
  applicableRules: EngineeringRule[];
  projectConstraints: ProjectConstraint[];
  summary: string;
}

export interface InspectionQuestion {
  id: string;
  question: string;
  reason: string;
}

export interface ProjectAnalysis {
  summary: string;
  observed: string[];
  architecture: string[];
  conventions: string[];
  decisions: string[];
  qualityGates: string[];
  assumptions: string[];
  questions: InspectionQuestion[];
}

export interface ProjectState {
  analyzedCommit?: string;
  fileHashes: Record<string, string>;
  updatedAt: string;
}

export interface ReviewFinding {
  id: string;
  severity: "blocker" | "warning" | "note";
  dimension: string;
  title: string;
  evidence: string[];
  proposal: string;
  requiresDecision: boolean;
}

export interface TestRecommendation {
  kind: "unit" | "integration" | "e2e" | "storybook" | "security";
  reason: string;
  target: string;
}

export interface ReviewAnalysis {
  summary: string;
  risk: "low" | "medium" | "high";
  applicableDimensions: string[];
  findings: ReviewFinding[];
  questions: InspectionQuestion[];
  tests: TestRecommendation[];
}

export interface VerificationResult {
  capability: string;
  command: string;
  passed: boolean;
  output: string;
}
