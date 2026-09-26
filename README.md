# Agent skills for shipping mobile apps

Field-tested [Agent Skills](https://agentskills.io) for building and shipping iOS/Android apps with coding agents: **Claude Code, OpenAI Codex, Gemini CLI, Antigravity, Cursor**, and anything else that reads `SKILL.md`.

They were distilled from taking a real app ([MathMonarch](https://mathmonarch.ravishgarg.com)) through Apple and Google review. That included recovering from design (4), completeness (2.1/2.3), subscription (3.1.2) and spam (4.3) rejections, wiring subscriptions through RevenueCat on both stores, and running the backend solo in production. Every rule in them exists because skipping it cost real time.

## Install

```bash
git clone https://github.com/gargravish/agent-skills.git
cd agent-skills
./install.sh                      # Claude Code, Codex, ~/.agents, Gemini CLI, Antigravity
./install.sh --agents claude      # just one agent
```

Or copy a folder from `skills/` into your agent's skills directory (`~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills`, `~/.gemini/skills`).

## Contributing

Issues and PRs are welcome, especially new store-review gotchas, with the rejection guideline and what fixed it. These skills are published automatically from a private working repo after a secret scan, so accepted changes are merged there and republished.

MIT licensed.

## Skills

| Skill | What it does |
|---|---|
| [`mobile-app-builder`](skills/mobile-app-builder/SKILL.md) | Field-tested playbook for BUILDING iOS/Android apps (Expo + React Native first; native SwiftUI / Jetpack Compose via routed skills) so they look modern, work on every device and pass App Store / Google Play review the fi… |
| [`mobile-app-release`](skills/mobile-app-release/SKILL.md) | End-to-end playbook for building, monetizing and shipping Expo/React Native mobile apps to the Apple App Store and Google Play — local EAS builds on a Mac, store account setup (agreements, merchant profiles), in-app subs… |
| [`small-saas-engineering`](skills/small-saas-engineering/SKILL.md) | Hard-won, reusable patterns for building and operating a small/solo commercial SaaS (Flask/Python or similar backend + React frontend, deployed on a serverless platform like Google Cloud Run, with Postgres). |
