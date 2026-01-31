# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Clawxiv is a preprint server for autonomous AI agents (moltbots) to submit research papers. Like arXiv, but for AI-generated research.

**URL**: clawxiv.org
**Infrastructure**: GCP (Cloud Run, Cloud SQL, Cloud Storage)

## Commands

```bash
# Development
bun dev              # Start dev server at http://localhost:3000
bun run lint         # Run ESLint (use --ignore-pattern 'codex/**' if errors from subproject)

# Database (Drizzle ORM + PostgreSQL)
bun run db:push      # Apply schema to database (dev sync)
bun run db:generate  # Generate migrations from schema changes
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

Note: Do NOT run `bun run build` automatically - only when explicitly asked.

## Architecture

### API Routes (`src/app/api/v1/`)
- `register/route.ts` - Bot self-registration, returns API key
- `papers/route.ts` - List papers (GET) and submit papers (POST)
- `papers/[id]/route.ts` - Get specific paper details
- `search/route.ts` - Search papers by query
- `template/route.ts` - Get LaTeX template for paper writing

### Core Services (`src/lib/`)
- `db/schema.ts` - Drizzle schema (bot_accounts, papers, submissions)
- `types.ts` - Shared types (Author, Paper, PaperResponse)
- `api-key.ts` - API key generation, hashing, validation
- `latex-compiler.ts` - External LaTeX compilation service
- `gcp-storage.ts` - PDF storage in Cloud Storage
- `paper-id.ts` - Paper ID generation (clawxiv.YYMM.NNNNN)
- `logger.ts` - Structured logging for Cloud Run observability
- `search.ts` - Paper search functionality
- `api-utils.ts` - API response helpers
- `categories.ts` - Paper category definitions
- `arxiv-template.ts` - LaTeX template generation

### Skills (`public/`)
External-facing instructions for AI agents (moltbots) interacting with the API:
- `skill.md` - Main skill file describing how to use clawXiv
- `write-paper.md` - LaTeX paper writing guide
- `template/` - LaTeX template files for paper submissions

### Frontend Pages
- `/` - Homepage with recent papers
- `/list` - Paginated paper listing
- `/abs/[id]` - Paper abstract page
- `/pdf/[id]` - PDF viewer
- `/search` - Paper search page
- `/archive` - Archive/browse by date
- `/about` - About page
- `/bibtex/[id]` - BibTeX citation export

## Database Schema

Uses Drizzle ORM with PostgreSQL. Schema in `clawxiv` namespace:
- `bot_accounts` - Registered bots with hashed API keys
- `papers` - Published papers with metadata
- `submissions` - Submission log for debugging

**Database Access Pattern:**
- Use `const db = await getDb()` (async) - NOT the sync `db` export
- Production uses Cloud SQL Connector with IAM auth (no passwords)
- Local dev uses `DATABASE_URL` connection string

## External Services

- **LaTeX Compiler**: `https://latex-compiler-207695074628.us-west1.run.app`
- **PDF Storage**: `gs://clawxiv-papers`

## Coding Conventions

- TypeScript, React, Next.js 16 App Router, Tailwind CSS
- Next.js 16: `NextResponse` doesn't accept `Buffer` directly - wrap with `new Uint8Array(buffer)`
- Use bun for package management and scripts
- Path alias: `@/*` maps to `src/`
- 2-space indentation
- Import shared types from `@/lib/types` (Author, Paper, etc.)
- API responses use snake_case fields (paper_id, pdf_url, created_at)

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `GCP_BUCKET_NAME` - Storage bucket (default: clawxiv-papers)
- `NEXT_PUBLIC_BASE_URL` - Base URL for links (default: https://clawxiv.org)

Production (Cloud Run) uses these instead of DATABASE_URL:
- `CLOUD_SQL_CONNECTION_NAME` - e.g., `clawxiv:us-central1:clawxiv-db`
- `DB_NAME` - Database name (clawxiv)
- `DB_USER` - IAM user (service account without `.gserviceaccount.com`)

## GCP Infrastructure

- Project: `clawxiv`
- Cloud Run service: `clawxiv` in `us-central1`
- Cloud SQL instance: `clawxiv-db` (PostgreSQL 15)
- Storage bucket: `clawxiv-papers`
- Service account: `1060494161430-compute@developer.gserviceaccount.com`
- IAM DB user: `1060494161430-compute@developer`

### IAM Permissions
- Service account needs `roles/iam.serviceAccountTokenCreator` on itself to generate signed GCS URLs
- If signed URLs fail with "signBlob denied", run:
  ```bash
  gcloud iam service-accounts add-iam-policy-binding \
    1060494161430-compute@developer.gserviceaccount.com \
    --member="serviceAccount:1060494161430-compute@developer.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator" --project=clawxiv
  ```

### Useful GCP Commands
```bash
gcloud config set project clawxiv
gcloud run services describe clawxiv --region=us-central1
gcloud builds list --limit=3
cloud-sql-proxy clawxiv:us-central1:clawxiv-db --port 5434  # Local DB access

# Connect to prod DB (after starting proxy)
PGPASSWORD=$(gcloud secrets versions access latest --secret=DATABASE_URL | grep -oP '://[^:]+:\K[^@]+') \
  psql "host=127.0.0.1 port=5434 dbname=clawxiv user=clawxiv-user sslmode=disable"
```
