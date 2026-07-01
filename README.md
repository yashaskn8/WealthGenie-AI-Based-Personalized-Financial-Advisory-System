<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--learn-1.5-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" />
  <img src="https://img.shields.io/badge/SHAP-0.46-FF6F00?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
</p>

<h1 align="center">WealthGenie: AI-Based Personalized Financial
Advisory System
</h1>
<h3 align="center">AI-Powered Personalized Financial Advisory System</h3>

<p align="center">
  <strong>A research-grade, three-tier robo-advisory platform integrating Quasi-Monte Carlo simulation, explainable ML (TreeSHAP), progressive tax optimization under Indian Finance Act 2025, and LLM-powered conversational advisory — with an accompanying IEEE-format research paper.</strong>
</p>

<p align="center">
  <a href="#-architecture">Architecture</a> â€¢
  <a href="#-key-features">Features</a> â€¢
  <a href="#-computational-engines">Engines</a> â€¢
  <a href="#-quick-start">Quick Start</a> â€¢
  <a href="#-api-reference">API Reference</a> â€¢
  <a href="#-research-paper">Research</a>
</p>

---

## ðŸ“‹ Table of Contents

- [About the Project](#-about-the-project)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Computational Engines](#-computational-engines)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [ML Pipeline & Explainability](#-ml-pipeline--explainability)
- [Security & Hardening](#-security--hardening)
- [Testing](#-testing)
- [Performance Benchmarks](#-performance-benchmarks)
- [Research Paper](#-research-paper)
- [Financial Glossary](#-financial-glossary)
- [Author](#-author)
- [License](#-license)

---

## ðŸŽ¯ About the Project

Indian retail investors face a multi-objective financial planning challenge that spans stochastic wealth projection, heterogeneous capital-gains taxation, and regulatory rebate discontinuities. Existing robo-advisory platforms address these concerns in isolation â€” offering either deterministic growth calculators that ignore sequence-of-returns risk, or opaque recommendation engines that provide no decision rationale.

**WealthGenie** is a modular, three-tier platform that unifies **four domain-specific computational engines** within a single advisory workflow:

| Engine | Problem Solved |
|:---|:---|
| **Quasi-Monte Carlo Simulator** | Replaces deterministic CAGR projections with probabilistic wealth bands (Pâ‚â‚€, Pâ‚…â‚€, Pâ‚‰â‚€) that capture sequence-of-returns risk |
| **Hybrid XIRR Solver** | Computes exact annualized returns for irregular SIP cash-flow schedules with guaranteed convergence |
| **Portfolio Optimizer** | Constructs optimal allocations via MinVariance, MaxSharpe, and Risk Parity strategies with simplex-projected gradient descent |
| **Progressive Tax Engine** | Precisely models Section 87A rebate cliffs, surcharge marginal relief, and 7-slab progressive taxation under Finance Act 2025 |

All recommendations are explained via **TreeSHAP** feature attributions, and a dual-LLM conversational interface (**Gemini 2.0 â†’ Groq Llama 3.3** failover) provides natural-language advisory grounded in validated computational outputs.

> **ðŸ“„ This project is accompanied by a full IEEE-format research paper** validating the mathematical models, variance reduction techniques, and system architecture. See the [Research Paper](#-research-paper) section.

---

## ðŸ— Architecture

WealthGenie operates on a **decoupled three-tier service-oriented architecture** communicating over stateless REST APIs:

<p align="center">
  <img src="wealthgenie_architecture.png" alt="WealthGenie Architecture Diagram" width="900" />
</p>

### Data Flow (9-Stage Pipeline)

<p align="center">
  <img src="wealthgenie_pipeline.png" alt="WealthGenie 9-Stage Data Flow Pipeline" width="900" />
</p>

---

## âœ¨ Key Features

### ðŸ”® Stochastic Wealth Projection
- **Quasi-Monte Carlo simulation** using Halton low-discrepancy sequences replaces deterministic CAGR projections
- **Antithetic variates** and **multiplicative control variates** achieve **96%+ variance reduction** vs naive Monte Carlo
- Renders probabilistic wealth bands (**Pâ‚â‚€, Pâ‚…â‚€, Pâ‚‰â‚€**) capturing sequence-of-returns risk for SIP investors
- Sub-100ms response times via Halton's $O(N^{-1}(\ln N)^d)$ convergence rate

### ðŸ“Š Portfolio Optimization (3 Strategies)
- **Minimum Variance** â€” Minimizes $w^T \Sigma w$ for lowest-risk allocation
- **Maximum Sharpe** â€” Maximizes risk-adjusted excess return $(w^T\mu - R_f) / \sqrt{w^T\Sigma w}$
- **Equal Risk Contribution (Risk Parity)** â€” Equalizes marginal risk contributions across all assets
- All solvers use **simplex-projected gradient descent** enforcing fully-invested and long-only constraints

### ðŸ§  Explainable AI (XAI)
- **Random Forest** ensemble classifier (200 trees) maps investor profiles to recommended primary financial instruments (e.g., Equity Mutual Funds, ETFs, ELSS, Fixed Deposits, Gold, or RBI Bonds)
- **TreeSHAP** computes exact Shapley values satisfying efficiency, symmetry, and dummy axioms
- Feature attributions decompose every recommendation into auditable, human-readable explanations
- **100Ã— faster** than KernelSHAP (2.4ms vs 240ms inference time)

### ðŸ’° Indian Tax Engine (Finance Act 2025)
- 7-slab progressive tax computation (0% â†’ 30%)
- **Section 87A rebate cliff** with marginal relief â€” precisely handles the â‚¹12,00,000 threshold discontinuity
- Surcharge tiers (10% / 15% / 25%) with surcharge marginal relief
- 4% Health & Education Cess
- Old vs New regime comparison
- Post-tax capital gains analysis (LTCG / STCG / EEE classification)

### ðŸ’¬ Dual-LLM Advisory Chat
- **Primary**: Google Gemini 2.0 with context injection from validated computational outputs
- **Failover**: Groq Llama 3.3 with deterministic FSM-based prompt reformatting
- Prompt caching via Upstash Redis (30-minute TTL) to reduce LLM token costs
- Context-grounded responses prevent financial hallucination

### ðŸ›¡ï¸ Production-Grade Security
- bcrypt password hashing (cost factor 10)
- JWT RS256 authentication with configurable expiration
- Timing-attack resistant login (100â€“300ms randomized delays)
- Rate limiting (10 auth / 60 API requests per window)
- Helmet.js security headers, NoSQL injection prevention, CSP policies
- Sensitive financial data is protected by authentication, authorization, validation, and database access controls; this codebase does not implement application-level field encryption

### ðŸ“± Premium UI/UX
- Dark-themed glassmorphic dashboard with **Framer Motion** micro-animations
- 3D tilt cards, animated background orbs, staggered reveal animations
- 15+ interactive screens: Dashboard, Tax Optimizer, Goal Planner, Rebalancer, Health Score, Deep Dive, Comparison Table, SIP Step-Up Planner, Post-Tax Analysis, and more
- PDF export via html2canvas + jsPDF
- SEBI disclaimer compliance
- Custom financial **Jargon Tooltips** for investor education

---

## âš™ï¸ Computational Engines

### 1. Quasi-Monte Carlo Simulator (`monteCarloEngine.js`)

Models wealth growth via **Geometric Brownian Motion** with monthly SIP contributions:

$$S(t + \Delta t) = \left(S(t) + P_m\right) \exp\left[\left(\mu - \frac{\sigma^2}{2}\right)\Delta t + \sigma\sqrt{\Delta t}\, Z_t\right]$$

**Variance Reduction Pipeline:**
| Technique | Method | Effect |
|:---|:---|:---|
| **QMC (Halton)** | Low-discrepancy radical-inverse sequences replace pseudo-random numbers | Convergence: $O(N^{-1}(\ln N)^d)$ vs $O(N^{-1/2})$ |
| **Antithetic Variates** | For each shock $\mathbf{Z}$, simulate mirror path $-\mathbf{Z}$ | Exploits negative correlation to reduce variance |
| **Multiplicative CV** | Scale by $\lambda = FV_{\text{det}} / \bar{S}_{\text{raw}}$ using analytical annuity-due | Eliminates Eulerâ€“Maruyama discretization drift |

**Result:** Combined **96%+ variance reduction** at 10,000-path budget with 8ms latency (5.25Ã— faster than naive MC).

### 2. Hybrid XIRR Solver (`xirrCalculator.js`)

Solves for the annualized discount rate $r$ satisfying:

$$f(r) = \sum_{i=0}^{M} C_i (1+r)^{-d_i} = 0$$

**Three-Phase Algorithm:**
1. **Interval Bracketing** â€” Scans 400 points in $[-0.99, 50.0]$ to find first sign change
2. **Bisection** â€” Up to 100 iterations to narrow bracket below $10^{-10}$
3. **Newton-Raphson + Brent Fallback** â€” Quadratic convergence with guaranteed Brent's method fallback when derivatives approach zero

**Result:** 100% convergence across all tested cash-flow patterns (including pathological alternating-sign series).

### 3. Portfolio Optimizer (`portfolioEngine.js`)

Three strategies on a 4-asset Indian universe (Equity MF, FD, Gold, G-Sec):

| Strategy | Objective | Key Result |
|:---|:---|:---|
| **MinVariance** | Minimize $\frac{1}{2} w^T \Sigma w$ | 0.7% portfolio volatility |
| **MaxSharpe** | Maximize $(w^T\mu - R_f) / \sigma_p$ | Sharpe ratio: 2.98 |
| **Risk Parity (ERC)** | Equalize $RC_i = w_i (\Sigma w)_i / \sigma_p$ | Balanced risk contributions |

Constraints enforced at every gradient step via **Euclidean projection onto the probability simplex** (Duchi et al., 2008).

### 4. Progressive Tax Engine (`taxEngine.js`)

Implements the complete New Tax Regime (Finance Act 2025):

| Taxable Income Slab | Rate |
|:---|:---|
| â‚¹0 â€“ â‚¹4,00,000 | 0% |
| â‚¹4,00,001 â€“ â‚¹8,00,000 | 5% |
| â‚¹8,00,001 â€“ â‚¹12,00,000 | 10% |
| â‚¹12,00,001 â€“ â‚¹16,00,000 | 15% |
| â‚¹16,00,001 â€“ â‚¹20,00,000 | 20% |
| â‚¹20,00,001 â€“ â‚¹24,00,000 | 25% |
| Above â‚¹24,00,000 | 30% |

**Rebate cliff handling** â€” Section 87A provides full tax relief for taxable income â‰¤ â‚¹12,00,000. For incomes marginally above, **marginal relief** caps the tax to the excess:

$$T_{\text{base}} = \begin{cases} 0, & I_{\text{tax}} \le 12{,}00{,}000 \\ \min(T_{\text{slab}},\, I_{\text{tax}} - 12{,}00{,}000), & I_{\text{tax}} > 12{,}00{,}000 \end{cases}$$

### 5. Risk Profiler (`riskProfiler.js`)

Composite 3-factor scoring model combining:
- Subjective risk preference (user-stated, 1â€“10 scale via 10-question quiz)
- Age-based risk capacity (younger â†’ higher risk budget)
- Investment horizon (years to retirement at age 60)

---

## ðŸ› ï¸ Technology Stack

### Frontend
| Technology | Version | Purpose |
|:---|:---|:---|
| React | 19.2 | Component-based SPA with Context API state management |
| Vite | 8.0 | Sub-second HMR, optimized production builds |
| React Router | 7.14 | Client-side routing with lazy-loaded components |
| Framer Motion | 12.38 | Spring-physics animations, 3D tilt cards, staggered reveals |
| Recharts | 3.8 | Data visualization (pie charts, projection bands) |
| Lucide React | 1.8 | Consistent, tree-shakeable icon system |
| jsPDF + html2canvas | Latest | Client-side PDF report generation |

### Backend
| Technology | Version | Purpose |
|:---|:---|:---|
| Node.js / Express | 4.21 | REST API server, middleware orchestration |
| Mongoose | 8.8 | MongoDB ODM with schema validation |
| JWT (jsonwebtoken) | 9.0 | Stateless authentication with RS256 signing |
| bcryptjs | 2.4 | Adaptive password hashing (cost factor 10) |
| Helmet | 8.0 | HTTP security headers (CSP, HSTS, X-Frame) |
| express-rate-limit | 7.5 | IP-based rate limiting with exponential backoff |
| express-mongo-sanitize | 2.2 | NoSQL injection prevention |
| Redis | 4.7 | Upstash-backed prompt caching, rate limit storage |
| Joi | 18.1 | Request payload validation schemas |

### ML Microservice
| Technology | Version | Purpose |
|:---|:---|:---|
| FastAPI | 0.115 | High-performance async Python API framework |
| Scikit-learn | 1.5.2 | Random Forest ensemble classifier (200 trees) |
| SHAP | 0.46 | TreeSHAP exact Shapley value computation |
| Pydantic | 2.9 | Request/response validation with type enforcement |
| NumPy / Pandas | 1.26 / 2.2 | Feature engineering and numerical operations |
| Joblib | 1.4 | Model serialization / deserialization |
| Uvicorn | 0.30 | ASGI server with HTTP/2 support |

### Data Layer
| Technology | Purpose |
|:---|:---|
| MongoDB 7 | Primary document store (6 collections: User, FinancialProfile, Goal, Instrument, Recommendation, ConversationHistory) |
| Upstash Redis | LLM prompt caching (30m TTL), feature vector caching, rate limit counters |
| Mongoose post-save hooks | Event-driven cache invalidation on profile edits |

---

## ðŸ“ Project Structure

```
WEALTHGENIEFV/
â”‚
â”œâ”€â”€ reactapp/                          # â”€â”€ PRESENTATION TIER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚   â”œâ”€â”€ index.html                     # SPA entry point
â”‚   â”œâ”€â”€ vite.config.js                 # Vite 8 build configuration
â”‚   â”œâ”€â”€ nginx.conf                     # Production reverse proxy config
â”‚   â”œâ”€â”€ package.json                   # Frontend dependencies (React 19, Framer Motion)
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ main.jsx                   # React DOM mounting
â”‚       â”œâ”€â”€ App.jsx                    # Root component: Auth + Profile + Dashboard shell
â”‚       â”œâ”€â”€ App.css                    # Global dark-theme styles
â”‚       â”œâ”€â”€ index.css                  # CSS variables and design tokens
â”‚       â”œâ”€â”€ LandingPage.jsx            # Animated hero with 3D tilt feature cards
â”‚       â”œâ”€â”€ LandingPage.css            # Landing page glassmorphism styles
â”‚       â”œâ”€â”€ RecommendationDashboard.jsx # Main dashboard with ML recommendations
â”‚       â”œâ”€â”€ PostTaxAnalysis.jsx        # Post-tax return analysis screen
â”‚       â”œâ”€â”€ HealthScoreScreen.jsx      # Financial health score calculator
â”‚       â”œâ”€â”€ InsightsScreen.jsx         # AI-generated financial insights
â”‚       â”œâ”€â”€ HelpTourScreen.jsx         # Interactive platform walkthrough
â”‚       â”œâ”€â”€ ProfileEditor.jsx          # Inline profile editing
â”‚       â”œâ”€â”€ RiskQuizModal.jsx          # 10-question risk tolerance quiz
â”‚       â”œâ”€â”€ ComparisonTableModal.jsx   # Side-by-side investment comparison
â”‚       â”œâ”€â”€ recommendationEngine.js    # Client-side recommendation logic
â”‚       â”œâ”€â”€ investmentDatabase.js      # 14-instrument database (MF, ETF, FD, Gold, etc.)
â”‚       â”œâ”€â”€ whereToInvest.js           # Investment eligibility engine
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ Sidebar.jsx            # Navigation sidebar with icon menu
â”‚       â”‚   â”œâ”€â”€ GenieChat.jsx          # LLM advisory chatbot (FAB + modal)
â”‚       â”‚   â”œâ”€â”€ GoalPlanner.jsx        # Goal-based SIP planning
â”‚       â”‚   â”œâ”€â”€ GoalTracker.jsx        # Goal progress tracking
â”‚       â”‚   â”œâ”€â”€ TaxScreen.jsx          # Old vs New regime tax comparison
â”‚       â”‚   â”œâ”€â”€ StepUpPlanner.jsx      # Annual SIP step-up calculator
â”‚       â”‚   â”œâ”€â”€ RebalancerScreen.jsx   # Portfolio rebalancing interface
â”‚       â”‚   â”œâ”€â”€ AllocationPlanner.jsx  # Asset allocation optimizer UI
â”‚       â”‚   â”œâ”€â”€ DeepDiveModal.jsx      # Investment deep-dive analysis (94KB)
â”‚       â”‚   â”œâ”€â”€ ExplainabilityPanel.jsx # SHAP attribution visualization
â”‚       â”‚   â”œâ”€â”€ ProjectionBand.jsx     # QMC trajectory rendering (SVG)
â”‚       â”‚   â”œâ”€â”€ JargonTooltip.jsx      # Financial term tooltips
â”‚       â”‚   â”œâ”€â”€ DataFreshnessBar.jsx   # Market data freshness indicator
â”‚       â”‚   â”œâ”€â”€ ErrorBoundary.jsx      # React error boundary
â”‚       â”‚   â””â”€â”€ SebiDisclaimer.jsx     # SEBI regulatory disclaimer
â”‚       â”œâ”€â”€ context/
â”‚       â”‚   â””â”€â”€ UserContext.jsx        # Global user state via React Context API
â”‚       â”œâ”€â”€ services/
â”‚       â”‚   â””â”€â”€ api.js                 # Centralized API client (auth, profile, recommendations)
â”‚       â””â”€â”€ utils/
â”‚           â”œâ”€â”€ taxCalculator.js       # Client-side tax computation
â”‚           â”œâ”€â”€ sipCalculator.js       # SIP future value calculator
â”‚           â”œâ”€â”€ postTaxEngine.js       # Post-tax return engine
â”‚           â”œâ”€â”€ portfolioValidation.js # Weight constraint validation
â”‚           â”œâ”€â”€ indianNumberFormat.js  # â‚¹ Lakh/Crore formatting
â”‚           â”œâ”€â”€ confidenceLabels.js    # ML confidence score labels
â”‚           â””â”€â”€ instrumentExplainers.js # Per-instrument plain-English explanations
â”‚
â”œâ”€â”€ server/                            # â”€â”€ APPLICATION TIER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚   â”œâ”€â”€ server.js                      # Express app: middleware chain, routes, graceful shutdown
â”‚   â”œâ”€â”€ package.json                   # Backend dependencies (Express, Mongoose, JWT, Redis)
â”‚   â”œâ”€â”€ .env.example                   # Documented environment variable template
â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”œâ”€â”€ db.js                      # MongoDB connection with retry logic
â”‚   â”‚   â”œâ”€â”€ redis.js                   # Upstash Redis client configuration
â”‚   â”‚   â””â”€â”€ seedInstruments.js         # Database seeder for 14 financial instruments
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ authMiddleware.js          # JWT verification and route protection
â”‚   â”‚   â””â”€â”€ errorHandler.js            # Centralized error handling with stack traces
â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”œâ”€â”€ User.js                    # User schema (bcrypt-hashed credentials)
â”‚   â”‚   â”œâ”€â”€ FinancialProfile.js        # Demographics & monetary properties
â”‚   â”‚   â”œâ”€â”€ Goal.js                    # Inflation targets & SIP parameters
â”‚   â”‚   â”œâ”€â”€ Instrument.js             # Investment instrument definitions
â”‚   â”‚   â”œâ”€â”€ Recommendation.js         # ML-generated recommendations
â”‚   â”‚   â””â”€â”€ ConversationHistory.js    # LLM chat threads & failover metadata
â”‚   â”œâ”€â”€ routes/
│   │   ├── auth.js                    # POST /register, /login (JWT issuance)
â”‚   â”‚   â”œâ”€â”€ profile.js                 # CRUD for financial profiles
â”‚   â”‚   â”œâ”€â”€ recommend.js               # ML recommendation orchestration
â”‚   â”‚   â”œâ”€â”€ goals.js                   # Goal CRUD with projection integration
â”‚   â”‚   â”œâ”€â”€ montecarlo.js              # QMC simulation endpoint
â”‚   â”‚   â”œâ”€â”€ portfolio.js               # Portfolio optimization endpoint
â”‚   â”‚   â”œâ”€â”€ tax.js                     # Tax computation & regime comparison
â”‚   â”‚   â”œâ”€â”€ projection.js              # Deterministic wealth projections
â”‚   â”‚   â”œâ”€â”€ chatRoutes.js              # LLM chat with failover FSM
â”‚   â”‚   â”œâ”€â”€ instruments.js             # Instrument catalog queries
â”‚   â”‚   â””â”€â”€ market.js                  # Live market data endpoints
â”‚   â”œâ”€â”€ services/                      # â”€â”€ COMPUTATIONAL ENGINES â”€â”€
â”‚   â”‚   â”œâ”€â”€ taxEngine.js               # 7-slab progressive tax + Sec 87A + surcharge
â”‚   â”‚   â”œâ”€â”€ monteCarloEngine.js        # QMC + Halton + Antithetic + Control Variates
â”‚   â”‚   â”œâ”€â”€ xirrCalculator.js          # Hybrid Newton-Raphson / Brent XIRR solver
â”‚   â”‚   â”œâ”€â”€ portfolioEngine.js         # 3-strategy simplex-projected optimizer
â”‚   â”‚   â”œâ”€â”€ postTaxCalculator.js       # Post-tax return computations (LTCG/STCG/EEE)
â”‚   â”‚   â”œâ”€â”€ projectionEngine.js        # Real + nominal projection (Fisher equation)
â”‚   â”‚   â”œâ”€â”€ riskProfiler.js            # 3-factor composite risk scoring
â”‚   â”‚   â”œâ”€â”€ geminiChatService.js       # Gemini 2.0 LLM integration
â”‚   â”‚   â”œâ”€â”€ geminiService.js           # Gemini API wrapper
â”‚   â”‚   â”œâ”€â”€ genieChatSystemPrompt.js   # Context-injection system prompt builder
â”‚   â”‚   â”œâ”€â”€ marketDataService.js       # Live market data fetcher
â”‚   â”‚   â”œâ”€â”€ mlClient.js               # FastAPI microservice HTTP client
â”‚   â”‚   â””â”€â”€ instrumentConstants.js    # Asset class return/volatility parameters
â”‚   â”œâ”€â”€ validation/
â”‚   â”‚   â””â”€â”€ schemas.js                 # Joi validation schemas for all endpoints
â”‚   â””â”€â”€ jobs/
â”‚       â””â”€â”€ marketDataRefresh.js       # Background cron job for market data refresh
â”‚
â”œâ”€â”€ ml-service/                        # â”€â”€ ML TIER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚   â”œâ”€â”€ main.py                        # FastAPI app: /predict, /predict/enriched, /backtest
â”‚   â”œâ”€â”€ schemas.py                     # Pydantic v2 request/response models
â”‚   â”œâ”€â”€ explainer.py                   # TreeSHAP wrapper (exact Shapley values)
â”‚   â”œâ”€â”€ feature_engineering.py         # Derived features: savings_rate, risk_age_score, etc.
â”‚   â”œâ”€â”€ backtester.py                  # Historical scenario analysis engine
â”‚   â”œâ”€â”€ requirements.txt              # Python dependencies (FastAPI, scikit-learn, SHAP)
â”‚   â”œâ”€â”€ model/
â”‚   â”‚   â”œâ”€â”€ train.py                   # Model training script (5K simulated profiles)
â”‚   â”‚   â”œâ”€â”€ model.pkl                  # Serialized Random Forest classifier (~54MB)
â”‚   â”‚   â”œâ”€â”€ decision_tree.pkl          # Serialized Decision Tree (secondary model)
│   │   └── label_encoder.pkl          # Label encoder for recommended instrument classes
â”‚   â””â”€â”€ data/
â”‚       â””â”€â”€ investment_profiles.csv    # Simulated training dataset (gitignored)
â”‚
â””â”€â”€ .gitignore                         # Comprehensive ignore rules
```

---

## ðŸš€ Quick Start

### Prerequisites

| Requirement | Version | Download |
|:---|:---|:---|
| Node.js | â‰¥ 18.x | [nodejs.org](https://nodejs.org/) |
| Python | â‰¥ 3.10 | [python.org](https://www.python.org/) |
| MongoDB | 7.x (or Atlas) | [MongoDB Atlas (Free)](https://www.mongodb.com/cloud/atlas) |
| Redis | Any (or Upstash) | [Upstash (Free)](https://console.upstash.com/) |

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/yashaskn8/WealthGenie.git
cd WealthGenie
```

**2. Backend Setup**
```bash
cd server
copy .env.example .env       # Configure MongoDB URI, JWT secret, API keys
npm install
```

**3. ML Microservice Setup**
```bash
cd ml-service
python -m venv .venv
.\.venv\Scripts\activate      # Windows
pip install -r requirements.txt
python model/train.py          # Train the model (first time only)
```

**4. Frontend Setup**
```bash
cd reactapp
npm install
```

### Launch (3 Terminals)

```bash
# Terminal 1 â€” ML Service (port 8000)
cd ml-service && .\.venv\Scripts\activate && python main.py

# Terminal 2 â€” Express API (port 5000)
cd server && npm run dev

# Terminal 3 â€” React Frontend (port 5173)
cd reactapp && npm run dev
```

Open **http://localhost:5173** â†’ Register â†’ Build Profile â†’ Explore Dashboard ðŸš€

---

## ðŸ”’ Environment Variables

Create `server/.env` from the provided template:

```bash
copy server/.env.example server/.env
```

| Variable | Required | Description | Get it from |
|:---|:---|:---|:---|
| `MONGODB_URI` | âœ… | MongoDB connection string | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |
| `JWT_SECRET` | âœ… | 64-char hex key for session signing | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | âŒ | Express server port (default: `5000`) | â€” |
| `NODE_ENV` | âŒ | `development` or `production` | â€” |
| `REDIS_URL` | âŒ | Redis connection URL | [Upstash](https://console.upstash.com/) |
| `ML_SERVICE_URL` | âŒ | FastAPI URL (default: `http://localhost:8000`) | â€” |
| `GEMINI_API_KEY` | âŒ | Google Gemini API key for chat | [Google AI Studio](https://aistudio.google.com/) |
| `GROQ_API_KEY` | No | Optional Groq API key for Llama chat failover | [Groq Console](https://console.groq.com/) |

---

## ðŸ”Œ API Reference

### Authentication
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/register` | Register new user (bcrypt-hashed credentials) |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |

### Financial Profile
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/profile/build` | Build and save the authenticated user's financial profile |

### Recommendations & ML
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/recommend` | Generate ML-powered recommendations with SHAP attributions |
| `POST` | `/api/recommend/weights` | Update recommendation allocation weights |

### Computational Engines
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/montecarlo/montecarlo` | Run QMC simulation and return percentile trajectories |
| `POST` | `/api/portfolio/optimise` | Compute optimal weights (MinVariance / MaxSharpe / RiskParity) |
| `POST` | `/api/portfolio/rebalance` | Compute portfolio drift and rebalance actions |
| `GET` | `/api/tax/compute` | Calculate progressive tax with Sec 87A marginal relief |
| `GET` | `/api/tax/compare` | Compare Old vs New tax regime |
| `POST` | `/api/projection` | Deterministic projection with Fisher inflation adjustment |
| `POST` | `/api/projection/xirr` | Compute XIRR for irregular cash flows |

### Goals & Planning
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/goals/create` | Create an investment goal with SIP parameters |
| `GET` | `/api/goals` | List all goals with progress tracking |
| `PATCH` | `/api/goals/:goalId` | Update goal parameters |
| `PATCH` | `/api/goals/:goalId/refresh-advice` | Regenerate goal advice |
| `DELETE` | `/api/goals/:goalId` | Delete a goal |

### Advisory Chat
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/chat/message` | Send message to Gemini 2.0 (failover: Groq Llama 3.3) |
| `GET` | `/api/chat/history` | List chat sessions and messages |
| `DELETE` | `/api/chat/session/:sessionId` | Delete a chat session |

### Market Data
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/market/rates` | Fetch current live market rates |
| `GET` | `/api/market/params` | Fetch instrument parameters with live overrides |
| `POST` | `/api/market/refresh` | Refresh live market data |
| `GET` | `/api/instruments` | List all seeded financial instruments |

### Health Check
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | System health: uptime, memory, engine versions, features |

### ML Microservice (Port 8000)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/predict` | Standard Random Forest prediction + SHAP explanation |
| `POST` | `/predict/enriched` | Enriched prediction with derived features (savings_rate, retirement_years) |
| `GET` | `/backtest/{type}` | Historical scenario analysis for an instrument type |
| `GET` | `/health` | ML model status and explainer availability |

---

## ðŸ¤– ML Pipeline & Explainability

### Training Pipeline
```
Simulated Data (5K profiles)   ->  4-feature model input  ->  Random Forest (200 trees)
  age, income, savings, risk       exact training order     5-fold cross-validation
                                   preserved for inference  accuracy: >92%

Derived features such as savings_rate, income_bracket, retirement_years, and risk_age_score are returned by `/predict/enriched` for context; the current trained model still consumes the original four-feature array.
```

### Risk Categories
| Class | Profile | Typical Allocation |
|:---|:---|:---|
| **Conservative** | Age 50+, low risk tolerance | 80% Debt, 20% Hybrid |
| **Conservative-Moderate** | Moderate income, medium horizon | 60% Debt, 30% Equity, 10% Gold |
| **Moderate** | Age 30-45, balanced goals | 50% Equity, 30% Debt, 20% Gold |
| **Moderate-Aggressive** | High income, long horizon | 70% Equity, 20% Debt, 10% Gold |
| **Aggressive** | Age < 30, high risk tolerance | 85% Equity, 10% Gold, 5% Debt |

### TreeSHAP Explainability

Every prediction is decomposed into feature-level attributions:

```
"Your recommendation is MODERATE-AGGRESSIVE because:
 â€¢ Your age (28) contributed +0.23 towards aggressive allocation
 â€¢ Your annual income (â‚¹12L) contributed +0.18 towards aggressive
 â€¢ Your savings rate (25%) contributed +0.11 towards moderate
 â€¢ Your risk score (7/10) contributed +0.31 towards aggressive"
```

SHAP values satisfy the **efficiency axiom**: $\sum_{i} \phi_i(x) = f(x) - E[f(x)]$, ensuring every attribution is mathematically consistent and auditable.

---

## ðŸ›¡ï¸ Security & Hardening

| Layer | Implementation |
|:---|:---|
| **Password Storage** | bcrypt with cost factor 10 (184-bit salted hashes) |
| **Session Management** | Stateless JWT with RS256 signing, configurable expiration |
| **Timing Attack Prevention** | 100â€“300ms randomized delays on login endpoint |
| **Rate Limiting** | 10 auth requests / 15min, 60 API requests / min per IP |
| **HTTP Headers** | Helmet.js (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) |
| **NoSQL Injection** | express-mongo-sanitize strips `$` and `.` operators |
| **Input Validation** | Joi schemas (server) + Pydantic v2 (ML service) |
| **Database Protection** | Password hashing, JWT authorization, request validation, and database access controls; no application-level field encryption is implemented |
| **Request Tracing** | UUID-based `x-request-id` headers with slow-request logging (>3s) |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers close HTTP, MongoDB, and Redis connections |

---

## ðŸ§ª Testing

### Backend (Node.js test runner)
```bash
cd server
npm test
```

**Test Coverage:**
| Module | Tests |
|:---|:---|
| Tax Engine | Slab computation, Sec 87A rebate cliff, granular Section 80D caps |
| Monte Carlo Engine | Percentile ordering, goal probability bounds, reverse SIP stability |
| XIRR Solver | Newton/Brent convergence, SIP-style cash flows, invalid cash-flow signs |
| Portfolio Engine | MinVariance, MaxSharpe, RiskParity weights and metrics |
| Portfolio Route | Authenticated `/api/portfolio/optimise` requests for all frontend strategies |
| Backend Middleware | JWT acceptance/rejection and express-rate-limit blocking behavior |

### ML Microservice (Pytest)
```bash
cd ml-service
python -m pytest
```

**Test Coverage:**
| Module | Tests |
|:---|:---|
| Pydantic Validation | Rejects monthly savings greater than monthly income |
| Feature Order | Confirms inference array shape/order matches `model/train.py` |

---

## ðŸ“ˆ Performance Benchmarks

Validated against standard baselines (results from the accompanying research paper):

| Engine | Metric | Baseline | WealthGenie | Improvement |
|:---|:---|:---|:---|:---|
| QMC Simulator | Standard Error | 1.50 | **0.02** | 75Ã— reduction |
| QMC Simulator | Latency (10K paths) | 42ms | **8ms** | 5.25Ã— faster |
| XIRR Solver | Convergence Rate | 82% | **100%** | Guaranteed convergence |
| XIRR Solver | Avg. Iterations | 14 | **5** | 2.8Ã— fewer iterations |
| Tax Engine | Computation Latency | 1.20ms | **0.08ms** | 15Ã— faster |
| Tax Engine | Sec 87A Handling | Manual | **Exact** | Automated cliff detection |
| ML/XAI | Inference Time | 240ms | **2.4ms** | 100Ã— faster |
| ML/XAI | Attribution Consistency | Approximate | **Exact** | Axiomatic Shapley values |

---

## ðŸ“„ Research Paper

This project is accompanied by an **IEEE-format research paper** that provides:

- Formal mathematical derivations for all computational engines
- Koksmaâ€“Hlawka convergence proofs for the QMC simulator
- Variance reduction analysis with empirical data (96%+ reduction)
- Portfolio optimization results on a 4-asset Indian universe
- Tax engine validation at Section 87A boundary conditions
- Comparative analysis against Groww and Betterment
- Literature survey covering 15 foundational works (Markowitz 1952 â†’ SHAP 2017)

**Author:** Yashas K N

> The paper validates that WealthGenie provides **7 capabilities absent from both Groww and Betterment**, including QMC simulation, Indian tax engine with Sec 87A, TreeSHAP explainability, and LLM advisory chat.

---

## ðŸ“– Financial Glossary

| Term | Full Form | Definition |
|:---|:---|:---|
| **SIP** | Systematic Investment Plan | Fixed monthly investment into mutual funds |
| **XIRR** | Extended Internal Rate of Return | Annualized return for irregular cash-flow schedules |
| **LTCG** | Long-Term Capital Gains | Tax on profits from investments held > 1 year |
| **STCG** | Short-Term Capital Gains | Tax on profits from investments held < 1 year |
| **CAGR** | Compound Annual Growth Rate | Constant annualized growth rate |
| **GBM** | Geometric Brownian Motion | Stochastic model for asset price simulation |
| **QMC** | Quasi-Monte Carlo | Simulation using low-discrepancy sequences for faster convergence |
| **SHAP** | Shapley Additive exPlanations | Game-theoretic ML explainability framework |
| **EEE** | Exempt-Exempt-Exempt | Tax category where investment, growth, and withdrawal are all tax-free |
| **TDS** | Tax Deducted at Source | Tax withheld at the point of income (e.g., FD interest) |
| **NAV** | Net Asset Value | Per-unit market value of a mutual fund |
| **AUM** | Assets Under Management | Total market value of investments managed by a fund |
| **Sharpe Ratio** | â€” | Excess return per unit of risk: $(R_p - R_f) / \sigma_p$ |
| **Sec 87A** | Section 87A, Income Tax Act | Tax rebate for taxable income â‰¤ â‚¹12,00,000 under New Regime |

---

## ðŸ‘¤ Author

| Name | Role | Contact |
|:---|:---|:---|
| **Yashas K N** | Lead Developer & System Architect | yashaskn08@gmail.com |

**Institution:** RNS Institute of Technology, Bengaluru, India

---

## ðŸ“œ License

This project is developed as an academic capstone at RNSIT. All rights reserved by the author.

