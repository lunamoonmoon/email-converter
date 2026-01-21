# Email (.eml) → PDF/HTML/ZIP Converter

Converts uploaded .eml email files to PDF and/or HTML using CDOGS (Carbone.io),  
includes original attachments, and returns everything in a ZIP archive.

## Tech Stack
- Runtime: Bun
- Email parsing: mailparser
- HTTP: native Bun.serve
- Rendering: CDOGS (BC Gov)
- ZIP: archiver

## Setup

```bash
bun install
cp .env.example .env          # fill in CDOGS credentials
bun run src/index.ts
# or with auto-reload
bun --watch src/index.ts
