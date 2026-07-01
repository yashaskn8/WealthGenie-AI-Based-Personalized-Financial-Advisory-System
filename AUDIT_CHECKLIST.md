# WealthGenieFV Audit Checklist

Generated from `git ls-files` in `C:\Users\prana\OneDrive\Desktop\WEALTHGENIEFV`.

## Global Evidence
- `git ls-files` returned 124 tracked files.
- Fresh full tracked-file read: `{ "trackedFiles": 124, "totalBytes": 7524394, "repoContentSha256": "9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762" }`.
- JavaScript syntax: `node --check` passed for 38 server JS files.
- Backend tests: `npm test` passed 14 of 14 tests.
- Frontend: `npm run lint` passed with no warnings; `npm run build` passed.
- Python: `python -X pycache_prefix=scratch/pycache -m py_compile` passed for 7 ML Python files; `python -m pytest` passed 2 tests.
- Whitespace: `git diff --check` passed; only line-ending warnings remain from Windows checkout behavior.

## Frontend To Backend Route Map
| frontend call | backend route | method match | body/query shape | result |
|---|---|---:|---|---|
| `api.register` | `/api/auth/register` | Y | `{ name, email, password }` | matched |
| `api.login` | `/api/auth/login` | Y | `{ email, password }` | matched |
| `api.buildProfile` | `/api/profile/build` | Y | profile schema fields | matched |
| `api.getRecommendations` | `/api/recommend` | Y | `{ profileId }` | matched |
| `api.updateRecommendationWeights` | `/api/recommend/weights` | Y | `{ profileId, weights }` | matched |
| `api.getInstruments` | `/api/instruments` | Y | query params | matched |
| `api.getProjections` | `/api/projection` | Y | projection schema fields | matched |
| `api.runMonteCarlo` | `/api/montecarlo/montecarlo` | Y | Monte Carlo schema fields | matched |
| `api.createGoal` | `/api/goals/create` | Y | goal schema fields | matched |
| `api.getGoals` | `/api/goals` | Y | none | matched |
| `api.updateGoal` | `/api/goals/:goalId` | Y | patch body | matched |
| `api.deleteGoal` | `/api/goals/:goalId` | Y | none | matched |
| `api.sendChatMessage` | `/api/chat/message` | Y | `{ message, session_id }` | matched |
| `api.getChatHistory` | `/api/chat/history` | Y | query session and limit | matched |
| `api.clearChatSession` | `/api/chat/session/:sessionId` | Y | none | matched |
| `api.computeTax` | `/api/tax/compute` | Y | query income/regime/deductions | matched |
| `api.compareTax` | `/api/tax/compare` | Y | query income/deductions | matched |
| `api.rebalancePortfolio` | `/api/portfolio/rebalance` | Y | rebalance schema fields | matched |
| `api.optimisePortfolio` | `/api/portfolio/optimise` | Y | `{ profileId, assets, strategy }` | matched and route-tested |
| `DataFreshnessBar` fetch | `/api/market/rates`, `/api/market/refresh` | Y | GET none; POST auth header | matched |

## Server Service Usage Map
| exported function/module | import/call sites reviewed | status |
|---|---|---|
| `taxEngine` exports | tax route, profile route, recommend route, tests | verified |
| `monteCarloEngine` exports | montecarlo route, goal projections, tests | verified |
| `xirrCalculator` exports | projection route, tests | verified |
| `portfolioEngine` exports | portfolio route, tests | verified |
| `postTaxCalculator` exports | recommend route, portfolio route | verified |
| `riskProfiler` exports | profile route | verified |
| `mlClient` exports | recommend route | verified |
| `authMiddleware` exports | protected routes, tests | verified |
| `errorHandler` exports | server and routes | verified |

## Tracked File Checklist
| path | reviewed(Y/N) | issue(s) | action | verification evidence |
|---|---:|---|---|---|
| .gitignore | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| README.md | Y | Stale route map, false AES field-encryption claim, false Jest/full test-suite claim, ML training/inference wording mismatch, missing GROQ env documentation. | Corrected docs to actual routes, actual protection model, Node test runner and pytest coverage, four-feature inference order, and Groq failover env. | rg stale-claim scan clean for removed routes/claims; npm test and python -m pytest passed. |
| ml-service/backtester.py | Y | Unused Dict import. | Removed unused import. | python py_compile passed. |
| ml-service/explainer.py | Y | Dead duplicate load_explainer path and unused joblib/os imports. | Removed load_explainer and unused imports; main service consistently instantiates ModelExplainer from preloaded model. | python py_compile passed; python -m pytest passed. |
| ml-service/feature_engineering.py | Y | Unused Optional import; feature-order corruption risk needed executable proof. | Removed unused import; added pytest confirming to_model_array shape/order matches training. | python py_compile passed; pytest test_feature_order_matches_training_pipeline passed. |
| ml-service/main.py | Y | Unused load_explainer, BacktestResult, List imports and inaccurate enriched-prediction docstring. | Removed unused imports and corrected docstring to state derived features are context while four-feature order is preserved. | python py_compile passed; python -m pytest passed. |
| ml-service/model/train.py | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| ml-service/requirements.txt | Y | README documented pytest tests but requirements omitted pytest. | Added pytest dependency. | python -m pytest passed 2 tests. |
| ml-service/schemas.py | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/.gitignore | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/eslint.config.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/index.html | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/nginx.conf | Y | Proxy pointed at Docker Compose hostname server:5000 despite non-Docker deployment model. | Changed proxy target to 127.0.0.1:5000 with non-Docker comment. | Get-Content reactapp/nginx.conf shows proxy_pass http://127.0.0.1:5000. |
| reactapp/package-lock.json | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/package.json | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/public/favicon.svg | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/public/icons.svg | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/App.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/App.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/ComparisonTableModal.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/ComparisonTableModal.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/Dashboard.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/GoalCoverage.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/HealthScoreScreen.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/HealthScoreScreen.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/HelpTourScreen.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/HelpTourScreen.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/InsightsScreen.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/InsightsScreen.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/InvestmentCard.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/LandingPage.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/LandingPage.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/PortfolioChart.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/PostTaxAnalysis.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/ProfileEditor.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/RecommendationDashboard.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/RiskQuizModal.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/assets/chat_genie.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/assets/gen_4k.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/assets/gen_4k_nobull.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/assets/genie.mp4 | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/assets/logo.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/AllocationPlanner.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/AllocationPlanner.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/DataFreshnessBar.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/DeepDiveModal.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/DeepDiveModal.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/ErrorBoundary.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/ExplainabilityPanel.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/GenieChat.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/GenieChat.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/GoalPlanner.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/GoalTracker.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/GoalTracker.jsx | Y | Continuation modification for goal deletion required route-contract verification. | Reviewed DELETE goal call against backend DELETE /api/goals/:goalId. | Route map confirms match; npm run lint and build passed. |
| reactapp/src/components/JargonTooltip.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/JargonTooltip.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/ProjectionBand.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/RebalancerScreen.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/RebalancerScreen.jsx | Y | Optimizer UI could send unsupported local asset IDs such as direct_equity and unmapped sukanya, causing backend 400s; prior wiring needed request-shape hardening. | Added supported backend asset filter, sukanya to SSY mapping, active asset selection, and safe result weight mapping. | npm run lint passed; npm run build passed; server route test proved POST /api/portfolio/optimise for all strategies. |
| reactapp/src/components/SebiDisclaimer.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/Sidebar.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/Sidebar.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/StepUpPlanner.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/StepUpPlanner.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/TaxScreen.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/components/TaxScreen.jsx | Y | Partial 80D state had unused setters, missing rendered controls, missing profile age dependency, and current deductions excluded granular 80D. | Added 80D self/parents controls, parent-senior toggle, dependency fix, and included capped 80D in current deduction calculation. | npm run lint passed with no warnings; npm run build passed. |
| reactapp/src/context/UserContext.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/index.css | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/investmentDatabase.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/main.jsx | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/recommendationEngine.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/services/api.js | Y | Portfolio optimizer frontend API wiring existed from continuation and required verification against backend route. | Reviewed request method/path/body for POST /portfolio/optimise. | Route map confirms frontend request to backend POST /api/portfolio/optimise; npm run build passed. |
| reactapp/src/utils/confidenceLabels.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/indianNumberFormat.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/instrumentExplainers.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/portfolioValidation.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/postTaxEngine.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/sipCalculator.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/utils/taxCalculator.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/src/whereToInvest.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| reactapp/vite.config.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/.env.example | Y | GROQ_API_KEY used by backend failover but absent from template. | Added commented optional GROQ_API_KEY entry. | Get-Content server/.env.example shows GROQ_API_KEY. |
| server/config/db.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/config/redis.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/config/seedInstruments.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/jobs/marketDataRefresh.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/middleware/authMiddleware.js | Y | Auth middleware needed executable JWT accept/reject coverage. | Added focused tests without changing middleware logic. | npm test authMiddleware.test.js passed. |
| server/middleware/errorHandler.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/ConversationHistory.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/FinancialProfile.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/Goal.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/Instrument.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/Recommendation.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/models/User.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/package-lock.json | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/package.json | Y | README/tests required npm test but backend had no test script. | Added test script using Node built-in test runner. | npm test passed 14 of 14 tests. |
| server/routes/auth.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/chatRoutes.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/goals.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/instruments.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/market.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/montecarlo.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/portfolio.js | Y | Optimizer route was previously unreachable from UI and needed runtime proof. | Reviewed route contract and exercised route with mocked profile ownership. | npm test portfolioRoute.test.js passed authenticated POST /api/portfolio/optimise for all strategies. |
| server/routes/profile.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/projection.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/recommend.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/routes/tax.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/server.js | Y | Rate-limit behavior needed executable coverage without starting full DB-backed app. | Added express-rate-limit middleware test using same package behavior. | npm test rateLimitMiddleware.test.js passed. |
| server/services/geminiChatService.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/geminiService.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/genieChatSystemPrompt.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/instrumentConstants.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/marketDataService.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/mlClient.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/monteCarloEngine.js | Y | Monte Carlo engine needed executable percentile/probability/reverse-SIP coverage. | Added focused tests without changing engine logic. | npm test monteCarloEngine.test.js passed. |
| server/services/portfolioEngine.js | Y | risk_parity optimizer returned no expectedReturn or sharpe, causing frontend metrics to render NaN after a successful route call. | Computed expectedReturn and sharpe for risk_parity in dispatcher. | npm test portfolio optimizer and route tests passed for min_variance, max_sharpe, risk_parity. |
| server/services/postTaxCalculator.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/projectionEngine.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/riskProfiler.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| server/services/taxEngine.js | Y | Tax engine needed executable coverage for FY2025-26 rebate cliff and granular 80D caps. | Added focused tests without changing tax logic. | npm test taxEngine.test.js passed. |
| server/services/xirrCalculator.js | Y | XIRR solver needed executable convergence and invalid-input coverage. | Added focused tests without changing solver logic. | npm test xirrCalculator.test.js passed. |
| server/validation/schemas.js | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| wealthgenie_architecture.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |
| wealthgenie_pipeline.png | Y | No file-specific defect found during full read and contract scan. | No code change required. | Fresh full-file read hash 9a921534fb82f45b7856598680e6c2acfa603b20258998ae78319e0fd7200762; 124 tracked files read. |

## New Verification Files
- `server/test/*.test.js`: backend engine, middleware, and portfolio route tests added for verified coverage.
- `ml-service/tests/test_ml_validation.py`: ML validation and feature-order tests added.

| Strict item 1: LLM fallback order | Y | Inconsistent fallback order and misleading chatWithGemini name | Fixed by renaming to getGoalAdvisory and using Gemini -> Groq -> static | node --check touched files; npm test in server passed (14/14); rg shows no chatWithGemini |

| Strict item 2: Dead ML endpoints | Y | Unreachable /predict and /backtest endpoints plus exclusive backtester code | Removed endpoints and backtester module; retained /predict/enriched | rg returned zero removed-pattern matches; py_compile passed; ml-service pytest passed (2/2) |

| Strict item 3: Frontend fallback visibility | Y | Backend recommendation failures failed silently | Added dashboard fallback state, visible banner, and _source: local_inactive tagging | npm run build passed; component render test pending under item 6 |

| Strict item 4: Instrument map drift | Y | Duplicate local/backend map literals in App and RebalancerScreen | Added shared instrumentTypeMap utility and dev-only missing-map assertion | rg over JSX map names clean; npm run build passed |
