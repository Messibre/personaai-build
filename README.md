# PersonaAI

**Generate stunning portfolio websites from your GitHub, resume, and Notion in seconds using AI — deploy to Vercel in one click.**

PersonaAI is an AI-powered portfolio generator that creates beautiful, responsive, and professional portfolio websites. Simply connect your GitHub profile, upload your resume, and let AI craft a personalized portfolio that showcases your work. When you're ready, deploy it live to Vercel instantly.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Messibre/personaai-build)

## Features

### Data Sources
- **GitHub Integration** — Automatically fetches your profile, repositories, README content, contribution stats, and detected technologies
- **Resume Parsing** — Upload a PDF resume and extract skills, experience, education, and professional highlights
- **Notion Import** — Optionally import content from public Notion pages for richer bios and project descriptions

### 14 Premium Templates
Choose from professionally designed, fully responsive templates:

| Template | Style |
|----------|-------|
| **Bold Portrait** | Full-screen photo hero with massive typography overlay and stats counters |
| **Typographic** | Oversized text behind your portrait, minimal white-space driven layout |
| **Split Editorial** | Dark/light split layout with dramatic B&W portrait, editorial magazine feel |
| **Pastel Creative** | Soft color blocks, playful contemporary card-based project showcase |
| **Designer & Coder** | Half design, half code split concept with colorful portrait center-stage |
| **Minimal Clean** | Ultra-clean whitespace, refined typography, subtle grid and elegant details |
| **Brutalist** | Raw, high-contrast, bold borders and oversized typography |
| **Glassmorphism** | Frosted glass cards over vivid blurred gradients |
| **Terminal** | Command-line aesthetic with monospace fonts and syntax-highlighted blocks |
| **Liquid Glass** | Animated floating orbs with ultra-refined backdrop-blur glass cards |
| **Cyberpunk Noir** | Glitch typography, scan lines, corner brackets and neon accents |
| **Bento Grid** | Mosaic of asymmetric cards — photo, bio, stats, and projects in one view |
| **Spotlight Dark** | Cursor-following radial spotlight with numbered project list |
| **Swiss Editorial** | Grid discipline, heavy typography, stark black-and-white with one bold accent |
| **Gradient Aurora** | Animated aurora light bands with centered layout |

### AI-Powered Generation
- Uses **Google Gemini 2.5 Flash** for intelligent content generation
- AI writes personalized bios, project descriptions, and taglines based on your GitHub activity and resume
- Real-time streaming preview — watch your portfolio generate live
- Smart fallbacks with real-looking content when AI is unavailable

### Customization
- **8 Color Schemes** — From professional blues to vibrant gradients
- **Photo Upload** — Add your own portrait photo
- **Section Toggle** — Show/hide About, Skills, Projects, Experience, GitHub Stats, Contact
- **Target Role** — Specify your desired job role for tailored content
- **Light/Dark Mode** — Full theme support with smooth transitions

### One-Click Deploy to Vercel
- **Instant Deployment** — Deploy your generated portfolio to Vercel with a single click
- **Production Ready** — Get a live `.vercel.app` URL immediately
- **No Config Needed** — Zero configuration required, just click deploy

### Export Options
- Copy raw HTML to clipboard
- Download as standalone HTML file
- Continue editing in v0

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash
- **PDF Parsing**: pdf-parse (serverless-compatible)
- **Animations**: tw-animate-css
- **Theme**: next-themes
- **Analytics**: Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Environment Variables

Create a `.env.local` file with:

```env
# Required for AI content generation
GEMINI_API_KEY_1=your_gemini_api_key
GEMINI_API_KEY_2=your_backup_gemini_api_key  # Optional, for failover

# Required for one-click deploy feature
VERCEL_TOKEN=your_vercel_token
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
Get your Vercel token from [Vercel Account Settings](https://vercel.com/account/tokens).

### Installation

```bash
# Clone the repository
git clone https://github.com/Messibre/personaai-build.git
cd personaai-build

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How It Works

1. **Enter GitHub Username** — We fetch your public profile, top repositories, and README content
2. **Specify Target Role** — Tell us what role you're targeting for tailored AI content
3. **Upload Resume (Optional)** — PDF parsing extracts your professional background
4. **Add Notion URL (Optional)** — Import additional content from public Notion pages
5. **Customize** — Choose a template, color scheme, and toggle sections
6. **Generate** — AI creates a complete, standalone HTML portfolio with personalized content
7. **Deploy** — One-click deploy to Vercel or export as HTML

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── ai-content/    # AI content generation (bio, projects, tagline)
│   │   ├── deploy/        # Vercel deployment endpoint
│   │   ├── generate/      # Portfolio HTML generation
│   │   ├── github/        # GitHub API proxy with README fetching
│   │   ├── notion/        # Notion content fetcher
│   │   └── parse-resume/  # PDF resume parser (serverless-compatible)
│   ├── globals.css        # Tailwind + theme variables
│   ├── layout.tsx         # Root layout with providers + analytics
│   └── page.tsx           # Landing page with wizard shell
├── components/
│   ├── portfolio/         # Portfolio preview and editor
│   ├── ui/                # 50+ shadcn/ui components
│   └── wizard/            # Multi-step wizard components
│       ├── step-start.tsx
│       ├── step-github.tsx
│       ├── step-target-role.tsx
│       ├── step-resume.tsx
│       ├── step-notion.tsx
│       ├── step-customize.tsx
│       ├── step-preview.tsx
│       └── wizard-shell.tsx
├── lib/
│   ├── gemini.ts          # Gemini API client with key rotation
│   ├── github.ts          # GitHub API helpers + repo enrichment
│   ├── templates.ts       # 14 portfolio HTML templates
│   ├── types.ts           # TypeScript definitions
│   └── utils.ts           # Utility functions
└── public/
    └── icon.svg           # App favicon
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github` | POST | Fetches GitHub profile, repositories, and README content |
| `/api/parse-resume` | POST | Parses PDF resume and extracts text (serverless-compatible) |
| `/api/notion` | POST | Fetches public Notion page content |
| `/api/ai-content` | POST | Generates AI bio, project descriptions, and tagline |
| `/api/generate` | POST | Builds complete portfolio HTML from template |
| `/api/deploy` | POST | Deploys portfolio to Vercel and returns live URL |


## License

MIT

---

