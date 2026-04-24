# The Player's Mind — monorepo

Three PWA apps (Player, Coach, Parent) + shared design system + Supabase client,
all in one pnpm workspace.

## Quick start

```bash
# one-time
pnpm install

# dev (run all apps in parallel)
pnpm dev

# dev single app
pnpm --filter @tpm/player dev
pnpm --filter @tpm/coach dev
pnpm --filter @tpm/parent dev
```

Each app runs on its own port:
- Player → http://localhost:5173
- Coach → http://localhost:5174
- Parent → http://localhost:5175

## Structure

```
tpm/
├── apps/
│   ├── player/       # child-facing PWA
│   ├── coach/        # coach + club admin PWA
│   └── parent/       # parent / guardian PWA
└── packages/
    ├── design-system/  # brand tokens, CSS vars, shared components
    ├── supabase/       # typed Supabase client + auth helpers
    └── config/         # shared tsconfig, vite, eslint
```

## Environment

Copy `.env.example` to `.env.local` in each app and fill in:

```
VITE_SUPABASE_URL=https://kpsxdpxehorbjzgkkjqy.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key from Supabase Studio → Project Settings → API>
```

> **Note:** The schema currently lives in the `tpm` schema on the shared
> `calarossa` project. Before launch we migrate to a dedicated TPM project
> (see Task #9 in the plan).

## Conventions

- TypeScript strict everywhere
- Functional React components with hooks — no class components
- Styling: plain CSS with tokens from `@tpm/design-system`. No Tailwind for v1.
- State: React Query for server state, Zustand for local UI state where needed
- Testing: vitest + React Testing Library
- Commit style: conventional commits

## Brand

Brand identity lives in `../TPM-brand-identity.html` and
`../TPM-brand-guide.pdf`. Design tokens (colours, typography, spacing) are
codified in `packages/design-system/src/tokens.css`.
