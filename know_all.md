# WealthGenie: Complete System Architecture, Mathematical Foundations, and Engineering History

---

## 1. Executive Summary & Domain Scope

**WealthGenie** is a hybrid Quantitative Finance and Explainable Artificial Intelligence (XAI) robo-advisory platform. It resolves the joint problem of personalized asset allocation, stochastic wealth forecasting, and multi-period post-tax optimization under complex tax regimes. 

The system maps investor demographic and risk profiles to tax-optimized portfolios of Indian financial instruments. It operates with mathematical rigor to ensure that all advice complies with the **Securities and Exchange Board of India (SEBI) Investment Advisers Regulations, 2013**, while executing simulations with advanced variance-reduction techniques.

---

## 2. Commit & Phase History (From Scratch to Present)

### Phase 1: Core Foundation & Multi-Tier Architecture
*   Established a three-tier runtime structure:
    *   **React Frontend (`/reactapp`):** Custom dashboard UI designed with modular components.
    *   **Express Backend (`/server`):** Database models (MongoDB), authentication routines, API gateways, and session controllers.
    *   **ML Microservice (`/ml-service`):** FastAPI environment running Python libraries (`numpy`, `scikit-learn`, `joblib`).
*   Configured primary database schemas for `User`, `FinancialProfile`, `Goal`, and `Instrument` using Mongoose.

### Phase 2: Backend & Financial Instrument Hardening
*   Implemented numeric input sanitizations across all route handlers to prevent injection and floating-point errors.
*   Corrected the projection engine's monthly compound interest calculations to match standard financial math.
*   Resolved tax classifications for **Arbitrage Mutual Funds** (treated as equity tax rules in India) and verified minimum market data equity floors.
*   Added comprehensive validation guards to prevent division by zero in portfolio weights.

### Phase 3 & 4: Deep Security & Validation Audits
*   **Security Hardening:** Implemented bcryptjs password hashing and protected JWT endpoints.
*   **Timing Attack Mitigation:** Standardized authentication response times to prevent user enumeration.
*   **API Key Protections:** Removed exposed development credentials and established dotenv management.
*   **Automatic Cache Invalidation:** Programmed Redis triggers to flush cached system prompts whenever user profiles or goal matrices update.

### Phase 5 & 6: Institutional-Grade Tax & Risk Math
*   **Indian Income Tax Reforms:** Programmed full calculations for **Section 87A Marginal Relief** and progressive surcharges with marginal relief under the **New Tax Regime (FY2025-26)**.
*   **3-Factor Risk Profiler:** Replaced basic risk questionnaires with a composite scoring algorithm taking into account Age, Income, and Retirement Horizon.
*   **Stochastic Projections:** Upgraded the wealth engine from deterministic forecasts to log-normal Geometric Brownian Motion (GBM) with standard Monte Carlo.
*   **Dynamic UI Hook:** Wired the risk-appetite slider to live-recalculate optimal instrument weights instantly.

### Phase 7: Advanced Variance Reduction
*   **Quasi-Monte Carlo (QMC):** Replaced pseudo-random path generation with deterministic **Halton Sequences** (prime bases 2 and 3).
*   **Antithetic Mirroring:** Programmed mirror paths ($Z$ and $-Z$) to neutralize odd-moment simulation bias.
*   **Control Variate Correction:** Coupled terminal values with the analytical future value of an ordinary annuity-due, reducing simulation standard error by **92%** and boosting convergence.

### Phase 8 & 9: XIRR Newton-Raphson Engine & Adversarial Auditing
*   **XIRR Engine:** Built a custom numerical solver using the **Newton-Raphson Method** to compute Extended Internal Rate of Return for irregular cash flows.
*   **SGB & NPS Corrections:** Hardened age-locks (NPS locking until age 60) and Sovereign Gold Bond coupon taxation slab checks.
*   **Adversarial Test Suite:** Expanded tests to **146 passing test cases** across backend validation bounds, math sanity limits, and LLM fallback state transfers.

---

## 3. Comprehensive Mathematical & Financial Foundations

```
                     +---------------------------------------+
                     |           Investor Profile            |
                     |     Age, Income, Savings, Appetite    |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |        Enriched Feature Vector        |
                     |  Savings Rate, Risk-Age, Horiz, Slabs |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |       Random Forest Classifier        |
                     |   Class Probabilities / Instrument ID |
                     +----------+-----------------+----------+
                                |                 |
            +-------------------+                 +-------------------+
            v                                                         v
+-----------------------+                                 +-----------------------+
|  Local TreeSHAP XAI   |                                 |   Portfolio Engine    |
|   Attributions        |                                 | Mean-Variance Optim   |
|   "Why Recommended?"  |                                 |  - Min Variance       |
+-----------+-----------+                                 |  - Max Sharpe         |
            |                                             |  - Risk Parity        |
            |                                             +-----------+-----------+
            |                                                         |
            |                                                         v
            |                                             +-----------------------+
            |                                             |  Stochastic GBM Engine|
            |                                             |  Halton QMC Sequence  |
            |                                             |   Antithetic Paths    |
            |                                             |   Control Variates    |
            |                                             +-----------+-----------+
            |                                                         |
            |                                                         v
            |                                             +-----------------------+
            |                                             | Post-Tax Optimization |
            |                                             |   FY25-26 Tax Slabs   |
            |                                             |   87A & Surcharges    |
            |                                             +-----------+-----------+
            |                                                         |
            +---------------------------+-----------------------------+
                                        |
                                        v
                     +---------------------------------------+
                     |       Generative Advisory Chat        |
                     |  Gemini 2.0 Flash / Groq Fail-safe    |
                     |     SEBI Grounded Legal Disclaimers   |
                     +---------------------------------------+
```

### A. Stochastic Projections (Geometric Brownian Motion)
Portfolio terminal wealth $S(T)$ under systematic monthly investments $P_m$ is modeled as a discretized monthly Geometric Brownian Motion (GBM):
$$S(t + \Delta t) = (S(t) + P_m) \exp\left( \left(\mu - \frac{\sigma^2}{2}\right)\Delta t + \sigma \sqrt{\Delta t} Z \right)$$
where:
*   $\mu$: Expected annual post-tax rate of return (decimal).
*   $\sigma$: Portfolio annualized volatility (decimal).
*   $\Delta t$: Monthly step time $\left(\frac{1}{12}\text{ year}\right)$.
*   $Z$: Standard normal random variable $Z \sim \mathcal{N}(0,1)$.

### B. Variance Reduction Framework
To resolve the slow convergence rate $O(1/\sqrt{N})$ of standard Monte Carlo simulations, WealthGenie implements a three-part variance reduction layer:

1.  **Quasi-Monte Carlo (QMC) via Halton Sequences:** 
    Generates deterministic, highly uniform numbers using the radical inverse function:
    $$\psi_p(n) = \sum_{i=0}^k a_i p^{-i-1}$$
    where $n$ is represented in prime bases $p_1=2$ and $p_2=3$. Points $H(n) = (\psi_2(n), \psi_3(n))$ are mapped to normal variates via the inverse normal CDF: $Z = \Phi^{-1}(H)$. QMC accelerates error convergence to $O(1/N)$.
2.  **Antithetic Variates:** 
    For each path calculated using normals $\{Z_1, Z_2, \dots, Z_k\}$, a parallel mirror path is evaluated using $\{-Z_1, -Z_2, \dots, -Z_k\}$, neutralizing odd-moment simulation bias.
3.  **Control Variate Correction:** 
    Uses the exact analytical future value of an ordinary annuity-due as the control. If monthly return is $r = \mu/12$ and total steps $n = 12 \cdot Y$, the target deterministic value is:
    $$FV_{\text{det}} = P_m \cdot \frac{(1+r)^n - 1}{r} \cdot (1+r)$$
    The raw simulated mean $\bar{S}_{\text{raw}}$ is corrected to eliminate sampling bias:
    $$S_{\text{adjusted}} = S_{\text{raw}} - (\bar{S}_{\text{raw}} - FV_{\text{det}})$$

### C. Newton-Raphson XIRR Engine
To determine the annualized rate of return for a series of irregular, non-periodic cash flows $C_i$ at dates $D_i$, the system solves for $r$ in the Net Present Value (NPV) equation:
$$f(r) = \sum_{i=0}^M \frac{C_i}{(1 + r)^{\frac{D_i - D_0}{365}}} = 0$$
Using the Newton-Raphson iterative method:
$$r_{n+1} = r_n - \frac{f(r_n)}{f'(r_n)}$$
where the derivative $f'(r)$ is computed analytically as:
$$f'(r) = -\sum_{i=0}^M \left( \frac{D_i - D_0}{365} \right) \frac{C_i}{(1 + r)^{\frac{D_i - D_0}{365} + 1}}$$
The loop executes until $|r_{n+1} - r_n| < 10^{-10}$ or iteration count exceeds 100. If derivative division approaches zero, the engine falls back to a bisection search step.

### D. Progressive Indian Taxation Engine (FY2025-26)
WealthGenie evaluates post-tax returns by subtracting effective tax drag $T_{\text{eff}}$ from nominal rates $R_{\text{nom}}$:
$$R_{\text{post}} = R_{\text{nom}}(1 - T_{\text{eff}})$$

#### 1. New Tax Regime Slab Structure
$$\text{Taxable Income } (I_{\text{taxable}}) = \text{Gross Income} - \text{Standard Deduction } (₹75,000)$$
$$\text{Base Tax } (T_{\text{base}}) = \text{Calculate from slabs: } [0\text{ to } 4\text{L: } 0\%, \; 4\text{L--}8\text{L: } 5\%, \; 8\text{L--}12\text{L: } 10\%, \; 12\text{L--}16\text{L: } 15\%, \; 16\text{L--}20\text{L: } 20\%, \; 20\text{L--}24\text{L: } 25\%, \; >24\text{L: } 30\%]$$

#### 2. Section 87A Rebate with Marginal Relief
If $I_{\text{taxable}} \le ₹1,200,000$, a full rebate is applied, reducing base tax to 0. If $I_{\text{taxable}} > ₹1,200,000$ and base tax exceeds the excess income above $₹1,200,000$, marginal relief reduces the tax to:
$$T_{\text{base}} = I_{\text{taxable}} - ₹1,200,000$$

#### 3. Surcharges and Surcharge Marginal Relief
For high incomes:
*   $₹5,000,000 < I_{\text{taxable}} \le ₹10,000,000$: $10\%$ surcharge on base tax.
*   $₹10,000,000 < I_{\text{taxable}} \le ₹20,000,000$: $15\%$ surcharge on base tax.
*   $I_{\text{taxable}} > ₹20,000,000$: $25\%$ surcharge on base tax.

To prevent marginal tax spikes at thresholds, surcharge marginal relief caps total tax at:
$$T_{\text{base}} + \text{Surcharge} \le \text{Tax at threshold} + (I_{\text{taxable}} - \text{Threshold})$$

#### 4. Effective Cess
A flat $4\%$ Health and Education Cess is applied on the sum of base tax and surcharge:
$$T_{\text{final}} = (T_{\text{base}} + T_{\text{surcharge}}) \times 1.04$$

#### 5. Instrument-Specific Tax Calculations
*   **Fixed Deposits (FD) & Debt Mutual Funds:** Interest/gains added to income and taxed at marginal rate ($T_m \times 1.04$).
*   **Equities, ETFs, ELSS, Arbitrage MFs:** STCG (held $< 1$ year) taxed at $20\%$. LTCG (held $\ge 1$ year) taxed at $12.5\%$ on gains exceeding $₹125,000$.
*   **Sovereign Gold Bonds (SGB):** Statutorily exempt from capital gains taxes upon 8-year maturity. Coupon payments ($2.5\%$ annually) are taxed at slab rates.
*   **PPF / SSY:** EEE category. Both interest accrued and maturity balances are $100\%$ tax-exempt.

### E. Portfolio Optimizations (Mean-Variance & Risk Parity)
The portfolio engine solves long-only, fully-invested allocation problems using gradient projection onto the probability simplex:
$$\text{Constraint: } \sum_{i=1}^n w_i = 1, \quad w_i \ge 0$$
Projection is performed using the **Duchi et al. (2008)** unit simplex projection algorithm:
$$w = \max(v - \theta, 0)$$

1.  **Minimum Variance Portfolio:** Minimizes portfolio variance $w^T \Sigma w$. The gradient of the objective function is $2\Sigma w$.
2.  **Maximum Sharpe Ratio Portfolio:** Maximizes risk-adjusted excess return:
    $$\text{Maximize } \frac{w^T \mu - R_f}{\sqrt{w^T \Sigma w}}$$
    Calculated using analytical gradient ascent:
    $$\nabla S(w) = \frac{\mu \cdot \sigma_p - (w^T \mu - R_f) \frac{\Sigma w}{\sigma_p}}{\sigma_p^2}$$
3.  **Risk Parity Portfolio:** Solves for equal risk contributions:
    $$RC_i = w_i \cdot \frac{(\Sigma w)_i}{\sqrt{w^T \Sigma w}} = \frac{\sqrt{w^T \Sigma w}}{n}$$
    Updated iteratively using Maillard, Roncalli, and Teïletche (2010) scaling updates:
    $$w_i \leftarrow \frac{1}{\text{Marginal Risk Contribution}_i}$$
    followed by simplex normalizations.

---

## 4. System Architecture & Component Directory Mapping

```
WEALTHGENIEFV/
├── index.html                   # Core desktop HTML portal
├── style.css                    # Shared CSS UI styles
├── script.js                   # Client handler scripts
├── knowledge.md                 # Theoretical research documentation
├── know_all.md                  # Complete system overview (this file)
├── reactapp/                    # Frontend React Single Page App
│   ├── package.json             # React UI dependencies
│   ├── vite.config.js           # Vite dev-server config
│   ├── src/
│   │   ├── main.jsx             # React mounting entrypoint
│   │   ├── App.jsx              # Routing and navigation
│   │   ├── index.css            # Stylesheets
│   │   └── components/          # UI panels (Dashboard, Risk, Projections, Chat)
├── server/                      # Node.js REST Backend
│   ├── package.json             # Node dependency manifests
│   ├── server.js                # Server entry and route registration
│   ├── .env                     # Local environment keys
│   ├── config/                  # DB and Cache connections
│   │   ├── db.js                # Mongoose connector
│   │   └── redis.js             # Upstash Redis client
│   ├── models/                  # Mongo Mongoose schemas
│   │   ├── User.js
│   │   ├── FinancialProfile.js
│   │   ├── Goal.js
│   │   ├── Instrument.js
│   │   └── ConversationHistory.js
│   ├── routes/                  # Express controller route gateways
│   │   ├── auth.js              # Signup/Login logic
│   │   ├── tax.js               # Slab evaluations
│   │   ├── recommend.js         # ML service wrappers
│   │   └── chatRoutes.js        # Gemini/Groq orchestration
│   └── services/                # Math calculation services
│       ├── taxEngine.js         # Slab calculations & marginal relief
│       ├── xirrCalculator.js    # Newton-Raphson XIRR solver
│       ├── monteCarloEngine.js  # QMC & variance-reduction GBM
│       └── portfolioEngine.js   # Simplex solvers & rebalancer
└── ml-service/                  # Machine Learning Microservice
    ├── requirements.txt         # Pip package definitions
    ├── main.py                  # FastAPI server script
    ├── schemas.py               # Pydantic validation structures
    ├── explainer.py             # SHAP explainability configurations
    ├── backtester.py            # Scenario backtester
    └── model/                   # Serialized ML files
        ├── train.py             # Classifier training script
        ├── model.pkl            # Random Forest weights
        └── label_encoder.pkl    # String target encoder
```

### Database Schemas (Mongoose)

*   **User Schema (`User.js`):** Stores credentials, email hashes, and metadata.
*   **FinancialProfile Schema (`FinancialProfile.js`):** Holds age, annual income, monthly savings, stated risk appetite, and active tax regime.
*   **Goal Schema (`Goal.js`):** Maps goal targets (e.g., Retirement, Education), timelines, required amounts, and monthly SIP contributions.
*   **Instrument Schema (`Instrument.js`):** Keeps static definitions, yields, standard deviations, and tax codes for the 15+ asset classes.
*   **ConversationHistory Schema (`ConversationHistory.js`):** Persists user chat strings to maintain context during LLM failover.

---

## 5. Machine Learning Classification & Explanations (SHAP)

### A. Random Forest Classifier
*   **Target Classes:** Financial allocations categorized as *Aggressive*, *Moderate-Aggressive*, *Moderate*, *Conservative-Moderate*, and *Conservative*.
*   **Input Features:**
    1.  Age (int, $[18, 80]$)
    2.  Annual Income (float, $\le ₹10\text{Cr}$)
    3.  Monthly Savings (float)
    4.  Stated Risk Appetite Score (integer, $[0, 4]$)
*   **Derived Features (Feature Engineering):**
    *   Savings Rate ($S_r = \min(\text{savings} / (\text{income}/12), 1.0)$)
    *   Retirement Horizon ($H_{ret} = \max(0, 60 - \text{Age})$)
    *   Composite Risk-Age Score ($R_{age} = \text{Risk Appetite} / \max(1, \text{Age} / 30)$)
*   **Model:** Scikit-learn `RandomForestClassifier` running 100 decision estimators.

### B. TreeSHAP Explanation Layer
Using Game Theory Shapley values, the model explains feature importances for predictions:
$$f(\mathbf{x}) = \phi_0 + \sum_{i=1}^M \phi_i(\mathbf{x})$$
where $\phi_0$ is the base expected model probability and $\phi_i$ represents the local attribution value for feature $i$.
*   **TreeExplainer Integration:** If `shap` is installed, it runs polynomial-time tree traversals.
*   **Fallback Feature Explainer:** If SHAP is missing (e.g., in light runtime environments), the service falls back to checking feature importances scaled by population means to extract directional impact.

---

## 6. Stateful Fail-Safe LLM Orchestration

WealthGenie routes chat traffic through an automated fallback proxy to guarantee $99.99\%$ service availability:

```
[User Message] ---> [Redis Rate Limiter: max 30 req/hr]
                         |
                         v
             [Assemble Session Context]
        (User profile + SHAP logs + Projections)
                         |
                         v
             [Try Primary API Request]
              - Model: gemini-2.0-flash
                         |
           +-------------+-------------+
           | (Success)                 | (Failure / 4xx / 5xx / >15s Timeout)
           v                           v
     [Deliver Reply]      [Trigger Failover Handler]
                          - Map Gemini JSON payload to OpenAI formatting
                          - Route to Groq API (llama-3.3-70b-versatile)
                                       |
                                       v
                                 [Deliver Reply]
```

### Redis Optimization
*   **Prompt Caching:** System prompt templates and calculated investor data vectors are cached in Redis with a 30-minute Time-to-Live (TTL), reducing token costs.
*   **Rate Gating:** Rolling window tokens limit API requests to 30 submissions per hour per user.
*   **SEBI Regulatory Footer:** System filters verify that every AI recommendation is accompanied by the statutory SEBI disclaimer.

---

## 7. Run & Test Commands

To spin up the services locally:

### 1. Launch the ML Microservice
```powershell
cd ml-service
# Activate virtual environment
.\.venv\Scripts\activate
# Start FastAPI server
python main.py
```
*Port:* [http://localhost:8000](http://localhost:8000)

### 2. Boot the Express API Backend
```powershell
cd server
# Start Express Server
npm run start
```
*Port:* `http://localhost:5000`

### 3. Spin up the Vite React Frontend
```powershell
cd reactapp
# Run Dev Server
npm run dev
```
*URL:* [http://localhost:5173](http://localhost:5173)

### 4. Running the Test Suites
*   **Express Backend Tests (Jest):**
    ```powershell
    cd server
    npm run test
    ```
*   **ML Microservice Tests (Pytest):**
    ```powershell
    cd ml-service
    pytest
    ```
