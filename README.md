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

Run scripts across all packages:

```bash
# Install dependencies for all packages
npm install

# Run dev mode for all packages
npm run dev -ws

# Build all packages
npm run build -ws

# Run tests for all packages
npm run test -ws
```

Run scripts for a specific package:

```bash
# Run dev for opal-card only
npm run dev --workspace=@glossplugin/opal-card

# Run build for snaptrade only
npm run build --workspace=@glossplugin/snaptrade
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

## Adding New Packages

To add a new package to the monorepo:

1. Create a new directory under `packages/`
2. Add a `package.json` file with the `@glossplugin/` scope
3. Add the path to `workspaces` in the root `package.json`

## Contributing

Each package is independently managed but shares dependencies through the root workspace.
