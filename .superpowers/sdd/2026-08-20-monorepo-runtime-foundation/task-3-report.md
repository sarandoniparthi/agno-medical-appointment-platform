# Task 3 report: TypeScript applications and shared libraries

## Generator commands

PowerShell resolves bare `npm` to an execution-policy-blocked `.ps1` shim, so the schema-compatible commands used `npm.cmd exec nx -- g`:

```powershell
npm.cmd exec nx -- g @nx/react:application apps/web --bundler=vite --unitTestRunner=vitest --e2eTestRunner=playwright --style=css --routing=true --strict=true --no-interactive
npm.cmd exec nx -- g @nx/nest:application apps/api --unitTestRunner=none --strict=true --no-interactive
npm.cmd exec nx -- g @nx/js:library libs/contracts --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
npm.cmd exec nx -- g @nx/react:library libs/ui --bundler=vite --unitTestRunner=vitest --style=css --strict=true --no-interactive
npm.cmd exec nx -- g @nx/js:library libs/auth --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
npm.cmd exec nx -- g @nx/js:library libs/observability --bundler=tsc --unitTestRunner=vitest --strict=true --no-interactive
```

Nx 23.1.1 schemas confirmed the requested generator names and options. Local Nx generator dependencies were added at `23.1.1`; TypeScript was pinned from `7.0.2` to `5.9.3` because the locked Nx 23 routing generator calls the removed TypeScript 7 `ScriptTarget` enum. `vite-tsconfig-paths` was added as required for the API test config.

## Files and interfaces

- Created the `web` React/Vite application plus its Playwright e2e project.
- Created the `api` NestJS application, its `vitest` target, and `apps/api/vite.config.ts`.
- Created buildable `contracts`, `ui`, `auth`, and `observability` libraries with Vitest tests.
- Added `@scheduler/contracts`, `@scheduler/ui`, `@scheduler/auth`, and `@scheduler/observability` paths in `tsconfig.base.json`.
- Implemented `GET /health`, returning `{ service: 'api', status: 'ok' }`.
- Removed the generator-created `apps/api-e2e` project because its default Jest configuration violated the Vitest-only TypeScript testing requirement.

`npm.cmd exec nx -- show projects` lists `web`, `api`, `contracts`, `ui`, `auth`, and `observability` (and the requested React Playwright project `web-e2e`).

## TDD evidence

- RED: `npm.cmd exec nx -- test api` failed at `app.controller.spec.ts` with `TypeError: module.get(...).health is not a function`.
- GREEN: after adding `AppController.health()`, the same command passed: 1 file / 1 test.

An earlier RED attempt exposed the Vitest configuration root mismatch (`No test files found`). Adding `root: 'apps/api'` to the supplied API config corrected test discovery; the next RED was the expected missing-method failure.

## Verification

```powershell
npm.cmd exec nx -- run-many -t test --projects=web,api,contracts,ui,auth,observability --skip-nx-cache
npm.cmd exec nx -- run-many -t build --projects=web,api,contracts,ui,auth,observability --skip-nx-cache
```

Both passed uncached. Tests: web 2, api 1, contracts 1, ui 1, auth 1, observability 1. `git diff --check` passed.

## Commit

`feat: add react nest and shared nx projects`

## Self-review and concerns

No Jest test project or Jest references remain under `apps`, `package.json`, or `nx.json`; TypeScript tests use Vitest. The generator introduced Vite/Nx deprecation and ESM-loader warnings, plus existing generated React Router test warnings; they do not fail builds or tests. `npm install` reports 25 transitive audit findings (19 high); no audit remediation was made because it would expand this foundation task beyond the locked-generator dependency set.
