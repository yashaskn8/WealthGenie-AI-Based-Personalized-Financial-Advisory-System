# WealthGenie System Architecture & Knowledge Base

This document provides a comprehensive, exhaustive overview of the **WealthGenie** full-stack ecosystem. No file has been left out.

---

## 1. High-Level Architecture
WealthGenie uses a **decoupled microservice architecture**:

- **Frontend**: React (Vite) for the app, HTML/JS for the landing.
- **Backend**: Node.js (Express) as the API Orchestrator.
- **ML Service**: Python (FastAPI) for advanced AI and financial modeling.
- **Databases**: MongoDB Atlas (Storage) and Upstash Redis (Caching).

---

## 2. Tech Stack Summary
| Layer | Tech | File Types |
| :--- | :--- | :--- |
| **Frontend (App)** | React 18, Vite, Tailwind v4 | `.jsx`, `.css`, `.svg`, `.png`, `.mp4` |
| **Frontend (Landing)** | Vanilla HTML, CSS, JS | `.html`, `.css`, `.js` |
| **Backend (API)** | Node.js, Express, Mongoose | `.js`, `.env`, `.json` |
| **Backend (ML)** | Python 3.x, FastAPI, SHAP, Scikit-Learn | `.py`, `.pkl`, `.txt` |

---

## 3. Exhaustive Project Directory Tree (The "Full Map")

```text
WEALTHGENIEFV/
├── .gitignore
├── README.md
├── genie.mp4                        # Landing page video
├── index.html                       # Landing page entry
├── script.js                        # Landing page logic
├── style.css                        # Global/Landing styling
├── knowledge.md                     # This documentation
├── asssets/                         # Shared static assets (misc)
├── ml-service/                      # PYTHON MICROSERVICE (.py)
│   ├── main.py                      # FastAPI server & route handlers
│   ├── explainer.py                 # SHAP Explainability logic
│   ├── schemas.py                   # Pydantic data validation schemas
│   ├── requirements.txt             # Python dependency list
│   ├── model/                       # ML Models & Training
│   │   ├── model.pkl                # Core Random Forest model
│   │   ├── decision_tree.pkl        # Alternate model asset
│   │   ├── label_encoder.pkl        # Target variable encoder
│   │   └── train.py                 # Model training/retraining script
│   └── tests/                       # ML Unit tests
├── server/                          # NODE.JS BACKEND (.js)
│   ├── server.js                    # Entry point & Express setup
│   ├── .env                         # Secret keys & URIs
│   ├── .env.example                 # Environment template
│   ├── check_users.js               # DB utility script
│   ├── package.json                 # Node dependencies
│   ├── package-lock.json            # Dependency lockfile
│   ├── config/                      # Infrastructure Config
│   │   ├── db.js                    # MongoDB Atlas connection
│   │   ├── redis.js                 # Upstash Redis client setup
│   │   └── seedInstruments.js       # Database initialization script
│   ├── jobs/                        # Automated Tasks
│   │   └── marketDataRefresh.js     # Market data sync (Cron)
│   ├── middleware/                  # Request Processing
│   │   ├── authMiddleware.js        # JWT/Passport authentication
│   │   └── errorHandler.js          # Global error interceptor
│   ├── models/                      # MongoDB Data Schemas
│   │   ├── User.js                  # User Auth schema
│   │   ├── Goal.js                  # Financial Goal schema
│   │   ├── FinancialProfile.js      # User Finance snapshot schema
│   │   ├── Instrument.js            # Financial Instrument metadata
│   │   ├── Recommendation.js        # AI Recommendation results
│   │   └── ConversationHistory.js   # Chat history persistence
│   ├── routes/                      # API Endpoints
│   │   ├── auth.js                  # /api/auth
│   │   ├── chatRoutes.js            # /api/chat
│   │   ├── goals.js                 # /api/goals
│   │   ├── instruments.js           # /api/instruments
│   │   ├── market.js                # /api/market
│   │   ├── montecarlo.js            # /api/montecarlo
│   │   ├── profile.js               # /api/profile
│   │   ├── projection.js            # /api/projection
│   │   ├── recommend.js             # /api/recommend
│   │   └── tax.js                   # /api/tax
│   ├── services/                    # Business & Engine Logic
│   │   ├── geminiChatService.js     # Chat-specific AI logic
│   │   ├── geminiService.js         # Core Google AI API wrapper
│   │   ├── genieChatSystemPrompt.js # AI Personality/Prompt definitions
│   │   ├── marketDataService.js     # Live scrapers (AMFI/Yahoo)
│   │   ├── mlClient.js              # Python ML Service bridge
│   │   ├── monteCarloEngine.js      # Wealth projection math
│   │   ├── postTaxCalculator.js     # Complex tax-adjusted returns
│   │   ├── projectionEngine.js      # Standard compounding logic
│   │   ├── riskProfiler.js          # Risk score computation
│   │   └── taxEngine.js             # Tax slab calculation engine
│   ├── tests/                       # Backend Unit Tests
│   │   ├── monteCarloEngine.test.js
│   │   ├── postTaxCalculator.test.js
│   │   └── taxEngine.test.js
│   └── validation/                  # Data Validation
│       └── schemas.js               # Joi/Zod-like validation rules
├── reactapp/                        # REACT FRONTEND (.jsx)
│   ├── package.json                 # Frontend dependencies
│   ├── package-lock.json            # Frontend lockfile
│   ├── vite.config.js               # Vite build configuration
│   ├── index.html                   # React mount point
│   ├── eslint.config.js             # Linting rules
│   ├── README.md                    # React documentation
│   ├── README_V2.md                 # Updated React documentation
│   └── src/                         # Source Code
│       ├── App.jsx                  # Root Component & Routing
│       ├── App.css                  # Core app styling
│       ├── main.jsx                 # Client entry point
│       ├── index.css                # Global Tailwind/Base styles
│       ├── Dashboard.css            # Dashboard-specific styles
│       ├── RecommendationDashboard.jsx # Primary Dashboard view
│       ├── recommendationEngine.js   # Client-side logic engine
│       ├── investmentDatabase.js     # Local static asset database
│       ├── HealthScoreScreen.jsx     # Financial health view
│       ├── HealthScoreScreen.css     # Health score styling
│       ├── ComparisonTableModal.jsx  # Asset comparison UI
│       ├── ComparisonTableModal.css  # Comparison UI styling
│       ├── GoalCoverage.jsx          # Goal status visualization
│       ├── HelpTourScreen.jsx        # Onboarding UI
│       ├── InsightsScreen.jsx        # Data-driven insights view
│       ├── InvestmentCard.jsx        # Reusable asset card
│       ├── PortfolioChart.jsx        # Portfolio visualization
│       ├── PostTaxAnalysis.jsx       # Tax impact UI
│       ├── RiskQuizModal.jsx         # Risk profiler UI
│       ├── assets/                   # Static Media
│       │   ├── chat_genie.png
│       │   ├── cosmic_bg.png
│       │   ├── logo.png
│       │   ├── gen.png
│       │   ├── gen_4k.png
│       │   ├── genie.mp4
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── components/              # UI Component Library
│       │   ├── AllocationPlanner.jsx
│       │   ├── AllocationPlanner.css
│       │   ├── DataFreshnessBar.jsx
│       │   ├── DeepDiveModal.jsx
│       │   ├── DeepDiveModal.css
│       │   ├── ErrorBoundary.jsx
│       │   ├── ExplainabilityPanel.jsx
│       │   ├── GenieChat.jsx
│       │   ├── GenieChat.css
│       │   ├── GoalPlanner.jsx
│       │   ├── GoalTracker.jsx
│       │   ├── GoalTracker.css
│       │   ├── ProjectionBand.jsx
│       │   ├── RebalancerScreen.jsx
│       │   ├── RebalancerScreen.css
│       │   ├── SebiDisclaimer.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Sidebar.css
│       │   ├── StepUpPlanner.jsx
│       │   ├── StepUpPlanner.css
│       │   ├── TaxScreen.jsx
│       │   └── TaxScreen.css
│       ├── context/                 # State Management
│       │   └── UserContext.jsx
│       ├── services/                # API Handlers
│       │   └── api.js               # Frontend Axios client
│       └── utils/                   # Shared Helpers
│           ├── indianNumberFormat.js
│           ├── postTaxEngine.js
│           ├── sipCalculator.js
│           └── taxCalculator.js
└── scratch/                         # Developer temp files
```

---

## 5. Extremely Detailed Feature Deep-Dive

### **A. Monte Carlo Simulation Engine (`monteCarloEngine.js`)**
- **Algorithm**: Employs the **Box-Muller Transform** to generate independent standard normal variables. It mathematically derives monthly parameters from annual inputs:
  - Monthly Mean $\mu_m = \frac{\text{Annual Return}}{12}$
  - Monthly StdDev $\sigma_m = \frac{\text{Annual Volatility}}{\sqrt{12}}$
- **Processing Power**: Conducts **10,000 parallel simulations** per request. For each month in the horizon, it draws a random return, compounds the balance, and incorporates the monthly SIP contribution.
- **Probabilistic Outputs**: Computes five critical percentile bands (**P10, P25, P50, P75, P90**) to visualize the "Cone of Uncertainty," allowing users to plan for both optimistic and worst-case scenarios.

### **B. ML Recommendation & SHAP Explainability (`explainer.py`)**
- **The Model**: A **Random Forest Classifier** trained on synthetic financial datasets, saved as `model.pkl`.
- **Explainability Logic**: Uses **SHAP (Shapley Additive Explanations)** to decompose the "Black Box" model. It calculates the **Shapley Value** for every user feature (Age, Savings, Risk).
- **Frontend Feedback**: The scores are translated into human-readable insights (e.g., "Your high risk tolerance increased the ELSS recommendation by 40%").

### **C. Real-Time Market Infrastructure (`marketDataService.js`)**
- **Mutual Fund Scraper**: Connects to the **AMFI (Association of Mutual Funds in India)** public API. It parses a 15,000+ line pipe-delimited text file every night at 23:30 IST to update Mutual Fund NAVs.
- **Market Volatility**: Hits **Yahoo Finance API** to fetch 36 months of historical closing prices. It then calculates the **Annualized Standard Deviation** of those returns to provide a "Live Volatility" figure for the Monte Carlo engine.
- **Persistence**: Implements a **Redis Write-Through Cache** to ensure that once market data is fetched, subsequent users get it in under 5ms.

### **D. Comprehensive Indian Tax Engine (`taxEngine.js`)**
- **Dual-Regime Logic**: Contains a decision engine that compares the **Old Tax Regime** (with deductions) vs. the **New Tax Regime** (lower slabs) to find the absolute minimum tax liability.
- **Surcharge & Cess**: Hardcoded math for the **4% Health & Education Cess** and the tiered surcharge for individuals earning above ₹50L, ₹1Cr, and ₹2Cr.

### **E. Genie AI Advisor Memory (`geminiChatService.js`)**
- **Prompt Engineering**: Uses a **150-line Dynamic System Prompt** that injects the user's specific financial status (net worth, risk category, and goals) into every message.
- **Chat Persistence**: Every interaction is timestamped and stored in **MongoDB**. When a user returns, the backend fetches the last 20 messages to provide a seamless, stateful conversation.

---

## 6. Implementation Update Log (Changelog)

| Version | Title | Technical Implementation Details |
| :--- | :--- | :--- |
| **v2.5** | **Exhaustive Mapping** | Generated recursive directory trees for all sub-sub-sub folders and mapped every file extension to its role in the system. |
| **v2.4** | **Documentation Engine** | Initialized `knowledge.md` to serve as the project's "Source of Truth" for developers. |
| **v2.3** | **Architecture Split** | Migrated ML logic from Node.js to a dedicated **FastAPI/Python microservice** for better math performance. |
| **v2.2** | **Live Data Pipeline** | Replaced static return estimates with real-time scrapers for **AMFI** and **Yahoo Finance**. |
| **v2.1** | **Cloud Integration** | Migrated local storage to **MongoDB Atlas** and implemented **Upstash Redis** for low-latency caching. |
| **v2.0** | **UI Modernization** | Rebuilt the entire dashboard using **Tailwind CSS v4**, implementing a high-end dark mode and glassmorphic UI. |
| **v1.8** | **AI Personalization** | Integrated **Google Gemini Pro** with a custom financial knowledge base and chat history persistence. |
| **v1.5** | **Simulation Engine** | Designed and coded the **Box-Muller Monte Carlo simulator** for wealth forecasting. |
| **v1.2** | **Core Tax Logic** | Implemented the Indian Income Tax Slab logic for FY 2024-25 (Old & New Regimes). |
| **v1.0** | **Initial Release** | MVP with basic User Auth, Financial Profile creation, and goal setting functionality. |

---

## 7. Database Schema Registry (MongoDB)

| Model | Primary Fields | Description |
| :--- | :--- | :--- |
| **`User`** | `email`, `password`, `isVerified` | Stores authentication credentials and account status. |
| **`FinancialProfile`** | `userId`, `income`, `age`, `savings`, `taxRegime`, `riskCategory` | The "Heart" of the user data. Used for all AI and simulation inputs. |
| **`Goal`** | `goal_name`, `target_amount`, `target_date`, `recommended_sip`, `probability_of_success` | Tracks user financial targets and the results of Monte Carlo projections. |
| **`Recommendation`** | `userId`, `instruments` (array), `explanation`, `ml_confidence` | Stores the output of the Python ML Service and SHAP explainer. |
| **`Instrument`** | `name`, `type` (ELSS, FD, etc.), `base_return`, `base_volatility` | Metadata for all investment types used by the engine. |
| **`ConversationHistory`** | `userId`, `messages` (array of role/content) | Persistent storage for the Genie AI Advisor chat sessions. |

---

## 8. REST API Endpoint Catalog

### **Authentication (`/api/auth`)**
- `POST /register`: Creates a new user and hashes passwords using `bcrypt`.
- `POST /login`: Validates credentials and returns a **JWT Token**.

### **Financial Profiles (`/api/profile`)**
- `POST /create`: Submits user data and computes initial risk/tax metrics.
- `GET /latest`: Fetches the most recent profile for the dashboard.

### **Market Intelligence (`/api/market`)**
- `GET /rates`: Returns live NAVs and index returns (fetched from AMFI/Yahoo).
- `POST /refresh`: Admin-only trigger to purge Redis cache and force a live sync.

### **Goals & Projections (`/api/goals`)**
- `POST /create`: Creates a goal, runs the **Monte Carlo Engine**, and stores outcomes.
- `GET /`: Lists all active goals with "On Track" / "At Risk" statuses.

### **Genie AI Chat (`/api/chat`)**
- `POST /message`: Sends a query to Gemini Pro with full financial context.
- `GET /history`: Retrieves the last 50 messages for the chat UI.

---

## 9. Core Algorithm Library (The "Engine Room")

### **A. Monte Carlo Logic (Node.js)**
```javascript
function boxMuller() {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Derive monthly distribution from annual inputs
const monthlyMean = annualReturn / 12;
const monthlyStdDev = annualVolatility / Math.sqrt(12);

// Run simulation
for (let m = 0; m < months; m++) {
  const monthlyReturn = monthlyMean + monthlyStdDev * boxMuller();
  balance = (balance + monthlySIP) * (1 + monthlyReturn);
}
```

### **B. SHAP Explainability Wrapper (Python)**
```python
def explain(self, raw_features):
    # features = [age, income, savings, risk_score]
    shap_values = self.explainer.shap_values(raw_features)
    
    # Extract feature contributions for the predicted class
    contribs = {}
    for i, feature in enumerate(self.feature_names):
        contribs[feature] = shap_values[predicted_class][0][i]
    return contribs
```

### **C. Tax Optimization Logic (Node.js)**
```javascript
const oldTax = computeOldRegime(income, deductions);
const newTax = computeNewRegime(income);

const recommendation = {
  regime: oldTax < newTax ? 'Old' : 'New',
  savings: Math.abs(oldTax - newTax),
  effective_rate: (Math.min(oldTax, newTax) / income) * 100
};
```

---

## 10. Global System Configuration (Production Ready)
- **Primary API**: Node.js (Port 5000)
- **ML Service**: Python/FastAPI (Port 8000)
- **Database**: MongoDB Atlas (Cloud)
- **Cache**: Upstash Redis (Global)
- **AI Model**: Google Gemini 1.5 Pro
- **Environment Context**: `.env` files required in both `server/` and `ml-service/`.
