# MindEeze

AI-native practice management for private-pay therapists, counsellors, and mental health practitioners.

## Features

- **Client Management**: Complete client profiles, intake forms, consent tracking, and secure document storage
- **Smart Scheduling**: Automated reminders, recurring appointments, and multi-timezone support
- **AI-Assisted Notes**: SOAP, DAP, and narrative templates with AI drafting (powered by Groq)
- **Invoicing**: Auto-generation, multi-currency support, Stripe & PayFast payment links
- **Questionnaires**: PHQ-9 and GAD-7 with automatic scoring and progress tracking
- **Reminders**: Automated SMS/email reminders for appointments and payment follow-ups
- **Dashboard**: Monthly income tracking, client overview, and appointment calendar

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- **Payments**: Stripe (global), PayFast (South Africa)
- **Email**: Resend
- **SMS**: Vonage
- **AI**: Groq (Llama 3.1 70B)
- **Speech**: OpenAI Whisper (for voice dictation)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (optional, for payments)
- PayFast account (optional, for South African payments)
- Resend account (for emails)
- Vonage account (for SMS)
- Groq API key (for AI features)

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd windsurf-project-3
```

### 2. Install dependencies

```bash
cd web
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations in the Supabase SQL editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
3. Enable Google OAuth in Supabase Auth settings
4. Copy your Supabase URL and anon key

### 4. Configure environment variables

Copy the example environment file:

```bash
cp web/.env.local.example web/.env.local
```

Add your credentials to `web/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key

# PayFast
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your-payfast-merchant-id
NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=your-payfast-merchant-key
NEXT_PUBLIC_PAYFAST_PASSPHRASE=your-payfast-passphrase

# Resend
RESEND_API_KEY=your-resend-api-key

# Vonage
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret
VONAGE_FROM_NUMBER=your-vonage-from-number

# Groq
GROQ_API_KEY=your-groq-api-key

# OpenAI (for Whisper)
OPENAI_API_KEY=your-openai-api-key
```

### 5. Run the development server

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Supabase Edge Functions

Deploy the reminder functions to Supabase:

```bash
npx supabase functions deploy send-appointment-reminders
npx supabase functions deploy send-payment-reminders
```

Set up cron jobs in Supabase to trigger these functions:
- `send-appointment-reminders`: Run hourly to check for appointments 48h away
- `send-payment-reminders`: Run daily to check for overdue invoices

## Database Schema

The application uses the following core tables:

- `therapists`: Therapist profiles and practice settings
- `practices`: Practice information
- `clients`: Client profiles with emergency contacts and GP details
- `appointments`: Scheduled sessions with reminder tracking
- `session_notes`: SOAP, DAP, and narrative notes with digital signing
- `invoices`: Billing with payment tracking
- `questionnaires`: PHQ-9 and GAD-7 assessments with scoring
- `documents`: Secure file storage

## Security

- Row-Level Security (RLS) policies ensure data isolation between therapists
- All API routes require authentication
- Session notes are locked 48 hours after signing
- GDPR and POPIA compliant data handling
- EU region hosting available

## Compliance

MindEeze is designed for:
- South Africa (POPIA compliant)
- United Kingdom (GDPR compliant)
- United Arab Emirates
- Australia
- Other international regions

**Note**: Insurance billing is not supported. This is designed exclusively for private-pay practitioners.

## Support

For issues or questions, please open an issue in the repository.

## License

Proprietary - All rights reserved.
