// The 8-stage ladder (spec 0.1). Phase 1 ships stage 1; the rest are shown locked in the hub until their content lands.
import type { StageNumber } from '../types'

export interface StageSummary { number: StageNumber; title: string; era: string; idea: string; pain: string; live: boolean }

export const STAGE_CATALOG: StageSummary[] = [
  { number: 1, title: 'Manual Bare-Metal / VPS', era: 'The PuTTY & FileZilla Era', idea: 'I can get a .jar onto a remote Linux box and run it.', pain: 'Server reboots kill the app; raw port 8080 is exposed; every deploy is 20 manual commands.', live: true },
  { number: 2, title: 'systemd + Nginx Hardening', era: 'The Receptionist & Backup Generator', idea: 'The app restarts itself, is reachable on port 80/443, and survives reboots.', pain: 'JAR uploads cause downtime mid-request; secrets live in plaintext configs; human typos.', live: true },
  { number: 3, title: 'Shell Automation', era: 'The Conveyor Belt & Railroad Switch', idea: 'One script deploys atomically with zero downtime and automatic backups.', pain: '"Works on my laptop, crashes on the server": environment drift, dependency conflicts.', live: false },
  { number: 4, title: 'Docker Containerization', era: 'The Standardized Shipping Container', idea: 'The app ships inside a sealed box that runs identically everywhere.', pain: '15-line docker run incantations, strict startup order, one host is a single point of failure.', live: false },
  { number: 5, title: 'Docker Compose', era: "The Conductor's Musical Score", idea: 'One YAML file orchestrates app + DB + proxy with health-gated startup.', pain: 'Single host limit; traffic spikes kill one machine; no fleet thinking.', live: false },
  { number: 6, title: 'Cloud & Managed Services', era: 'The Gated Smart City', idea: 'VPC, subnets, security groups, managed RDS, load balancers.', pain: 'Developers still build/push manually; broken code reaches production with no automated tests.', live: false },
  { number: 7, title: 'CI/CD Pipelines', era: 'The Automated Airport Security', idea: 'Every push is automatically tested, scanned, built, deployed, and health-checked.', pain: 'Cannot scale individual services; no canary rollouts; manual fleet ops do not scale.', live: false },
  { number: 8, title: 'Kubernetes', era: 'The Autonomous Fleet Commander', idea: 'An autonomous fleet commander keeps the desired number of pods alive, scales, and heals.', pain: '(Course summit: mastery demonstrated.)', live: false },
]
