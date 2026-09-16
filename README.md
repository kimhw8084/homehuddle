# HomeHuddle

A shared household workspace for chores, dinner planning, shopping and earned rewards. Expo / React Native, TypeScript, Zustand and Supabase PostgreSQL.

**Status: engineering preview, not production certification.** The signed-in core is persisted and tested. Billing, notification delivery, offline writes and native release validation are not complete. Read [implementation status](docs/implementation-status.md) before deploying or making product promises.

## Local development

Use Node 22 (see `.nvmrc`). Run `npm ci`, then create an untracked `.env` using `.env.example`. Set the Supabase URL and publishable client key; a legacy anon key is supported. Never put server secrets or service-role credentials in `EXPO_PUBLIC_*`.

```sh
npm run check:env
npm start
```

The configured hosted project has the new migrations applied. Other environments must follow [operations](docs/operations.md). Never run the historical reset against existing hosted data. Provider flags alone do not configure OAuth; native sign-in/push require a development build and provider setup.

## Quality gates

```sh
npm run check
npm run check:env
npx expo install --check
npm run export:web
npm run test:db:native
```

`check` includes TypeScript, Jest, isolated PostgreSQL/WASM tests and lint. Whole-repo lint allows legacy warnings; production feature directories have a separate zero-warning gate. The WASM harness never contacts hosted data; it does not emulate Auth/Storage/Realtime/PostgREST or native concurrent connections. The separate native runner needs working PostgreSQL binaries and pgcrypto; configure `PG_BIN` if necessary.

CI compiles with a dummy local public key. Its web artifact is **not for deployment**.

## Structure

```text
app/                       Routes, authentication, onboarding, account settings
components/ui/             Shared production forms, panels and editors
features/
  chores/                  Assignment, completion, proofs
  household/               Home review inbox and household planner
  meals/                   Recipes, dinners, weekly reuse
  planning/                Persistence hooks, RPC client, civil dates
  rewards/                 Catalog, purchases, wallet
  shopping/                Shared shopping list
  demo/screens/            Preserved prototypes, explicit dev bypass only
fixtures/                  Demo data, never default production state
hooks/                     Household bootstrap and synchronization
lib/                       Auth, backend boundaries, adapters
store/                     Session, onboarding, household read models
types/                     Application contracts
supabase/migrations/       Versioned schema and transactional commands
supabase/tests/            Isolated database regression fixtures
__tests__/                 Application and screen regression tests
scripts/                   Environment and database test runners
docs/                      Architecture, operations, implementation evidence
.github/                   Quality gates, dependency updates, PR checklist
```

## Documentation

- [Architecture and invariants](docs/architecture.md)
- [Deployment and recovery](docs/operations.md)
- [Implementation status and remaining work](docs/implementation-status.md)
- [Git and publication workflow](docs/git-workflow.md)

The full product design and improvement backlog are versioned under [docs/product](docs/product/README.md), with matching baseline exports in the owner's iCloud Downloads folder. They describe the target vision; the implementation status describes what exists today.
