<h1 align="center">🔥 FLAME IN FREEFALL</h1>

<h3 align="center">
AI-Powered Research on Combustion Beyond Earth
</h3>

<p align="center">
  Exploring how flames behave in microgravity through NASA technical literature,
  source-grounded AI research, and scientific evidence analysis.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-Authentication%20%26%20Data-3FCF8E?logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/NASA%20NTRS-Research%20Data-0B3D91" alt="NASA NTRS">
  <img src="https://img.shields.io/badge/AI-Gemini-8E75FF?logo=googlegemini" alt="Gemini">
</p>

<p align="center">
  <strong>Discover the evidence. Connect the findings. Understand fire in microgravity.</strong>
</p>

---

## 🚀 The Mission

Fire behaves differently when gravity is reduced.

On Earth, buoyancy-driven convection strongly influences flame shape, heat transfer, and the movement of combustion products. In microgravity, these effects change, creating a different environment for studying flame structure, combustion behavior, and soot formation.

Understanding these differences matters for spacecraft fire safety, future space missions, and fundamental combustion science.

**Flame in Freefall** is an aerospace-themed research platform designed to make this scientific literature easier to explore, compare, and interpret.

Instead of treating AI-generated answers as facts, the platform connects research discovery with traceable source records and explicit evidence limitations.

## ✨ What It Does

### 🔬 NASA Research Explorer

Search technical literature indexed by NASA's Technical Reports Server (NTRS).

- Search for microgravity combustion, flame structure, soot formation, and related topics.
- Explore research records and abstracts.
- Navigate paginated results.
- Open source-linked research details.
- Inspect publication metadata and original records.

### 🤖 AI Research Assistant

Ask research questions and retrieve relevant NASA records for closer examination.

The intended workflow combines source retrieval, evidence selection, AI synthesis, and citation validation.

- Retrieves real research records before attempting synthesis.
- Preserves source metadata and report identifiers.
- Validates generated citations against retrieved records.
- Distinguishes published evidence from AI interpretation.
- Preserves research results when the AI provider fails.
- Avoids presenting unvalidated AI output as established scientific evidence.

**Scientific integrity comes first:** when synthesis fails or the available sources are insufficient, the application reports the limitation instead of inventing a conclusion.

### 📚 Personal Research Library

Keep relevant research organized in one workspace.

- Save research papers.
- Retrieve saved records across sessions.
- Organize papers into research collections.
- Manage collection membership.
- Maintain personal research notes.

Authenticated data is backed by Supabase, with ownership protections and Row-Level Security (RLS).

### 🧪 Experiment Comparison

Select research records and compare the metadata and experimental properties actually available in those records.

Missing measurements remain missing; the interface does not infer values merely to complete a comparison.

### 🌌 Scenario Explorer

Explore research assumptions through an interactive worksheet.

The current tool records and exports user-selected assumptions. It is **not a validated combustion solver or a predictive NASA simulation**.

### 📊 Scientific Analytics

Explore publication metadata and coverage within the available research corpus.

The current analytics focus on information the indexed records actually provide rather than fabricating experimental measurements or outcome charts.

### 🧭 Evidence-Gap Exploration

Investigate which topics, conditions, or metadata fields are represented in the available search results.

An apparent gap in the indexed corpus is not proof that scientific research on that subject does not exist.

### 🔐 Authenticated Research Workspace

The application includes account registration, sign-in, email-verification and recovery flows, protected workspace pages, personal settings, and user-specific research data.

---

## 🛰️ How It Works

The research workflow is built around source traceability.

| Stage | Purpose |
|---|---|
| Research question | Defines the scientific topic to investigate |
| Query generation | Produces concise, relevant search terms |
| NASA NTRS retrieval | Retrieves real technical research records |
| Record consolidation | Deduplicates records using their identifiers |
| Source selection | Selects available records and abstracts for further analysis |
| AI synthesis | Attempts to synthesize the retrieved evidence using Gemini |
| Citation validation | Checks generated source references against the records supplied |
| Research presentation | Displays the answer, supporting sources, or an honest failure state |

The pipeline keeps the original research records separate from AI interpretation.

The availability of source records does not guarantee that every question can be answered conclusively.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, custom responsive design |
| Icons | Lucide React |
| Authentication | Supabase Auth, Supabase SSR |
| Database | PostgreSQL through Supabase |
| Data security | Row-Level Security and owner-scoped access policies |
| Research source | NASA Technical Reports Server (NTRS) |
| AI synthesis | Google Gemini API |
| Validation | Automated tests, TypeScript checks, citation validation |
| Development | Node.js, npm, Git, GitHub |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js compatible with the installed Next.js version
- npm
- A Supabase project
- A Google Gemini API key for AI synthesis

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/flame-in-freefall.git
cd flame-in-freefall
```

Replace `YOUR_GITHUB_USERNAME` with the repository owner's GitHub username.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

If `.env.example` is not present in the repository, create `.env.local` manually using the variable names below.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

GEMINI_API_KEY=
GEMINI_SYNTHESIS_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

Fill in the values from your own Supabase and Google AI Studio projects.

**Never commit `.env.local` or expose API keys in client-side code.**

The Gemini API key must remain server-side. AI synthesis may be unavailable when the provider experiences quota, availability, or timeout errors.

### 4. Configure Supabase

Configure Supabase Auth for your local development origin.

For a development server running at `http://localhost:3000`, configure the local Site URL and allow the appropriate callback and recovery redirects.

If Next.js starts on another port, keep the application URL and authentication redirect configuration aligned.

Apply the database migrations included in the repository only after verifying the target Supabase project and reviewing the migration files.

For a separately configured Supabase project, the Supabase CLI workflow is:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Replace `YOUR_PROJECT_REF` with the intended project's reference.

Review the target and pending migrations before applying them. Do not run this procedure against an unrelated production database.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL reported by Next.js, normally:

http://localhost:3000

If that port is occupied, Next.js may select another available port.

---

## 🧪 Quality Checks

Run the available project checks before submitting changes or preparing a deployment.

### Automated tests

```bash
npm test
```

### TypeScript

```bash
npm run typecheck
```

### Production build

```bash
npm run build
```

The automated suite covers application logic, research-workspace behavior, authentication helpers, Gemini reliability handling, and citation validation.

Passing automated tests does not establish that every external service is available or that every authenticated workflow has been tested against a live deployment.

---

## 🔐 Security Principles

Flame in Freefall is designed to keep account data and provider credentials protected.

- API keys remain server-side.
- Authentication is enforced for protected features.
- User-specific records rely on Supabase ownership policies and RLS.
- Generated citation references are validated against retrieved records.
- Provider failures do not justify bypassing evidence validation.
- Environment files and generated build output should not be committed.
- Database changes should be applied only to the intended Supabase project.

Never disable RLS or expose service-role credentials to make a feature work.

---

## 🔭 Current Limitations

This project is an evolving research platform, and its limitations are documented explicitly.

**Gemini availability:** The synthesis integration is implemented, but live requests have intermittently returned upstream HTTP 503 and HTTP 504 errors. When this occurs, the application preserves the retrieved NASA records and does not display an unvalidated conclusion.

**Evidence availability:** NASA NTRS metadata and abstracts do not necessarily contain every experimental measurement required for a rigorous quantitative comparison.

**Scenario exploration:** The current scenario tool records assumptions; it does not run a validated combustion solver.

**Scientific analytics:** The current analysis focuses on available publication metadata rather than a comprehensive structured experimental-measurement dataset.

**Evidence coverage:** Search results represent the corpus inspected by the application and should not be interpreted as an exhaustive review of all scientific literature.

These limitations are important to the project's research integrity. An unavailable calculation, missing measurement, or failed AI request should never be disguised as a scientific result.

---

## 🎯 Project Goals

Flame in Freefall aims to make microgravity combustion research more accessible through:

- Traceable research discovery
- Source-grounded AI interpretation
- Personal literature organization
- Transparent evidence limitations
- Reproducible research workflows
- Careful separation of measurements, assumptions, and generated interpretations

The long-term direction is to support richer structured experimental datasets, validated quantitative comparisons, and more advanced combustion research workflows as suitable data becomes available.

---

## 📌 Disclaimer

Flame in Freefall is an independent research software project. It is not an official NASA product and is not endorsed by NASA.

NASA NTRS is used as a source of technical research records. Scientific conclusions should be checked against the original publications and their limitations.

---

<p align="center">
  <strong>FLAME IN FREEFALL</strong><br>
  <em>Understanding combustion beyond Earth.</em>
</p>
