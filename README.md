# Adopta

Adopta helps organizations drive Microsoft 365 and Copilot adoption through
targeted communications in Microsoft Teams and a conversational Adoption Coach.
It brings together Power Apps, Power Automate, Dataverse, and Copilot Studio.

## What it does

- **Adoption Coach** answers questions, clarifies the user's role and goals,
  and provides practical guidance grounded in the configured knowledge sources.
- **Main agent** handles conversations, explains communications, and delegates
  adoption-related requests to the Coach.
- **Communications app** lets communication managers draft messages, select
  recipient groups, schedule delivery, and review delivery history and results.
- **Admin app** manages branding, agent display names, Coach knowledge,
  recipient groups, and the sending switch.
- **Delivery automation** applies settings, processes scheduled communications,
  sends cards in Teams, and records delivery outcomes in Dataverse.

Sending requires an explicitly enabled configuration. Installing the solution
alone does not authorize communications to be sent.

## Two independent editions

| | Adopta IT | Adopta EN |
|---|---|---|
| Solution unique name | `Adopta` | `AdoptaEN` |
| Main agent and Coach | Italian only | English only |
| App interface | Italian / English | Italian / English |
| Tables, flows, and settings | Dedicated to IT | Dedicated to EN |

Both editions can coexist in the same environment with separate application
data and configuration. Changing an app's interface language does not change
the language of its agents or newly scheduled communication cards.

Each edition includes two agents, two code apps, five flows, six tables,
and two application security roles.

## Download version 1.0.0.20

| Edition | Managed | Unmanaged |
|---|---|---|
| Italian | [Download managed](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_managed.zip) | [Download unmanaged](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_IT_1_0_0_20_unmanaged.zip) |
| English | [Download managed](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_managed.zip) | [Download unmanaged](https://github.com/MarcoZama/Adopta/releases/download/v1.0.0.20/Adopta_EN_1_0_0_20_unmanaged.zip) |

The [1.0.0.20 release](https://github.com/MarcoZama/Adopta/releases/tag/v1.0.0.20)
also includes a `.sha256` checksum for each ZIP. These are native Power Platform
exports, not unmanaged packages relabeled as managed.

Use **managed** packages in destination environments and **unmanaged** packages
for development. Do not import a managed solution over an existing unmanaged
solution with the same unique name, or delete application data to change types.

Version 1.0.0.20 fixes the code app launch issue affecting versions 1.0.0.18/19,
where the player could display diagnostic JSON instead of the interface.

## Installation

Installation guides:

- [English](installation/README.md)
- [Italiano](installation/README.it.md)

Both guides cover prerequisites, connections, import, security roles,
configuration, agent publication, Teams distribution, and acceptance checks.

You can install Italian, English, or both. Keep sending blocked until the
selected edition has been configured and tested with a small recipient group.

## Repository layout

| Path | Contents |
|---|---|
| [src](src/) | Italian solution and agents |
| [src-en](src-en/) | English solution and agents |
| [admin-app](admin-app/) | Admin app React/TypeScript source |
| [code-app](code-app/) | Communications app React/TypeScript source |
| [shared](shared/) | Shared edition-aware bindings and adapters |
| [installation](installation/) | Installation and operational checks |
| [deploy](deploy/) | Packaging, validation, and technical documentation |
| [tests](tests/) | Agent, flow, packaging, and edition-isolation tests |

## Local development

Prerequisites: Node.js 24, PowerShell 7, .NET 10, and
[Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction)
2.12.2, including the authoring assemblies used by the tests.

```powershell
npm ci
npm --prefix .\admin-app ci
npm --prefix .\code-app ci
npm test

.\deploy\Build-Solution.ps1 -Edition it -PackageType Both
.\deploy\Build-Solution.ps1 -Edition en -PackageType Both
```

Local builds create managed and unmanaged packages in `dist/local` with PAC CLI,
without connecting to Dataverse. The source includes the native `Both` metadata
and managed form variants required for dual-format packaging.
Installed dependencies, build output, exports, and local configuration files
are excluded from Git; SDK schemas, bindings, and required solution assets
remain versioned.
