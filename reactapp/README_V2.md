# WealthGenie — Complete Architecture & UI Overhaul (V2)

This README details the comprehensive architectural, financial logic, and design system overhaul made to the WealthGenie AI investment advisory platform. The update completely replaced generic legacy components with authoritative Indian financial logic (FY25 structures), robust safety fallbacks, and a stunning "glassmorphism" UI. 

**Note**: All core components like the landing splash animation, onboarding wizard, and sidebar layouts remain intact per strict constraints.

---

## 1. Authoritative 16-Instrument Financial Database
The `investmentDatabase.js` was expanded to accurately reflect Indian financial assets:
*   **Gold Split**: Separated out `Gold ETF` and `Sovereign Gold Bonds (SGB)`. SGB includes exact modeling of 2.5% annual interest + LTCG exemption on maturity.
*   **Updated Defaults**: Adjusted mutual fund and FD rates, lock-in periods, and risk assignments to match 2024-2025 actuals.
*   **Concentration Caps**: Hard limits introduced to prevent overexposure:
    *   Small-Cap MF: Max 15%
    *   Direct Equity / Mid-Cap MF: Max 20%
    *   Gold ETF / SGB: Max 10%

---

## 2. Advanced Tax Engine & Post-Tax Computation
The `postTaxEngine` now handles highly nuanced tax logic out-of-the-box.
*   **Dual Regime Support**: Full support for Old vs. New Tax Regime. Implemented dynamic toggles propagating from user profile to calculators.
*   **Section 87A Fix**: Added zero-tax rebate overrides for taxable income below ₹7L (New) or ₹5L (Old).
*   **Debt MF Slab Adjustment**: Accurate taxation calculation per 2023 Finance Act (interest taxed at slab rate, no indexation benefits).
*   **FD & TDS Awareness**: Returns are dynamically calculated computing applicable 10% TDS boundaries for standard users and senior citizens.
*   **NPS Separate Structure**: Computes standard 80C overlap alongside dedicated 80CCD(1B) ₹50,000 extra allocation.

---

## 3. Sophisticated Recommendation Algorithm
The recommendation engine (`recommendationEngine.js`) transitioned from a generic scorer to an expert rule-based gating system:
*   **Hard Gating**: Strict eligibility filters (e.g., Small-cap *only* opens if Age=21-45, Horizon>=10, High Risk, Income>=₹8L, Savings>=₹8k).
*   **Fallbacks**: Graceful fallback rules ensuring users *always* get safe, universal options (PPF, FD) if they enter extremely constrained demographics.
*   **Algorithmic Rationale (`getWhy`)**: The AI doesn't just score; it explains. Generates bespoke 3-4 sentence reasoning connecting user demographics (income/age) to why the tool specifically fits them.
*   **Proportional Redistribution**: Enforced concentration ceilings. If small-cap exceeds 15%, excess funds automatically redistribute linearly to highly ranked alternatives without violating bounds.

---

## 4. The Allocation Planner Module
Created the `AllocationPlanner` module featuring:
*   Interactive Donut visualizer summarizing total spread.
*   Manual Override Sliders (Equity/Debt/Alt) allowing users to force a percentage distribution which normalizes dynamically. 
*   **Blended Portfolio Post-Tax Metric**: Computes a continuous weighted average of post-tax yields across all selected investments.

---

## 5. Wealth Trajectory & Inflation Adjustments
*   **Nominal vs. Real Returns**: The main Projection dashboard features an **Inflation-Adjusted Toggle** allowing users to strip off a flat 6% real inflation penalty before compound growth calculations.
*   Tracks *Worst / Target / Best* case market scenarios plotted smoothly on `recharts` Area curves.

---

## 6. Design System, UX, and Accessibility Upgrades
*   **Skeleton Loaders**: Introduced shimmering CSS skeleton loader animations (`.skeleton-box`) deployed sequentially while the dashboard data resolves.
*   **Empty States**: Implemented graceful visual empty slates rather than raw text "no data" states.
*   **Responsive Tab Bar**: The desktop Sidebar smoothly collapses into a pinned bottom navigation tab-bar on mobile viewports (<768px). 
*   **Micro-interactions**: Enhanced UI interactivity with `translateY(-4px)` hover lifts along with custom glowing drop-shadows on all instrument cards and buttons.
*   **Accessibility Audits**: Verified WCAG Color contrast ratios. Specifically adjusted muted texts from `#64748b` to the highly legible `#94a3b8` and refactored high risk badges to pastel reds for dark-mode legibility. 
*   **Robust Stability**: Wraps main components in persistent React `ErrorBoundary` wrappers to intercept UI execution crashes and display a safe fallback "Something went wrong" without tearing down the entire app shell.

---
**Status**: Stable. Fully Integrated. Optimized for scaling.
