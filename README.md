# WealthGenie 🧞‍♂️

WealthGenie is an intelligent, three-tier robo-advisory platform designed to help investors optimize their asset allocation, forecast stochastically how their wealth will grow over time, and minimize their tax liabilities. It combines modern quantitative financial math with explainable artificial intelligence (XAI).

This project is built to be highly accessible. Whether you are an experienced software engineer, a finance professional, or a computer science student with zero finance background, this guide will help you understand how the system is put together, how the mathematical models work, and how to run the project.

---

## 🗺️ System Architecture

WealthGenie operates on a three-tier architecture: a React frontend, an Express/Node.js backend, and a Python FastAPI ML microservice.

```
                      ┌────────────────────────────────────────┐
                      │             React Frontend             │
                      │  (Vite + React 19 + Framer Motion)     │
                      │  Builds interactive, animated dashboards│
                      └───────────────────┬────────────────────┘
                                          │
                                          │ HTTP / WebSockets
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          Node.js Express Backend       │
                      │  Coordinates Auth, Mongo DB, Cache,    │
                      │  and executes core financial math      │
                      └───────────────────┬────────────────────┘
                                          │
                                          │ HTTP Requests
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          FastAPI ML Microservice       │
                      │  Runs Random Forest model & SHAP XAI   │
                      │  for personalized asset recommendations│
                      └────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 19.x | Component-based, responsive user interface |
| **Frontend build** | Vite | 6.x | High-performance, fast-loading asset bundler |
| **Styling** | Vanilla CSS / Framer Motion | N/A | Premium custom layouts and smooth micro-animations |
| **Backend** | Node.js / Express | 20.x+ | REST API server, authentication, DB gateway, cache coordination |
| **Database** | MongoDB / Mongoose | 8.x+ | Structured document store for users, profiles, goals, and assets |
| **Cache / Rate Limit** | Redis (Upstash) | N/A | Session prompt caching and API rate limiting |
| **ML Microservice** | FastAPI | 0.110.x+ | High-performance Python web server for serving ML model predictions |
| **Machine Learning** | Scikit-learn / SHAP | 1.4.x+ | Random Forest classifier and Game-Theory feature attribution |
| **Testing** | Jest / Pytest | N/A | Continuous validation suites (146+ tests) |

---

## 🚀 Quick Start Guide (Windows)

Follow these steps to get WealthGenie running on your local machine:

### Prerequisites
Make sure you have the following installed:
1. **Node.js** (v18 or higher)
2. **Python** (v3.10 or higher)
3. **MongoDB** (Local instance or MongoDB Atlas account)
4. **Redis** (Local instance or Upstash account)

---

### Step-by-Step Installation

#### 1. Setup Backend environment
Navigate to the `server` directory and copy the template configuration:
```powershell
cd server
copy .env.example .env
```
Open `.env` in a text editor and fill in your MongoDB URI, JWT secret, Redis URL, and Gemini API Key (see [Environment Variables](#-environment-variables) below).

#### 2. Install Backend dependencies
Install Node packages for the server:
```powershell
npm install
```

#### 3. Setup ML Microservice Python environment
Open a new terminal window or tab, navigate to the `ml-service` directory, create a virtual environment, and activate it:
```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\activate
```

#### 4. Install ML Microservice dependencies
Install Python packages:
```powershell
pip install -r requirements.txt
```

#### 5. Install Frontend dependencies
Open a new terminal window or tab, navigate to the `reactapp` directory, and install its dependencies:
```powershell
cd reactapp
npm install
```

---

### Running the Services

To run the application, you need to start all three services.

1. **Launch the ML Microservice**
   In the `ml-service` terminal (with the virtual environment activated):
   ```powershell
   python main.py
   ```
   *The ML service will start on [http://localhost:8000](http://localhost:8000).*

2. **Launch the Express API Backend**
   In the `server` terminal:
   ```powershell
   npm run start
   ```
   *The API backend will boot on [http://localhost:5000](http://localhost:5000).*

3. **Launch the React Frontend**
   In the `reactapp` terminal:
   ```powershell
   npm run dev
   ```
   *The frontend dashboard will load on [http://localhost:5173](http://localhost:5173).*

---

## 📁 Project Structure

Here is a breakdown of what the different directories and files contain:

```
WEALTHGENIEFV/
├── index.html                   # Static landing page entry HTML
├── style.css                    # Styling for static landing page
├── script.js                   # Client logic for landing page
├── know_all.md                  # Comprehensive, expert-level system & math manual
├── knowledge.md                 # Original project research notes and specifications
├── reactapp/                    # Vite React 19 Frontend single page application
│   ├── src/
│   │   ├── main.jsx             # React mounting entrypoint
│   │   ├── App.jsx              # App layout, global states, and routes
│   │   ├── index.css            # Core stylesheets and variables
│   │   └── components/          # Dashboard panels, Chat UI, risk sliders
│   └── package.json             # Frontend dependency definitions
├── server/                      # Node.js Express REST API server
│   ├── server.js                # App entrypoint, middleware chain, route setup
│   ├── config/                  # DB connection and Redis cache client setup
│   ├── models/                  # Mongoose MongoDB schemas (User, Goals, Instruments)
│   ├── routes/                  # REST route controllers (auth, goals, portfolio, tax)
│   └── services/                # Quantitative math calculation engines
│       ├── taxEngine.js         # Income tax and Marginal Relief math
│       ├── xirrCalculator.js    # Newton-Raphson XIRR equation solver
│       ├── monteCarloEngine.js  # Quasi-Monte Carlo Geometric Brownian Motion
│       └── portfolioEngine.js   # Simplex projection rebalancer
└── ml-service/                  # Python FastAPI ML microservice
    ├── main.py                  # API endpoints, FastAPI router
    ├── schemas.py               # Request/response validation schemas (Pydantic)
    ├── explainer.py             # SHAP XAI calculation wrapper
    ├── backtester.py            # Historical scenario comparison engine
    └── model/                   # Model training and artifact storage
        ├── train.py             # Script to fit model to dummy data
        └── model.pkl            # Serialized Random Forest classifier
```

---

## 📖 Financial Glossary for Beginners

If you are new to personal finance, here are the core terms used throughout the codebase:

| Term | Meaning | Definition |
| :--- | :--- | :--- |
| **SIP** | Systematic Investment Plan | A method where you invest a fixed amount regularly (e.g. monthly) rather than a lump sum. |
| **XIRR** | Extended Internal Rate of Return | The annualized rate of return for a series of irregular, non-periodic cash flows (e.g., individual SIP deposits made on different dates). |
| **LTCG** | Long-Term Capital Gains | Taxes applied on profits from selling investments held longer than a specific duration (e.g. 1 year for equities). |
| **STCG** | Short-Term Capital Gains | Taxes applied on profits from selling investments held for a short duration (e.g. under 1 year for equities). |
| **CAGR** | Compound Annual Growth Rate | The constant rate at which an investment would have grown if it grew at a steady rate compounded annually. |
| **GBM** | Geometric Brownian Motion | A mathematical model (stochastic process) used to simulate stock prices and asset values, assuming random changes. |
| **QMC** | Quasi-Monte Carlo | A simulation technique that uses evenly distributed sequences (Halton sequences) instead of pure random numbers to achieve faster convergence. |
| **SHAP** | Shapley Additive exPlanations | A machine learning explainability method that attributes credit (or blame) to each input feature for the model's final prediction. |
| **EEE** | Exempt-Exempt-Exempt | A tax category (e.g., PPF) where investment amount, interest earned, and final maturity amount are all exempt from tax. |
| **TDS** | Tax Deducted at Source | Tax collected directly at the point of origin (e.g. bank deducting tax before paying you FD interest). |
| **Sharpe Ratio** | Risk-Adjusted Return Measure | A metric measuring how much excess return an investment earns for the extra risk/volatility it takes on. |

---

## 🧮 How the Math Works (Plain English)

WealthGenie implements five core mathematical engines in the backend:

### 1. Progressive Income Tax Engine (`taxEngine.js`)
*   **Concept:** India taxes income in "layers" (slabs). As your income increases, the rate on successive layers goes up.
*   **Section 87A Rebate:** If taxable income is under ₹1,200,000, tax is fully refunded (rebate).
*   **Marginal Relief:** If your income is just slightly over ₹1,200,000, you shouldn't pay a tax that is larger than your excess income. Marginal relief caps your tax so that you are never penalized for earning slightly more.
*   **Surcharges & Cess:** Surcharges apply to high earners (over ₹50L), capped by surcharge marginal relief. A flat 4% health/education cess is added at the end.

### 2. Stochastic Monte Carlo Engine (`monteCarloEngine.js`)
*   **Concept:** Standard forecasts assume a fixed annual growth rate (e.g., 10% every single year). In the real world, markets fluctuate randomly.
*   **GBM Modeling:** We simulate monthly returns using Geometric Brownian Motion (GBM)—representing steady growth mixed with random market volatility.
*   **Speed Optimization (QMC & Halton):** Generating purely random numbers is slow and leaves gaps. We use **Halton Sequences** (Quasi-Monte Carlo) to distribute simulation points perfectly evenly, making the model run 10x faster.
*   **Antithetic Mirroring:** For every optimistic simulation path we run, we simulate a mirror, pessimistic path. This cancels out bias and yields stable results.
*   **Control Variate Correction:** We correct simulation drift using the exact formula for a steady compound interest annuity.

### 3. Newton-Raphson XIRR Engine (`xirrCalculator.js`)
*   **Concept:** If you invest ₹10,000 every month for 5 years, the first installment grows for 5 years, whereas the last installment grows for only 1 month. A simple return calculation is incorrect.
*   **XIRR calculation:** We find the exact annual percentage rate that makes the present value of all your deposits equal to the final portfolio value.
*   **Newton-Raphson:** The engine starts with a guess and iteratively refines it using calculus derivatives to approach the correct XIRR in milliseconds. If it fails, it falls back to a binary search.

### 4. Portfolio Optimization Engine (`portfolioEngine.js`)
*   **Concept:** How do we allocate your savings among equities, bonds, gold, and cash to get the best return for your risk profile?
*   **Covariance & Correlation:** We measure how much two assets move together. Good portfolios combine assets that don't crash at the same time (diversification).
*   **Simplex Projection:** Mathematical optimization requires that your portfolio weights always add up to exactly 100% and cannot be negative. We project weights onto a "probability simplex" to enforce this.
*   **Sharpe Ratio Maximization:** The engine searches for weights that maximize the excess return earned per unit of risk.

### 5. Risk Profiler Engine (`riskProfiler.js`)
*   **Concept:** Risk tolerance isn't just about what you feel; it's about what you can afford.
*   **Composite Scoring:** The engine combines three dimensions: your subjective risk preference (slider), your age, and your retirement horizon (years until age 60). Younger investors with long horizons get a higher risk budget than older investors near retirement.

---

## 🔌 API Reference

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/signup` | POST | Request Body | Register a new user |
| `/api/auth/login` | POST | Request Body | Log in existing user and obtain JWT |
| `/api/tax/compute` | GET | `income`, `regime`, `section80C` etc. | Computes tax slab calculations and rebates |
| `/api/tax/compare` | GET | `income`, deductions | Compares Old vs New Tax regimes |
| `/api/recommend` | GET | `age`, `income`, `savings`, `risk` | Gets ML recommendations & SHAP attributions |
| `/api/montecarlo` | GET | `principal`, `monthly`, `years`, `risk` | Runs stochastic projection |
| `/api/portfolio/optimal`| GET | `riskAppetite`, `method` | Calculates optimal asset allocation weights |
| `/api/chat` | POST | `message` | AI Advisor chatbot with Gemini/Groq failover |

---

## 🔒 Environment Variables

Configure these variables inside your `server/.env` file:

| Variable | Description | Default | Link to obtain |
| :--- | :--- | :--- | :--- |
| `PORT` | Port for backend Express API | `5000` | N/A |
| `NODE_ENV` | Environment context | `development` | N/A |
| `MONGODB_URI` | Mongo Connection String | Localhost string | [MongoDB Atlas](https://mongodb.com/atlas) |
| `JWT_SECRET` | Secret key for signing user sessions | Random hex string | Generated locally |
| `REDIS_URL` | Upstash Redis connection string | Redis connection URL | [Upstash Console](https://upstash.com) |
| `ML_SERVICE_URL` | URL of FastAPI microservice | `http://localhost:8000` | N/A |
| `GEMINI_API_KEY` | Google AI Studio API Key | `your_key` | [Google AI Studio](https://aistudio.google.com) |

---

## 🧪 Running Tests

To verify code correctness, run the test suites:

### Backend Express Tests (Jest)
```powershell
cd server
npm run test
```

### ML Microservice Tests (Pytest)
```powershell
cd ml-service
# Make sure your virtual environment is active
pytest
```

---

> [!NOTE]
> For advanced architectural history, deep mathematical derivations, and SEBI regulatory details, please refer to the advanced developer manual: [know_all.md](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/know_all.md).
