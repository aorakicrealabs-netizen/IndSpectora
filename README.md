# OpsLedger — Inspection, Asset Governance & Project Operations

**OpsLedger** is a self-hosted operational platform unifying **Asset & Facility Management**, **Visual & Parameterized Field Inspections**, **Sequential Multi-Approver Workflows**, and **WBS Project / Gantt Tracking** on top of a lightweight, persistent local stack.

Designed for both **plant & facility operations teams** and **engineering teams** deploying on localhost or private infrastructure, OpsLedger replaces scattered spreadsheets, disconnected photo folders, and manual sign-off loops with an auditable single-source system synchronized in real time over WebSockets.

> **Quick Links**: [Localhost & AI-Agent Deployment Runbook (`DEPLOY.md`)](./DEPLOY.md) · [Frequently Asked Questions (`FAQ.md`)](./FAQ.md)

---

## End-to-End Operational Workflow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. DEFINE ASSETS & ZONES (Admin / Approver)                                      │
│    Facility Zones ─▶ Asset Library (CSV Bulk Import or Manual)                   │
│                    ├─ Custom Inspection Parameters (Text, Number+Unit, Yes/No)   │
│                    └─ Engineering Drawings + Numbered Inspection Pins ──(links)──┼──┐
└──────────────────────────────────────────────────────────────────────────────────┘  │
                                        │                                               │
                                        ▼                                               │
┌──────────────────────────────────────────────────────────────────────────────────┐  │
│ 2. EXECUTE FIELD INSPECTION (Any Role)                                           │  │
│    Filter by Zone ─▶ Edit Draft Title ─▶ Record Condition + Custom Params        │  │
│                    └─ Click Visual Drawing Pins + Attach Pin-Linked Photos       │  │
└──────────────────────────────────────────────────────────────────────────────────┘  │
                                        │                                               │
                                        ▼                                               │
┌──────────────────────────────────────────────────────────────────────────────────┐  │
│ 3. SEQUENTIAL APPROVAL & DIGITAL FOOTPRINT (1–6 Approvers)                       │  │
│    Submit ─▶ Step 1 Pending (Real-Time Alert & "Need My Action")                 │  │
│              ├─ Send Back + Reason ─▶ Executor Revises & Resubmits ──┐           │  │
│              └─ Approve Step ──▶ Activates Step 2 .. Step N ─────────┘           │  │
│                                  └─▶ Final Approval (Immutable Digital Footprint)│  │
└──────────────────────────────────────────────────────────────────────────────────┘  │
                                        │                                               │
                                        ▼                                               │
┌──────────────────────────────────────────────────────────────────────────────────┐  │
│ 4. TRACK CORRECTIVE PROJECTS (WBS, Gantt & Table Views) ◀────────────────────────┘  │
│    Phases & WBS Codes ─▶ Registered Assignees ─▶ Blockers & Progress History     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules & Capabilities

### 1. Asset & Facility Library
- **Facility / Zone Areas**: Organize plant buildings, production lines, or utility zones with unique zone codes (e.g., `DRY-01`, `UTL-02`) and link Assets directly to their physical zones.
- **CSV Template & Bulk Import**: Download a pre-formatted CSV template (`opsledger-asset-import-template.csv`) and bulk-import or update dozens of Assets—including embedded **Custom Parameters**—with instant pre-import row validation.
- **Configurable Custom Inspection Parameters**: Define unlimited inspection metrics per Asset using three typed controls:
  - **Number with Unit** (e.g., `Powder Accumulation` in `kg`, `Delta P` in `kPa`, `Temperature` in `°C`)
  - **Yes / No Toggle** (e.g., `Chamber Seal Intact`)
  - **Free-Form Text** (e.g., `Operator Observation`)
- **Interactive Visual Inspection**: Upload an engineering drawing or schematic per Asset and place numbered inspection pins with guidance notes and optional links to **WBS Project Tasks**. Pins sync automatically into every newly created inspection report for that Asset.
- **Per-Asset Inspection History**: Inspect chronological readings across all historical reports for any individual Asset—including condition ratings, recorded parameter logs, and calculated numeric averages/trends.

### 2. Inspections, Sequential Approvals & Audit Governance
- **Facility-Filtered Execution & Editable Draft Titles**: Start inspections filtered by **Facility / Zone Area** and keyword search. Keep the report title editable while in `Draft` or `Sent Back` status (or anytime as `Admin`).
- **Sequential 1–6 Approver Routing**: Select between 1 and 6 distinct reviewers holding the `Approver` role in exact sequential order (`Step 1` → `Step N`).
- **Send Back & Targeted Comments**: Active step approvers receive persistent + WebSocket real-time alerts and can **Approve Step**, **Send Back** with a mandatory revision reason, or post comments **on individual Asset entries** or on the **overall report**.
- **Digital Footprint & Per-Item Edit History**: Replaces hand-drawn signature pads with an immutable **Digital Footprint** timeline and field-level **Edit History** tracking actor name, active roles, exact before/after changes, and timestamps.
- **Exports & Print**: Export structured inspection datasets to CSV or generate clean, theme-independent print/PDF audit sheets.

### 3. Need My Action & Live Notifications
- Personalized priority inbox surfaced simultaneously in three places:
  1. **Sidebar counter badge** on *Inspections & Audits*
  2. **Dashboard priority card** for immediate shift triage
  3. **Need My Action filter tab** inside the Inspections list
- Automatically displays `Pending Approval` reports where your sequential step is active (for Approvers) and `Sent Back` reports awaiting revision (for Executors).

### 4. Projects & Active Project (WBS, Gantt & Table Views)
- **WBS Hierarchy**: Structure shutdowns, preventive maintenance turnarounds, and corrective engineering actions with hierarchical Work Breakdown Structure (`WBS`) codes (`1`, `1.1`, `1.1.1`).
- **Dual Schedule Views**: Switch seamlessly between an interactive **Gantt Timeline** and a high-density **Table View** featuring **Schedule Start–Stop** columns, inline status/progress updates, and quick assignee switching.
- **Registered User Assignees**: Assign every activity directly to a registered OpsLedger team member (`assigneeId` + synchronized display name).
- **Automatic Change History & Timestamped Comments**: Updating progress or status automatically records immutable audit entries (e.g., `Work Progress 0% → 50% on dd/mmm/yyyy hh:mm`), paired with a timestamped **Activity Comments** feed and Finish-to-Start / Start-to-Start dependency blocker tracking.

### 5. Composable Multi-Role Access Control (RBAC)
Users can hold **multiple roles simultaneously** (e.g., `Approver + User` or `Admin + Approver`) managed via **User Management**:

| Operation / Capability | Admin | Approver | User |
| :--- | :---: | :---: | :---: |
| Start & submit inspection reports (1–6 step routing) | Yes | Yes | Yes |
| Revise & resubmit own `Sent Back` drafts | Yes | Yes | Yes |
| Appear in Approver selector & **Approve / Send Back** active steps | — *(unless also Approver)* | Yes | — |
| Create/edit Facility Zones, Assets, CSV imports, & Visual Pins | Yes | Yes | — |
| Create & manage Projects, WBS activities, & blockers | Yes | Yes | — |
| Update progress & comments on active assigned Project activities | Yes | Yes | Yes *(assigned only)* |
| Override-edit `Pending Approval` / `Approved` reports & `Completed` tasks | Yes *(logged)* | — | — |
| Manage Users, reset passwords, & assign multi-role sets | Yes | — | — |

### 6. Built-In Onboarding, FAQ & Theme Support
- **First-Time Per-Page Tours**: Guides new users automatically the first time they open each workspace, with **Launch Tour** and **Reset All First-Time Tours** controls in **How to Use**.
- **In-App Searchable FAQ**: Categorized troubleshooting and workflow Q&As right inside **How to Use**.
- **Light & Dark Mode**: Persistent theme toggle in the header with full contrast parity across tables, Gantt timelines, and visual pin editors.

---

## Real-World Application Cases

### Case A: Manufacturing Equipment & Plant Maintenance
**Scenario**: Daily and turnaround monitoring of high-value process machinery such as a **Rotary Spray Dryer Tower (`AST-DRY-01`)** in `DRY-01 — Dryer Hall Alpha`.

1. **Standardize Asset Setup**: A Reliability Engineer (`Approver`) imports plant equipment via CSV and configures custom parameters on `AST-DRY-01`: `Powder Accumulation` (`number`, `kg`, required), `Chamber Seal Intact` (`boolean`, required), and `Operator Observation` (`text`).
2. **Map Critical Inspection Points**: An engineering schematic of the spray dryer is uploaded once to the Asset Library with numbered visual pins: **Pin #1 (Rotary Valve Seal)** and **Pin #2 (Cyclone Hopper Chute)**—with Pin #2 linked to a preventive turnaround task (`1.2 Replace Chute Gasket`) in **Projects**.
3. **Shift Execution & Trending**: A Shift Operator (`User`) filters a new inspection by `DRY-01`, clicks Pins #1 and #2 to attach close-up inspection photos, enters `3.4 kg` for `Powder Accumulation`, and submits to a 2-step approval chain (`Line Supervisor` → `Maintenance Lead`).
4. **Long-Term Asset Intelligence**: Over months of inspections, supervisors open **Asset Library → History** on `AST-DRY-01` to review chronological `kg` accumulation trends before scheduling cleaning shutdowns.

### Case B: Facility Safety & Multi-Zone Compliance Audits
**Scenario**: Monthly EHS & facility safety walkthrough spanning **Chemical Storage (`CHM-01`)**, **Boiler & Chiller Room (`UTL-02`)**, and **Loading Dock (`LOG-03`)**.

1. **Zone-Scoped Audits**: Inspectors start separate zone-filtered audit drafts so field checklists contain only equipment and safety stations located inside that specific zone, keeping report titles editable while gathering findings (`"Q4 Boiler & Chiller EHS Walkthrough"`).
2. **Enforced Sequential Sign-Off**: Each report routes through a 3-step governance chain (`1. Area EHS Officer` → `2. Facility Engineer` → `3. Plant Director`). Only the active step reviewer is alerted in **Need My Action**.
3. **Controlled Send-Back Revisions**: At Step 2, the Facility Engineer spots an incomplete relief-valve photo, posts a comment directly on that specific Asset entry, and clicks **Send Back** with a revision note. The report moves into the original inspector's **Need My Action** queue, preserving prior comments and history.
4. **Corrective Closure & Audit Trail**: Once approved, the report locks against unauthorized edits with an immutable **Digital Footprint**. Follow-up remediation tasks are scheduled inside **Projects** under WBS `2.1`, assigned to named technicians, tracked in **Table View (`Schedule Start–Stop`)**, and archived for regulatory review.

---

## Technical Architecture

```
┌──────────────────────────────┐        HTTPS / HTTP (:3000)        ┌──────────────────────────────┐
│ Browser Client (React 19)    │ ◀────────────────────────────────▶ │ Express Server (server.ts)   │
│  • Tailwind CSS v4 (Dark/Lt) │        REST JSON + Multipart       │  • Session Bearer Auth       │
│  • Interactive Gantt / Pins  │                                    │  • Multi-Role RBAC Guards    │
│  • Live WebSocket Listener   │ ◀═════════ WebSockets (/ws) ═════▶ │  • Multer Image Uploads      │
└──────────────────────────────┘        Real-time sync & alerts     └──────────────┬───────────────┘
                                                                                   │
                                                                    ┌──────────────▼───────────────┐
                                                                    │ Local Persistent ./data/     │
                                                                    │  • data/opsledger.db (SQLite)│
                                                                    │  • data/uploads/ (Photos)    │
                                                                    └──────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js (`v22.18+` native TS execution or `tsx`), Express, `ws` WebSocket server, Multer
- **Database**: `better-sqlite3` (`./data/opsledger.db`, WAL-friendly local relational persistence with foreign keys)

---

## Quick Start (Localhost)

OpsLedger starts cleanly with **zero mock operational data** and automatically initializes `./data/opsledger.db` on first boot.

### Option 1: Direct Node.js (`v22.18+` Recommended)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Verify TypeScript & frontend build
npm run lint && npm run build

# 4. Start OpsLedger on http://localhost:3000
npm run dev
```

For production serving (`dist/` static bundle + API on port `3000`):
```bash
NODE_ENV=production PORT=3000 npm start
```

### Option 2: Docker & Docker Compose

```bash
# Build and start in background on http://localhost:3000 with persistent ./data mount
docker compose up --build -d
```

> **Troubleshooting & AI-Agent Automation**: See [`DEPLOY.md`](./DEPLOY.md) for preflight checks, native SQLite C++ build prerequisites, container lifecycle commands, health smoke tests, and step-by-step **User Intervention Gates**.

---

## First-Time Login & Usage Guide

When OpsLedger boots against an empty database, two starter accounts are created automatically:

| Starter Role | Email | Default Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin + Approver** | `admin@opsledger.local` | `admin123` | Full User CRUD, Asset/Zone setup, Approvals, Projects, Override edits |
| **Standard User** | `inspector@opsledger.local` | `inspect123` | Start/submit inspections, edit own Draft/Sent-Back reports, assigned tasks |

### Recommended First 10 Minutes
1. **Sign In & Rotate Starter Passwords**: Open `http://localhost:3000`, sign in as `admin@opsledger.local`, go to **User Management**, immediately click **Reset Password** on both starter accounts, and create named team accounts with appropriate multi-role assignments.
2. **Set Up Zones & Import Assets**: Open **Asset Library → Facility / Zone Areas** to add your physical zones, then click **Download CSV Template** and upload your equipment inventory via **Import CSV**.
3. **Follow Built-In Tours**: Every workspace launches a brief interactive walkthrough on your first visit. Visit **How to Use** anytime to replay tours, check the Role Capability Matrix, or search the in-app FAQ.

---

## Further Documentation

- [`DEPLOY.md`](./DEPLOY.md) — Full **AI-Agent Localhost Deployment & First-Setup Runbook** (Node.js + Docker Compose, automated verification script, and explicit User Intervention Gates).
- [`FAQ.md`](./FAQ.md) — Complete **OpsLedger Usage FAQ** covering Multi-Role RBAC, CSV Parameter Syntax (`Label|type|unit|required`), Sequential Approvals, Digital Footprints, WBS/Gantt vs. Table View, and SQLite backup/reset procedures.
