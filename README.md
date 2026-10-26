<h1 align="center">🔥 FLAME IN FREEFALL</h1>

<h3 align="center">
AI-Powered Research on Combustion Beyond Earth
</h3>

<p align="center">
  Exploring how flames behave in microgravity through NASA technical literature,
  source-grounded AI research, and scientific evidence analysis.
</p>

<p align="center">
  <a href="https://flame-in-freefall-two.vercel.app">
    <img src="https://img.shields.io/badge/🚀_LIVE_DEMO-Explore_App-00C853?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/DevanshSinghBais/flame-in-freefall">
    <img src="https://img.shields.io/badge/GitHub-View_Source-181717?style=for-the-badge&logo=github" alt="GitHub Repository">
  </a>
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

<p align="center">
  <a href="https://flame-in-freefall-two.vercel.app">
    <strong>🚀 Launch Flame in Freefall →</strong>
  </a>
</p>

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
| Deployment | Vercel |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js compatible with the installed Next.js version
- npm
- A Supabase project
- A Google Gemini API key for AI synthesis

### 1. Clone the Repository

```bash
git clone https://github.com/DevanshSinghBais/flame-in-freefall.git
cd flame-in-freefall
