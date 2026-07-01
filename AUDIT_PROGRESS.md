# WealthGenieFV Audit Progress

## Files Analyzed
- 124 / 124 tracked files reviewed.
- Source of truth: `git -c safe.directory=C:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV ls-files`.
- Fresh full-read evidence: `trackedFiles=124`, `totalBytes=7524394`, `repoContentSha256=9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762`.

## Bugs Found
- Backend test command documented but absent from `server/package.json`.
- README documented non-existent/stale backend routes and false AES-256-GCM field-encryption behavior.
- `GROQ_API_KEY` backend failover variable was missing from `server/.env.example` and README env docs.
- `reactapp/nginx.conf` proxied `/api` to fictional non-current host `server:5000`.
- `ml-service/explainer.py` had dead duplicate `load_explainer()` loading path and unused imports.
- ML enriched prediction docs implied derived features feed the model, while train/inference actually use four raw features in exact order.
- Portfolio optimizer UI could send unsupported local asset IDs to backend and lacked a safe `sukanya` to `SSY` mapping.
- `risk_parity` optimizer response omitted expected return and Sharpe metrics, causing frontend `NaN` rendering risk.
- `TaxScreen.jsx` had partial 80D state with unused setters, no UI controls, missing `profile?.age` effect dependency, and incomplete deduction totals.
- ML/test dependency docs claimed pytest while requirements did not include it.

## Bugs Fixed
- Added real backend tests and `npm test` script.
- Added real ML pytest validation and feature-order tests.
- Corrected README API map, security model, test commands/coverage, Groq env docs, and ML feature-order wording.
- Added `GROQ_API_KEY` to `server/.env.example`.
- Updated nginx proxy target to `127.0.0.1:5000` for non-Docker deployment.
- Removed dead ML explainer loader and unused Python imports.
- Hardened frontend optimizer asset mapping/filtering and verified backend route for MinVariance, MaxSharpe, and RiskParity.
- Added missing `risk_parity` expected return and Sharpe response metrics.
- Completed TaxScreen granular 80D controls and dependency/deduction consistency.

## Files Modified
- `README.md`
- `server/package.json`
- `server/.env.example`
- `server/services/portfolioEngine.js`
- `reactapp/nginx.conf`
- `reactapp/src/components/RebalancerScreen.jsx`
- `reactapp/src/components/TaxScreen.jsx`
- `ml-service/explainer.py`
- `ml-service/main.py`
- `ml-service/feature_engineering.py`
- `ml-service/backtester.py`
- `ml-service/requirements.txt`
- `server/test/*.test.js`
- `ml-service/tests/test_ml_validation.py`
- Pre-existing continuation modifications reviewed but not reverted: `reactapp/src/services/api.js`, `reactapp/src/components/GoalTracker.jsx`.

## Verification Evidence
- `npm test` in `server`: 14 tests passed, 0 failed.
- `npm run lint` in `reactapp`: passed with no warnings.
- `npm run build` in `reactapp`: passed; Vite reported only existing chunk-size warning.
- `node --check` for tracked server JS files: passed for 38 files.
- `python -X pycache_prefix=scratch/pycache -m py_compile` for tracked ML Python plus new ML test: passed for 7 files.
- `python -m pytest` in `ml-service`: 2 tests passed, 0 failed.
- `git diff --check`: passed; Windows line-ending warnings only.
- README stale-claim scan no longer finds AES-256-GCM claim, `/api/auth/signup`, `/api/portfolio/optimal`, or Jest test claim.

## Remaining Issues
- No additional verified, locally fixable defects found in the audited scope after the current validation pass.
- Live full-stack startup against real MongoDB, Redis, external LLM keys, and persisted ML model serving was not executed because those external services/secrets are not configured in this workspace. Route behavior was covered with focused local tests where possible.

## Progress Percentage
- 100%

## Next Steps
- Re-run the same verification commands after any future edits.
- For deployment acceptance, run a live environment smoke test with real MongoDB, Redis, ML service model files, and LLM keys configured.

## Strict Repair Loop Update - 2026-07-02 01:02:02 +05:30

Progress percentage: 9% (1/11 mandated checklist items verified)

### Bugs fixed
- Item 1: Unified LLM fallback order across advisory paths. server/services/geminiService.js#getGoalAdvisory, generateAdvisory, and server/services/geminiChatService.js#processChat now use Gemini primary, Groq secondary, deterministic/static fallback last.
- Renamed misleading chatWithGemini export to getGoalAdvisory and updated server/routes/goals.js import/call site.

### Verification evidence
- 
ode --check server\\services\\geminiService.js passed.
- 
ode --check server\\routes\\goals.js passed.
- g -n "chatWithGemini|generateAdvisory|processChat|getGoalAdvisory" server shows no remaining chatWithGemini references and expected imports/call sites only.
- 
pm test in server/ passed: 14 tests, 14 pass, 0 fail.

### Files modified
- server/services/geminiService.js
- server/routes/goals.js

### Remaining issues
- Items 2-11 from the latest strict repair checklist remain in progress.

### Next steps
- Remove dead ML /predict and /backtest endpoints plus exclusive backtester code, then verify with grep and Python compilation/tests.

## Strict Repair Loop Update - 2026-07-02 01:03:54 +05:30

Progress percentage: 18% (2/11 mandated checklist items verified)

### Bugs fixed
- Item 2: Removed unreachable ML POST /predict and GET /backtest/{instrument_type} endpoints instead of adding new product surface.
- Deleted ml-service/backtester.py, which exclusively served the removed backtest endpoint.
- Kept POST /predict/enriched, the route actually called by server/services/mlClient.js.

### Verification evidence
- g -n '/predict"|/backtest|run_backtest|BacktestResult|INSTRUMENT_MARKET_SENSITIVITY' ml-service server reactapp\\src returned no matches.
- python -X pycache_prefix=.\\tmp_pycache -m py_compile ml-service\\main.py ml-service\\schemas.py ml-service\\feature_engineering.py ml-service\\explainer.py ml-service\\model\\train.py passed.
- python -m pytest in ml-service/ passed: 2 tests, 2 pass, 0 fail.

### Files modified
- ml-service/main.py
- ml-service/backtester.py removed

### Remaining issues
- Items 3-11 from the latest strict repair checklist remain in progress.

### Next steps
- Surface backend recommendation fallback failures in the UI and replace duplicate instrument-type maps with a shared source of truth.

## Strict Repair Loop Update - 2026-07-02 01:17:37 +05:30

Progress percentage: 32% (items 1, 2, and 4 verified; item 3 fixed with render proof queued for item 6)

### Bugs fixed
- Item 3 code fix: Backend recommendation/profile failures now set ackendFallback, pass a visible fallback notice into RecommendationDashboard, and mark rendered local recommendations as _source: 'local_inactive' while in fallback state.
- Item 4: Replaced duplicated frontend instrument-type literal maps with eactapp/src/utils/instrumentTypeMap.js as the single source of truth.
- Added dev-only missing backend-type warning via ssertKnownBackendInstrumentTypes.

### Verification evidence
- g -n "BACKEND_TO_LOCAL_MAP|LOCAL_TO_BACKEND_MAP" reactapp\\src -g "*.jsx" returned no JSX literal map references.
- 
pm run build in eactapp/ passed: Vite transformed 2940 modules and built successfully.

### Files modified
- eactapp/src/App.jsx
- eactapp/src/RecommendationDashboard.jsx
- eactapp/src/components/RebalancerScreen.jsx
- eactapp/src/utils/instrumentTypeMap.js

### Remaining issues
- Item 3 still needs executable component proof when Vitest is added under item 6.
- Items 5-11 remain in progress.

### Next steps
- Run BOM/mojibake detection across tracked files, clean affected text files, and prove both detectors return empty output.
