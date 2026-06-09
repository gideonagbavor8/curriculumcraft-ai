# CurriculumCraft AI 🇬🇭

> An AI-powered instructional design platform that helps Ghanaian JHS teachers instantly transform NaCCA Standards-Based Curriculum indicators into fully scaffolded lesson materials, visual content prompts, and interactive student activities.

**Built for the Microsoft Agents League Hackathon — Creative Apps Track**

🔗 **Live Demo**: [curriculumcraft-ai.vercel.app](https://curriculumcraft-ai.vercel.app)

---

## The Problem

Ghanaian Junior High School teachers spend hours every week manually converting dense NaCCA curriculum documents into lesson plans. The Standards-Based Curriculum (SBC) introduced by Ghana's National Council for Curriculum and Assessment (NaCCA) is rigorous and well-structured — but translating its indicators into classroom-ready materials is time-consuming and administratively burdensome.

Teachers in under-resourced schools outside Accra face this challenge with limited planning time, large class sizes of 40–60 students, and minimal support. CurriculumCraft AI eliminates that burden.

---

## The Solution

CurriculumCraft AI transforms any NaCCA curriculum indicator into three complete, classroom-ready outputs in seconds:

- **Teacher Notes** — lesson plan with timings, learning objectives, key vocabulary, common misconceptions, and differentiation tips
- **Visual Content Prompts** — 4 practical visual aids a teacher can create with minimal resources
- **Student Reading Material** — a Ghanaian-context reading passage with worked examples and comprehension questions

Every generated output uses authentic Ghanaian cultural context — local names (Ama, Kofi, Adjoa), local settings (Kumasi Central Market, Cape Coast, Ashanti cocoa farms), Ghana Cedis, and local foods.

---

## Three Views

### 1. Standard Map Dashboard
Browse the full NaCCA curriculum tree across 4 subjects and 3 grade levels (B7–B9). Every strand, sub-strand and indicator is searchable. Click any indicator to instantly launch the Lesson Builder.

### 2. Lesson & Material Builder
Select a subject, grade, strand and indicator. Configure lesson duration and class size. Generate complete teacher notes, visual prompts and student reading material — all grounded in the NaCCA curriculum via Microsoft Foundry IQ.

### 3. Interactive Activity Suite
Generate 5 multiple-choice questions (with interactive answer checking and explanations), 2 writing prompts with sample answers, and a 4-criterion assessment rubric — all aligned to the selected NaCCA indicator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API Routes (Server-side) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| AI Generation | GitHub Models API (gpt-4o-mini) |
| Microsoft IQ | Azure Microsoft Foundry IQ — grounding layer for NaCCA curriculum context |
| AI-Assisted Dev | GitHub Copilot (VS Code) |
| Deployment | Vercel |
| Language | TypeScript |

---

## Microsoft IQ Integration

This project integrates **Microsoft Foundry IQ** as the intelligence grounding layer for the Creative Apps track requirement.

### Architecture
Before generating lesson materials, the app queries the Microsoft Foundry IQ endpoint to retrieve grounded NaCCA curriculum context. This grounds the AI generation in actual curriculum standards, reducing hallucination and ensuring generated content is anchored to the real NaCCA SBC indicators.

### Implementation
The Foundry IQ integration is fully implemented in `app/api/generate/route.ts`:

```ts
// Foundry IQ grounding — retrieves relevant NaCCA context
async function getFoundryContext(
  indicatorCode: string,
  indicatorText: string,
  subject: string
): Promise<string | null>
```

The integration:
- Calls the Agents League Foundry IQ hub endpoint
- Requests curriculum-specific context for the selected NaCCA indicator
- Passes the grounded context to the generation layer as additional prompt context
- Gracefully falls back to direct generation if the endpoint is unavailable

### Foundry IQ Endpoint
- **Hub**: `hub-agents-league.services.ai.azure.com`
- **Project**: `proj-default`
- **Endpoint**: `https://hub-agents-league.services.ai.azure.com/api/projects/proj-default`

### Environment Variables Required
```env
AZURE_FOUNDRY_ENDPOINT=https://hub-agents-league.services.ai.azure.com/api/projects/proj-default
AZURE_FOUNDRY_API_KEY=your_foundry_api_key_here
AZURE_FOUNDRY_PROJECT_ID=proj-default
```

### Note on Quota
The Agents League Foundry hub operates with shared quota across all hackathon participants. During periods of high demand or quota exhaustion, the app gracefully degrades to direct generation while maintaining full functionality. The Foundry IQ integration code remains active and will utilize grounding when quota is available.

---

## GitHub Copilot Usage

GitHub Copilot was used throughout the development of this project in VS Code:

- **Database schema** — Copilot generated the Drizzle ORM schema for the 5-table NaCCA curriculum database
- **API routes** — All four API routes scaffolded with Copilot inline completions
- **TypeScript types** — Full type definitions generated via Copilot Chat
- **Component structure** — SubjectSelector, SectionCard, MarkdownRenderer components built with Copilot suggestions
- **Prompt engineering** — System prompts in `prompts/lesson.ts` and `prompts/activity.ts` refined with Copilot
- **Bug fixes** — ESLint and TypeScript errors resolved using Copilot Chat explanations

---

## NaCCA Curriculum Coverage

| Subject | Grades | Strands |
|---|---|---|
| Mathematics | B7, B8, B9 | Number & Numeration, Algebra, Geometry & Measurement, Statistics & Probability |
| Science | B7, B8, B9 | Life Sciences, Physical Sciences, Earth & Space |
| English Language | B7, B8, B9 | Reading & Comprehension, Writing, Grammar & Usage, Literature |
| Computing | B7, B8, B9 | Computing Systems, Data & Information, Programming & Algorithms, Digital Citizenship |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Neon PostgreSQL database
- A GitHub Personal Access Token with `models` permission
- An Azure AI Foundry project endpoint and API key

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/curriculumcraft-ai.git
cd curriculumcraft-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your keys in .env.local

# Push database schema
npm run db:push

# Seed NaCCA curriculum data
npm run db:seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Environment Variables

```env
DATABASE_URL=your_neon_connection_string
GITHUB_MODELS_TOKEN=your_github_pat_with_models_permission
AZURE_FOUNDRY_ENDPOINT=your_foundry_project_endpoint
AZURE_FOUNDRY_API_KEY=your_foundry_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Architecture

```
User (Ghanaian Teacher)
        │
        ▼
Next.js 15 Frontend (Vercel)
├── Standard Map Dashboard
├── Lesson & Material Builder
└── Interactive Activity Suite
        │
        ▼
Next.js API Routes
├── /api/curriculum     → Neon PostgreSQL (NaCCA seed data)
├── /api/generate       → Foundry IQ grounding → GitHub Models (gpt-4o-mini)
├── /api/generate/activity → GitHub Models (gpt-4o-mini)
└── /api/lessons        → Neon PostgreSQL (saved lessons)
        │
        ├── Microsoft Foundry IQ (grounding layer)
        └── GitHub Models API (generation layer)
```

---

## Impact

CurriculumCraft AI directly addresses teacher burnout in Ghana's JHS system by eliminating hours of manual lesson planning. With 4 subjects, 3 grade levels, and 50+ NaCCA indicators covered, the platform can support thousands of Ghanaian teachers — particularly those in under-resourced schools outside major cities who lack curriculum support infrastructure.

---

## License

MIT © 2026 — Built with ❤️ for Ghana's teachers