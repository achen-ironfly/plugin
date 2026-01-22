# @glossplugin Monorepo

A monorepo containing multiple packages for the Gloss Plugin project.

## Packages

- **[@glossplugin/opal-card](packages/opal-card)** - Opal Card package
- **[@glossplugin/snaptrade](packages/snaptrade)** - Snaptrade integration package

## Installation

```bash
npm install
```

This will install dependencies for all packages in the workspace.

## Scripts

Run scripts for a specific package:

```bash
# Run dev for opal-card only
npm run dev:opal-card

# Run build for snaptrade only
npm run dev:snaptrade
```

## Workspace Structure

```
.
├── packages/
│   ├── opal-card/       # Opal Card package
│   └── snaptrade/       # Snaptrade package
├── package.json         # Root workspace configuration
└── README.md           # This file
```
