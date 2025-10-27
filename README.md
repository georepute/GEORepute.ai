# GeoRepute.ai - AI-Driven Generative Optimization System

Next-generation, AI-driven visibility control across traditional SEO and emerging AI search ecosystems.

## 🚀 Features

- **Split-View LIVE Dashboard**: Real-time AI/Google search alongside rankings
- **AI Visibility Tracking**: Monitor presence across GPT, Gemini, Perplexity, and 50+ platforms
- **Self-Learning GEO Core**: Continuous AI optimization
- **Content Orchestrator**: Multi-stage approval workflow
- **Keyword Forecast Engine**: Predictive AI with ROI forecasts
- **50+ BI Reports**: Comprehensive analytics with PDF/CSV exports
- **Video Reports**: Auto-generated with AI narration
- **White-Label Ready**: Custom branding for agencies

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/georepute-ai.git
cd georepute-ai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
GEORepute.ai/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Marketing pages
│   │   ├── page.tsx       # Home
│   │   ├── about/         # About page
│   │   ├── systems/       # Our Systems
│   │   └── contact/       # Contact page
│   ├── dashboard/         # Dashboard app
│   │   ├── layout.tsx     # Dashboard layout
│   │   ├── page.tsx       # Dashboard home
│   │   ├── keywords/      # Keywords tracking
│   │   ├── content/       # Content orchestrator
│   │   └── reports/       # Reports & analytics
│   ├── login/             # Authentication
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/                   # Utility functions
│   └── utils.ts
├── public/                # Static assets
└── README.md
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#0ea5e9)
- **Accent**: Purple/Pink (#d946ef)
- **Success**: Green
- **Warning**: Yellow
- **Error**: Red

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, gradient text for emphasis
- **Body**: Regular weight, comfortable line-height

## 🌐 Pages

### Marketing Website
- **Home** (`/`): Hero, features, how it works, CTA
- **About** (`/about`): Mission, vision, values, team
- **Our Systems** (`/systems`): Detailed feature breakdown
- **Contact** (`/contact`): Contact form and information

### Dashboard
- **Overview** (`/dashboard`): Stats, charts, keyword performance
- **Keywords** (`/dashboard/keywords`): Keyword tracking and forecasts
- **Content** (`/dashboard/content`): Content orchestration
- **Reports** (`/dashboard/reports`): 50+ report library
- **AI Visibility** (planned): AI platform tracking
- **Rankings** (planned): Ranking trends
- **Settings** (planned): User preferences

## 🔐 Authentication

Google SSO integration ready. Email/password authentication flow implemented.

## 📊 Key Components

### Dashboard
- Real-time visibility metrics
- Multi-platform tracking
- AI-powered forecasts
- Interactive charts (Recharts)

### Content Orchestrator
- Multi-stage approval workflow
- Platform-specific optimization
- Scheduled publishing
- Performance tracking

### Reports
- 50+ pre-built reports
- PDF/CSV/Google Sheets export
- Email scheduling
- White-label branding

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

```bash
npm run build
```

### Environment Variables

See `.env.example` for required variables.

## 🔧 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📧 Support

- Email: support@georepute.ai
- Documentation: https://docs.georepute.ai
- Community: https://community.georepute.ai

---

Built with ❤️ for the future of AI-driven visibility optimization.
