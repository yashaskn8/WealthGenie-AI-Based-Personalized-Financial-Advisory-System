# Contributing to WealthGenie 🧞‍♂️

Welcome! We are excited that you want to contribute to WealthGenie. This guide will walk you through our directory layouts, coding style, testing protocols, and how to perform common tasks (like adding a new financial instrument or creating a new API route).

---

## 🏛️ Code Organization Conventions

Before you begin, familiarize yourself with our project structure:

- **Frontend (`reactapp/`)**: Built using Vite and React 19. All user interfaces, charts, and chatbot screens reside here.
- **Backend (`server/`)**: Express API.
  - Express routes go in `server/routes/`.
  - Database schemas go in `server/models/`.
  - Advanced financial math engines go in `server/services/`.
  - Input validation rules (using Joi) go in `server/validation/schemas.js`.
- **Machine Learning (`ml-service/`)**: FastAPI server in Python.
  - Model prediction logic resides in `ml-service/main.py`.
  - Explanations reside in `ml-service/explainer.py`.
  - Scenario backtesting resides in `ml-service/backtester.py`.

---

## 🏷️ Naming Conventions

To keep the codebase uniform, please follow these guidelines:

### JavaScript/React (Frontend & Backend)
- **Files**: CamelCase for React components (e.g., `HelpTourScreen.jsx`), camelCase for standard JS/routing files (e.g., `taxEngine.js`, `auth.js`).
- **Variables & Functions**: camelCase (e.g., `computeTax`, `savingPct`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `CESS_RATE`, `INSTRUMENT_PARAMS`).
- **Classes / Schemas**: PascalCase (e.g., `User`, `FinancialProfile`).

### Python (ML Microservice)
- **Functions & Variables**: snake_case (e.g., `get_shap_values`, `savings_rate`).
- **Classes**: PascalCase (e.g., `PredictionRequest`).
- **Files**: snake_case (e.g., `feature_engineering.py`).

---

## 🪙 How to Add a New Instrument Type

If you want to support a new asset class or specific investment instrument (e.g., a corporate bond or real estate REIT):

1. **Add parameters to single source of truth**:
   Open [instrumentConstants.js](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/server/services/instrumentConstants.js) and append your new instrument configuration inside the `staticParams` object:
   ```javascript
   REIT: {
     nominalRate: 9.5,         // Expected annual rate as percentage
     volatility: 0.08,         // Volatility as decimal
     expenseRatio: 0.012,      // Annual management fee
     riskLevel: 'Medium-High', // Risk category
     lockIn: 0,                // Minimum hold period in years
     name: 'Real Estate REIT',  // Display name
     tags: ['Property', 'Yield'] // Tag filters
   }
   ```
2. **Update the Frontend database counterpart**:
   If applicable, mirror the new key and parameters in `reactapp/src/investmentDatabase.js` to ensure the UI database displays the new asset option properly.
3. **Register tax rules**:
   Open [taxEngine.js](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/server/services/taxEngine.js) or [postTaxCalculator.js](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/server/services/postTaxCalculator.js) to specify how gains and yields on this new key are taxed under progressive slab rates or capital gains rules.

---

## 🔌 How to Add a New API Route

To create a new endpoint (for example, `/api/portfolio/rebalance`):

1. **Define the request validation schema**:
   Open [schemas.js](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/server/validation/schemas.js). Create and export a Joi schema specifying the required/optional request body or query params.
2. **Create/Update route controller**:
   Create a new JS file in `server/routes/` or edit an existing one. Use Joi validation middleware and async route wrapper:
   ```javascript
   import { Router } from 'express';
   import { validateBody } from '../validation/schemas.js';
   import { asyncHandler } from '../middleware/errorHandler.js';
   
   const router = Router();
   
   router.post('/rebalance', validateBody(rebalanceSchema), asyncHandler(async (req, res) => {
     // Perform operations
     res.json({ success: true });
   }));
   ```
3. **Register the router**:
   Import your route in [server.js](file:///c:/Users/prana/OneDrive/Desktop/WEALTHGENIEFV/server/server.js) and mount it on `/api`:
   ```javascript
   import rebalanceRouter from './routes/rebalance.js';
   // ...
   app.use('/api/portfolio', rebalanceRouter);
   ```

---

## 🧪 Testing Expectations

We strive to maintain a rock-solid, error-free system. We have **146 passing tests** across both Jest and Pytest.

When contributing:
- **No broken tests**: Ensure that you run the existing test suites before and after making your modifications.
- **Write unit tests**: If you introduce a new helper, route, or mathematical model, add matching Jest or Pytest test assertions.
- **Keep test commands simple**:
  - Jest Backend Tests: `cd server && npm run test`
  - Python ML Tests: `cd ml-service && pytest`

---

## ✍️ Code Comment Policy

We require **`BEGINNER NOTE:`** blocks on complex, non-obvious algorithms. 
- Explain **why** a mathematical optimization is implemented that way.
- Explain **what** financial terms mean in context (e.g. why we use a Newton-Raphson approximation for XIRR instead of a standard simple average).
- Do **not** remove existing JSDoc comments or python docstrings; beginner notes should be additive.
