# AastaClean Enterprise Platform

This repository contains the production-grade AastaClean platform, an AI-powered bio-cleansing and silica-standard compliance engine.

## 🚀 Project Evolution & Phases

This project has been architected through 5 intensive development phases:

*   **Phase 1:** Foundation & Security Hardening (Audit, AES-256 implementation, IndexedDB optimization).
*   **Phase 2:** National Rollout Intelligence (WA/NSW/VIC/QLD competitive analysis, GEO/SEO/CRO Benchmarking).
*   **Phase 3:** Live Support Bridging (Chatwoot conversational integration with Hermes AI broker).
*   **Phase 4:** Mobile Ecosystem & B2B Expansion (Flutter-ready v2 API, JWT authentication, B2B wholesale portal blueprinting).
*   **Phase 5:** Final UX/UI Audit & Vercel Graduation (Native binary optimization, Vercel deployment configuration).

---

## 🛠️ Key Functional Modules

### 1. Semantic Grounding & Hyperlocal Analysis
*   **`AgentOrchestrator` & `SemanticGroundingService`:** Enables vector-based grounding of compliance data via Supabase `pgvector`.
*   **`CompetitiveAnalysisEngine`:** Automated AEO/GEO/SEO/CRO auditing utility.
*   **`WA_COMPETITIVE_DOMINANCE_REPORT.md`:** Strategic intelligence on national market positioning.

### 2. Pricing Engine
*   **`PricingCalculator`:** The single source of truth for all quote estimations, including regional multipliers and complex add-on logic.
*   **Validation:** Verified against 50+ high-complexity edge cases (`BACKTEST_RESULTS.md`).

### 3. API & Integration Layer
*   **`/api/v1/*`:** Backend endpoints for core booking, queues, and CRM sync.
*   **`/api/v2/flutter/*`:** Secured JWT-authenticated endpoints for mobile app support.
*   **Chatwoot Bridge:** Live support agent integration with automated AI fallback.

---

## 🏗️ Development & Deployment

### Prerequisites
*   Node.js v26+
*   Supabase instance (with `pgvector` enabled)
*   Gemini API Key

### Setup Instructions

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Copy `.env.example` to `.env` and configure:
    *   `GEMINI_API_KEY`
    *   `SUPABASE_URL`
    *   `SUPABASE_SERVICE_ROLE_KEY`
    *   `JWT_SECRET`
    *   `CORE_ENCRYPTION_SECRET` (Must be 32 chars)
3.  **Run Development:**
    ```bash
    npm run dev
    ```
4.  **Production Build:**
    ```bash
    npm run build
    npm start
    ```

---

## 📚 Technical Documentation
Detailed architectural blueprints and audit findings can be found in the `/docs` directory:
*   `SYSTEM_AUDIT_REPORT.md` - Full technical audit of API endpoints and security.
*   `ENTERPRISE_INTEGRATION_BLUEPRINT.md` - Backend integration roadmap (Twenty CRM, Payload CMS, etc.).
*   `BACKTEST_RESULTS.md` - Pricing engine validation documentation.
*   `plans/phase-4-architecture.md` - Mobile and international expansion roadmap.

---
*Maintained by Hermes - AASTACLEAN AI Architect*
