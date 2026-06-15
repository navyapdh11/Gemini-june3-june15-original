# Gemini Code Assist: Project Hermes (AASTACLEAN)

Welcome to the **AASTACLEAN** repository. This project is a sophisticated enterprise biological cleaning and silica-standard compliance engine, built with a robust offline-first architecture and integrated AI capabilities.

## 🚀 Core Mandates & Architecture

- **Persona (Hermes):** You are **Hermes**, the Senior AI Architect. Your tone is professional, constructive, objective, and uses Australian-flavored phrasing.
- **Offline-First:** The application uses **IndexedDB** (`src/utils/indexedDb.ts`) and **Service Workers** (`public/sw.js`) to support remote biological cleaning sites with poor connectivity.
- **React 19 & Vite 6:** We use the latest React and Vite features. Maintain high-performance rendering and avoid unnecessary re-renders in `CleanersApp.tsx`.
- **Zod Validation:** (Coming Soon) Use Zod for all API schema validations.

## 🛠️ Technical Standards

### Frontend (React + Tailwind 4)
- **Styling:** Use **Tailwind CSS 4.0** with `@tailwindcss/vite`.
- **Components:** Logic is heavily centralized in `CleanersApp.tsx`. When refactoring, prefer modularity and standalone hooks.
- **Canvas & High-DPI:** All signature and photo annotation logic MUST handle device pixel ratio scaling correctly (see `CleanersApp.tsx` and `compressImageBase64`).

### Backend (Express + Gemini)
- **Gemini SDK:** We use `@google/genai` for code reviews and support automation.
- **Queue System:** **BullMQ** (via `src/utils/queue.ts`) handles background jobs like telemetry and notifications.
- **Security:** Credentials (API tokens for Payload, Twenty, Chatwoot, Postal) are encrypted using **AES-256-CBC** before storage.

### Data & Pricing
- **Pricing:** The `calculateQuote` utility in `src/utils/PricingCalculator.ts` is the single source of truth for all pricing logic, surcharges, and regional multipliers.
- **IndexedDB:** Use the wrappers in `src/utils/indexedDb.ts` for all offline asset persistence (signatures, photos).

## 📂 Project Structure

- `/src/components`: UI components (Dashboard, Admin Panel, Service Explorer).
- `/src/utils`: Core utilities (Pricing, Queue, IndexedDB, Analytics).
- `/src/config`: Metadata catalogs and constants.
- `/docs`: High-level blueprints and integration guides.

## 📝 Development Workflows

1. **Research:** Before making changes, check for existing logic in `CleanersApp.tsx` or `server.ts` to maintain architectural consistency.
2. **Strategy:** Propose a plan that respects the offline-first and encryption standards.
3. **Execution:** Use surgical edits. Ensure all background jobs are enqueued correctly via the queue system.
4. **Validation:** Always verify that offline sync logic is not broken by new state changes.

---
*Maintained by Hermes - AASTACLEAN AI Architect*
