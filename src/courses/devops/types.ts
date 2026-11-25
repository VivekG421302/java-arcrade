// Data model for the "Full-Stack Deployment & DevOps Mastery" course module.
// Source of truth: fullstack-devops-mastery-spec.md, Reference Section 4.1. Interfaces below follow the spec 1:1;
// anything marked "extension" is an additive field/type the spec references but does not define (e.g. UnlockGate).

// ---------- Course skeleton ----------

export interface CourseModule {
  id: string                          // "devops-mastery-spring-postgres"
  title: string
  stages: CourseStage[]               // exactly 8 when complete (Phase 1 ships stage 1)
  referenceSections: ReferenceSection[]
  globalPlayground: PlaygroundSpec
}

export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface CourseStage {
  id: string                          // "stage-1-manual-vps"
  number: StageNumber
  title: string
  eraName: string
  unlockGate: UnlockGate
  imagineCard: ImagineAnalogyBlock
  architectureFlow: DiagramSpec[]     // ASCII + mermaid + before/after diff
  labs: InteractiveLab[]
  chaosLabs: ChaosIncident[]          // exactly 2-3 per stage in the spec (stage 1 has 4)
  painPointTable: ComparisonTable
  cheatSheet: ComparisonTable
  extraTables?: ComparisonTable[]     // extension: tool-translation tables (GUI click <-> CLI), expected-output tables
}

/**
 * Extension: the spec's CourseStage references `UnlockGate` without defining it. Per spec 4.4(5) the gate is
 * "labs complete + chaos labs fixed + quiz pass", plus any stage-specific checks (stage 1: `ss -tlnp` showing both ports).
 */
export interface UnlockGate {
  description: string
  requiredLabIds: string[]
  requiredChaosIds: string[]
  quiz: QuizSpec
  checks: GateCheck[]
}

/** A one-time observation the learner must make in the playground, e.g. run `ss -tlnp` while both ports listen. */
export interface GateCheck {
  id: string
  label: string
  commandPattern: string              // only commands matching this regex are considered
  rule: TerminalCommandRule           // evaluated against that command's output / the world
}

export interface QuizSpec {
  id: string
  title: string
  passMark: number                    // 0..1
  questions: QuizQuestion[]
}
export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
}

// ---------- Pillar 1: Imagine cards ----------

export interface ImagineAnalogyBlock {
  headline: string
  analogy: string                     // long-form story, paragraphs separated by blank lines
  mappingTable: ComparisonTable
  illustrationPrompt: string
}

// ---------- Pillar 2: Diagrams ----------

export interface DiagramSpec {
  id: string
  kind: 'ascii' | 'mermaid-flowchart' | 'mermaid-sequence' | 'before-after-diff'
  title: string
  caption?: string
  mermaidCode?: string
  asciiArt?: string                   // monospaced, < 100 cols
  beforeAscii?: string
  afterAscii?: string
  highlightedPorts?: number[]
  highlightedProtocols?: ('HTTP' | 'HTTPS' | 'TCP' | 'JDBC' | 'SSH' | 'SFTP')[]
  nodes?: TopologyNode[]
}

export interface TopologyNode {
  id: string
  name: string
  kind: 'laptop' | 'proxy' | 'app' | 'database' | 'cache' | 'ci' | 'registry' | 'k8s-cluster'
  x: number
  y: number                           // 0-100, responsive-normalised
  edges: { to: string; protocol: string; port?: number; label?: string }[]
}

// ---------- Pillar 3: Tables ----------

export interface ComparisonTable {
  id: string
  title: string
  description?: string
  columns: string[]
  rows: string[][]                    // rows[i].length === columns.length (validated by validateTable)
  rowSemantics?: string[]
}

// ---------- Pillar 4: Labs & Chaos ----------

export type LabEnvironment = 'terminal' | 'filezilla-sftp' | 'docker' | 'compose' | 'cloud-console' | 'kubectl' | 'github-actions'

export interface InteractiveLab {
  id: string                          // "lab-1-2"
  title: string
  objective: string
  steps: LabStep[]
  environment: LabEnvironment
  estimatedMinutes: number
}

export interface LabStep {
  instruction: string
  command?: string                    // exact command to type (revealed as a last-resort hint)
  expectedOutput?: string             // human-readable description of what the simulator shows
  validation: TerminalCommandRule
  hintAfterAttempts: number
  hintText?: string
}

export interface TerminalCommandRule {
  kind: 'exact' | 'regex' | 'file-exists' | 'process-running' | 'port-listening'
    | 'state-equals' | 'output-contains-all' | 'sequence'
  pattern?: string
  args?: string[]
  expected?: string | number | boolean
  caseSensitive?: boolean
  onFailMessage?: string
}

export interface ChaosIncident {
  id: string
  title: string
  injectionScript: string
  symptom: string
  imagineAnalogy: string
  diagnosticTrail: LabStep[]
  exactFix: LabStep[]
  lesson: string
  relatedScenarios: string[]
}

// ---------- Playground & state ----------

export interface PlaygroundSpec {
  layout: 'split-vertical'
  terminal: {
    shell: 'bash'
    supportedCommands: string[]
    filesystem: VirtualFileSystemNode          // the learner's laptop
    remoteFilesystem?: VirtualFileSystemNode   // extension: the VPS (a second machine in stage 1)
    editor: 'nano' | 'vim'
  }
  topology: { nodes: TopologyNode[]; showHealthBadges: true }
}

export interface VirtualFileSystemNode {
  name: string
  type: 'file' | 'dir'
  content?: string
  permissions?: string                // "644"
  children?: VirtualFileSystemNode[]
  owner?: string                      // extension
  size?: number                       // extension: bytes, for files whose content is not worth storing (the 40 MB jar)
}

/** The hidden causal state machine. Badges on the topology map are derived ONLY from this (spec 4.4.3). */
export interface SimulatedServerState {
  stage: number
  server: { hostname: string; publicIp: string; os: 'ubuntu-22.04'; uptimeSeconds: number; rebootPending: boolean }
  packages: { java17: boolean; java21: boolean; postgresql: boolean; nginx: boolean; docker: boolean }
  processes: { appPid: number | null; appManagedBy: 'none' | 'nohup' | 'systemd' | 'docker' | 'kubelet' }
  listeners: Record<string, number | null>
  firewall: { ufwEnabled: boolean; allowedPorts: number[] }
  files: Record<string, { exists: boolean; contentHash: string; permissions: string }>
  disks: { rootUsedPct: number; varLogUsedPct: number }
  systemd: { springbootService: 'enabled-running' | 'disabled' | 'failed' | 'restart-loop' }
  releases: { current: string | null; versions: string[]; brokenSymlink: boolean }
  docker: {
    containers: Record<string, 'running' | 'exited' | 'restarting'>
    networks: string[]; volumes: string[]; oomKilled: boolean; memoryLimitBytes: number | null
  }
  compose: { healthy: Record<string, boolean>; envResolved: Record<string, string> }
  cloud: {
    vpcOk: boolean; sgChainOk: boolean; albTargetsHealthy: number; natOk: boolean; rdsReachable: boolean
    hikariPool: { active: number; pending: number; max: number }
  }
  ci: {
    pipelineStatus: 'idle' | 'testing' | 'building' | 'deploying' | 'smoke-failed-rollback'
    lastImageTag: string | null; secretsPresent: Record<string, boolean>
  }
  k8s: {
    pods: Record<string, { status: 'Running' | 'Pending' | 'CrashLoopBackOff' | 'ImagePullBackOff' | 'OOMKilled'; restarts: number }>
    deployments: Record<string, { replicas: number; updatedReplicas: number; image: string }>
    secrets: Record<string, Record<string, string>>
    pvcBound: boolean; hpaReplicas: { min: number; max: number; current: number }
  }
}

// ---------- Reference sections ----------

export interface ReferenceSection {
  id: 'command-encyclopedia' | 'breakfix-50' | 'capstones-10'
  tables: ComparisonTable[]
}

export interface BreakFixScenario {
  id: string
  stage: number
  analogy: string
  errorSnippet: string
  rootCause: string
  diagnosticCommand: string
  resolution: string
  chaosIncidentRef?: string
}

// ---------- Rendering-side health badges (spec 4.4.3) ----------

export type HealthBadge = 'RUNNING' | 'CRASHED' | '502_BAD_GATEWAY' | 'DB_CONN_REFUSED' | 'PENDING' | 'CrashLoopBackOff'
