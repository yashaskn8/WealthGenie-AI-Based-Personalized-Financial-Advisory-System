# WealthGenieFV Defect Audit Progress

## Repository Structure Discovered
- Root legacy static landing surface: `index.html`, `script.js`, `style.css`, `asssets/`, root media, and documentation.
- Frontend SPA: `reactapp/` with Vite, React components, client API wrapper, utilities, static assets, build/lint config, and nginx config.
- Backend API: `server/` with Express startup, routes, middleware, Mongoose models, validation schemas, services, jobs, tests, and utility scripts.
- ML service: `ml-service/` with FastAPI app, Pydantic schemas, feature engineering, SHAP explainability, backtester, training script, requirements, and tests.
- Generated or local runtime folders are outside manual source audit scope: `node_modules`, `dist`, `.venv`, caches, local `.env`, and ignored scratch/runtime artifacts.

## Files Analyzed
- Root: `.gitignore`, `README.md`, `CONTRIBUTING.md`, `index.html`, `script.js`, `style.css`, `know_all.md`, `knowledge.md`, asset presence.
- Backend: `server/server.js`, config, middleware, validation, models, routes, services, tests, `query_db.js`.
- Frontend: `reactapp/src/App.jsx`, `ProfileEditor.jsx`, `services/api.js`, core dashboard/goal/chat/projection components, utilities, config, package manifests.
- Frontend final state-management pass: `reactapp/src/context/UserContext.jsx` reviewed after the latest protocol update.
- ML service: `main.py`, `schemas.py`, `feature_engineering.py`, `explainer.py`, `backtester.py`, `model/train.py`, tests, requirements.
- Current modified files reviewed: `server/services/monteCarloEngine.js`, `server/routes/montecarlo.js`, `server/models/Recommendation.js`, `server/services/marketDataService.js`.
- `HANDOFF.md`: created and maintained for continuation safety.

## Bugs Found
- Monte Carlo engine rounded sub-year/fractional horizons up to whole years, causing short-term goal projections to be overstated.
- Monte Carlo deterministic SIP control variate used zero-rate math for negative monthly rates, distorting downside projections.
- Monte Carlo route Redis cache key omitted `target_amount`, `current_savings`, and volatility, allowing wrong cached probability/results for materially different requests.
- Recommendation persistence dropped `expenseRatio`, so saved recommendations did not match the API response contract.
- FD freshness check depended only on `updatedAt`, while the current `Instrument` model guarantees only `createdAt`; stale FD data could be missed.
- Market data scheduler declares UTC cron timing but recurring jobs currently run relative to server startup.
- Profile save/recommendation flow discards the created backend `profileId`, then rebuilds duplicate profiles for recommendations/rebalancing/goals.
- `server/query_db.js` reads `MONGO_URI` while the app and `.env.example` use `MONGODB_URI`.
- Goals update route lacks Joi body validation for `priority`, `current_savings`, and `target_amount`, allowing invalid data to reach Mongoose/service logic.
- `RecommendationDashboard.jsx` updates React state from inside `useMemo`, a render-phase state update that can cause warnings and unstable rerenders.
- `UserContext.jsx` updates state during render and assumes stored profile JSON is valid, which can crash or destabilize consumers if the context is used.

## Bugs Fixed
- Fixed: Monte Carlo now builds month-based projection checkpoints and preserves fractional terminal horizons.
- Fixed: Monte Carlo negative-rate deterministic SIP calculations now use the annuity formula instead of treating negative returns like zero returns.
- Fixed: Monte Carlo route cache key now includes current savings, target amount, effective rate, and volatility.
- Fixed: Recommendation schema now persists `expenseRatio`.
- Fixed: FD staleness check now falls back to `createdAt` and flags records with neither timestamp.
- Fixed: Market data scheduler now aligns recurring jobs to declared UTC cron times while preserving startup warmup.
- Fixed: `server/query_db.js` now honors `MONGODB_URI` with `MONGO_URI` fallback and removes an unused import.
- Fixed: Goals PATCH route now validates update bodies with Joi before touching Mongoose/service logic.
- Fixed: Profile save/dashboard/rebalance flows now preserve and reuse backend `profileId`.
- Fixed: `RecommendationDashboard.jsx` no longer calls `setExpandedRows` during render via `useMemo`.
- Fixed: `UserContext.jsx` now safely falls back when stored profile JSON is malformed and updates derived recommendations from profile-completion callbacks without render/effect state loops.
- Fixed: Added targeted Monte Carlo regression tests for fractional horizons and negative-rate annuity math.

## Files Modified
- `AUDIT_PROGRESS.md`
- `server/services/monteCarloEngine.js`
- `server/routes/montecarlo.js`
- `server/models/Recommendation.js`
- `server/services/marketDataService.js`
- `server/jobs/marketDataRefresh.js`
- `server/query_db.js`
- `server/validation/schemas.js`
- `server/routes/goals.js`
- `server/tests/monteCarloEngine.test.js`
- `reactapp/src/App.jsx`
- `reactapp/src/ProfileEditor.jsx`
- `reactapp/src/RecommendationDashboard.jsx`
- `reactapp/src/context/UserContext.jsx`

## Validation Status
- Baseline before repairs: backend Jest passed, frontend build passed, frontend lint passed, ML pytest passed.
- Focused post-repair smoke checks: Monte Carlo fractional and negative-rate one-off Node checks passed; `server/routes/montecarlo.js` syntax check passed.
- Full post-repair backend validation passed: 8 Jest suites, 187 tests.
- Full post-repair frontend validation passed: ESLint clean and Vite production build successful. Vite still reports the existing chunk-size warning only.
- Full post-repair ML validation passed: 17 pytest tests, with only the existing pytest cache permission warning.
- `git diff --check` passed; Git reports normal LF-to-CRLF working-copy warnings only.
- Current git state: modified code files plus new `AUDIT_PROGRESS.md` and `HANDOFF.md`; no commits, pushes, merges, or PRs.

## Remaining Issues
- No additional verified source-level defects found in the audited repository scope after the final consistency pass.
- No source fixes are currently pending.

## Known Risks Or Unverifiable Areas
- External services were not live-verified under restricted network conditions: MongoDB, Redis, AMFI/Yahoo, Gemini/Groq, and ML service over HTTP.
- Local secret file `server/.env` is ignored and was not source-audited; `.env.example` was used for environment contract review.
- Documentation contains historical/count drift and terminal mojibake, but no runtime-impacting doc-only edits have been made.

## Current Progress Percentage
- 100% for source audit and verified local repair scope.

## Next Recommended Actions
- Review the local diff before deciding whether to commit.
- Run live integration checks only when MongoDB, Redis, market-data network access, Gemini/Groq credentials, and the ML HTTP service are available.
