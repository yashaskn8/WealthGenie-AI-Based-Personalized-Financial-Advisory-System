# WealthGenieFV Backend Hardening Progress

## Current Scope
- Backend-only hardening and defect repair.
- No new product features, endpoints, pages, workflows, commits, pushes, merges, or pull requests.
- Existing local repository-wide audit changes are preserved.
- Current pass: backend evolution only, focused on internal reliability, scalability, observability, integration resilience, and security-preserving behavior without API or product-scope changes.

## Proactive Continuation Snapshot
- Completed so far: repository-wide defect audit, backend hardening pass, backend regression coverage, backend Jest validation, backend syntax checks, and diff hygiene checks.
- Most recent changes: XIRR validation hardening, tax query schema preservation for `self_senior`, profile-isolated recommendation cache keys, stricter goal/Monte Carlo profile handling, owned-profile goal recomputation, market-data numeric filtering, CORS env parsing, and `server/tests/backendHardening.test.js`.
- Current evolution work in progress: evaluating internal backend resilience improvements for ML response validation, market-data request coalescing, error-handler status/category safety, and recommendation ownership query isolation.
- Unfinished local source work: backend evolution validation pending after the next internal changes.
- Next Codex account should do first: read this file, read `HANDOFF.md`, run `cd server && npm run test`, then inspect any new failures before changing source.
- Files to inspect first next time: `server/routes/goals.js`, `server/routes/montecarlo.js`, `server/routes/recommend.js`, `server/routes/projection.js`, `server/services/xirrCalculator.js`, `server/services/marketDataService.js`, `server/server.js`, `server/validation/schemas.js`, and `server/tests/backendHardening.test.js`.
- Tests to rerun first next time: `cd server && npm run test`; if backend-only changes are made, also run `git diff --check`.

## Backend Areas Analyzed
- Server entrypoint and middleware: `server/server.js`, auth, global error handling, CORS/rate-limit/body parsing.
- Configuration: MongoDB, Redis, environment contract, market refresh job scheduling.
- Models: `User`, `FinancialProfile`, `Goal`, `Recommendation`, `Instrument`, `ConversationHistory`.
- Routes: auth, profile, recommendations, projections/XIRR, Monte Carlo, goals, portfolio, tax, market, instruments, chat.
- Services: tax engine, post-tax calculator, Monte Carlo engine, portfolio engine, projection engine, XIRR solver, ML client, market data, Gemini/Groq advisory and chat.
- Tests: backend Jest suites and existing financial-engine invariant coverage.

## Bugs Found
- Invalid XIRR cashflow dates can produce misleading numeric output instead of a validation error.
- Tax query validation strips `self_senior`, so 80D self-senior handling cannot be requested through `/api/tax/compute` or `/api/tax/compare`.
- Recommendation cache key omits `profileId`, so two same-shape profiles for the same user can receive a cached `recommendationId` belonging to the wrong profile.
- Goal creation accepts a supplied-but-missing `profileId` and silently falls back to the latest profile.
- Monte Carlo accepts a supplied-but-missing `profileId` and silently runs without profile-specific tax adjustment.
- Goal recommendation selection uses the latest user recommendation instead of preferring the goal's profile recommendation.
- Goal profile lookups during advice refresh/chart recompute can read by profile ID without confirming the profile still belongs to the authenticated user.
- Stale goal-advice detection compares lowercased advice against mixed-case patterns, missing `"API key not configured"`.
- Market index parsing keeps non-finite/zero prices, which can produce NaN statistics from malformed upstream data.

## Bugs Fixed
- Fixed: invalid XIRR dates now return validation errors from the solver/API path instead of misleading numeric estimates.
- Fixed: invalid XIRR initial guesses are clamped to a safe finite default.
- Fixed: tax query schemas now preserve `self_senior`.
- Fixed: recommendation cache keys now include `profileId`.
- Fixed: supplied-but-missing `profileId` values in goals and Monte Carlo now fail clearly instead of silently falling back.
- Fixed: goal creation now prefers recommendations tied to the goal profile.
- Fixed: goal profile lookups now confirm profile ownership when refreshing advice or recomputing charts.
- Fixed: stale-advice detection now matches lowercased patterns consistently.
- Fixed: market index parsing now filters non-finite and non-positive prices before statistics are computed.
- Fixed: CORS origin parsing now trims configured origins and falls back safely when the env value is empty.
- Fixed: added focused backend-hardening regression tests for tax schema preservation, recommendation cache-key isolation, and XIRR validation.

## Files Modified
- `BACKEND_UPDATE.md`
- `HANDOFF.md`
- `server/jobs/marketDataRefresh.js`
- `server/models/Recommendation.js`
- `server/query_db.js`
- `server/server.js`
- `server/routes/goals.js`
- `server/routes/montecarlo.js`
- `server/routes/projection.js`
- `server/routes/recommend.js`
- `server/services/marketDataService.js`
- `server/services/monteCarloEngine.js`
- `server/services/xirrCalculator.js`
- `server/tests/backendHardening.test.js`
- `server/tests/monteCarloEngine.test.js`
- `server/validation/schemas.js`

## Validation Results
- Pre-pass inherited validation: backend Jest passed, frontend lint/build passed, ML pytest passed, and diff hygiene passed from the repository-wide audit.
- Backend-hardening Jest validation passed: 9 suites, 191 tests.
- Syntax checks passed for modified backend entry/route/service/schema files: `server.js`, `routes/goals.js`, `routes/montecarlo.js`, `routes/projection.js`, `routes/recommend.js`, `services/xirrCalculator.js`, `services/marketDataService.js`, and `validation/schemas.js`.
- `git diff --check` passed; Git reported only normal LF-to-CRLF working-copy warnings on Windows.

## Remaining Risks
- Live MongoDB, Redis, market-data network calls, Gemini/Groq, and ML HTTP integration remain externally dependent.
- Local ignored secrets/runtime artifacts are not source-audit targets.

## Progress Percentage
- 100% for verified local backend hardening scope.

## Next Steps
- Review the local backend diff before deciding whether to commit.
- Run live integration checks only when MongoDB, Redis, market-data network access, Gemini/Groq credentials, and the ML HTTP service are available.
