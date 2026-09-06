export interface ProjectRef {
  id: string;
  name: string;
  rootPath: string;
  git: { repositoryRoot: string; defaultBranch: string };
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
  command: string;
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

export type RuleSource =
  | "user"
  | "knowledge"
  | "mandatory"
  | "project"
  | "model";

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
  mode: "analyze" | "plan" | "execute";
  constraints: string[];
  maxWorkers: number;
}

export interface RelevantFile {
  path: string;
  reason: string;
}

export interface WorkContext {
  relevantFiles: RelevantFile[];
  relevantModules: string[];
  relevantTechnologies: DetectedTechnology[];
  applicableKnowledge: KnowledgeReference[];
  applicableRules: EngineeringRule[];
  projectConstraints: ProjectConstraint[];
  summary: string;
}

export interface Task {
  id: string;
  title: string;
  objective: string;
  rationale: string;
  dependencies: string[];
  scope: { paths: string[] };
  acceptanceCriteria: string[];
  constraints: string[];
  applicableRuleIds: string[];
  applicableKnowledgeIds: string[];
  risk: "low" | "medium" | "high";
  status:
    | "pending"
    | "ready"
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "verified"
    | "merged";
}

export interface ExecutionPlan {
  summary: string;
  tasks: Task[];
  risks: string[];
}

export interface TaskExecution {
  taskId: string;
  workspaceId: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
}

export interface TaskReview {
  taskId: string;
  approved: boolean;
  findings: string[];
}

export interface TaskVerification {
  taskId: string;
  passed: boolean;
  commands: string[];
  output: string[];
}

export interface KnowledgeCandidate {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: { project: string; taskId?: string; files?: string[] };
  reason:
    | "new-learning"
    | "knowledge-gap"
    | "knowledge-correction"
    | "project-incident"
    | "reusable-pattern";
  proposedLocation?: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
}

export interface WorkflowRun {
  id: string;
  startedAt: string;
  status: "running" | "completed" | "failed" | "blocked";
}

export interface WorkflowEvent {
  type: string;
  timestamp: string;
  message: string;
}

export interface WorkflowError {
  stage: string;
  message: string;
}

export interface FrontendSystemState {
  run: WorkflowRun;
  target: ProjectRef;
  request: WorkRequest;
  profile?: ProjectProfile;
  context?: WorkContext;
  plan?: ExecutionPlan;
  tasks: Task[];
  activeTaskIds: string[];
  executions: TaskExecution[];
  reviews: TaskReview[];
  verifications: TaskVerification[];
  knowledgeCandidates: KnowledgeCandidate[];
  events: WorkflowEvent[];
  errors: WorkflowError[];
}
