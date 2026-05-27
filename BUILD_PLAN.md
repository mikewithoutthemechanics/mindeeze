# MindEeze Build Plan

## Project Overview
MindEeze is an AI-native practice management platform for private-pay therapists globally. This document outlines the complete build strategy from Phase 0 (Foundation) through Phase 4 (Scale).

## Technical Stack

### Frontend
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Zustand for complex state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics dashboards
- **Date Handling**: date-fns + tzdata for timezone support

### Backend
- **Database**: Supabase (PostgreSQL 15)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Storage**: Supabase Storage (per-therapist buckets)
- **Realtime**: Supabase Realtime for live updates
- **Edge Functions**: Supabase Edge Functions (Deno)
- **API Layer**: Supabase client + custom Edge Functions

### External Services
- **Payments**: Stripe (global) + PayFast (South Africa)
- **Email**: Resend
- **SMS**: Vonage (formerly Nexmo)
- **AI/LLM**: Groq (Llama 3.1 70B or Mixtral 8x7B)
- **Speech-to-Text**: OpenAI Whisper API
- **Video**: Daily.co (Phase 3)
- **PDF Generation**: react-pdf or @react-pdf/renderer

### Infrastructure
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)
- **Environment**: EU region (Frankfurt) for GDPR compliance
- **CI/CD**: GitHub Actions + Vercel automatic deployments
- **Monitoring**: Vercel Analytics + Supabase Logs

## Project Structure

```
mindeeze/
├── apps/
│   └── web/                      # Next.js web application
│       ├── app/
│       │   ├── (auth)/           # Auth pages (login, signup, onboarding)
│       │   ├── (dashboard)/      # Main dashboard layout
│       │   ├── api/              # API routes
│       │   ├── clients/          # Client management
│       │   ├── appointments/    # Scheduling
│       │   ├── notes/            # Session notes
│       │   ├── invoices/         # Invoicing
│       │   └── settings/         # Settings
│       ├── components/
│       │   ├── ui/               # shadcn/ui components
│       │   ├── clients/          # Client-related components
│       │   ├── appointments/     # Appointment components
│       │   ├── notes/            # Note components
│       │   └── invoices/         # Invoice components
│       ├── lib/
│       │   ├── supabase/         # Supabase client setup
│       │   ├── stripe/           # Stripe integration
│       │   ├── payfast/          # PayFast integration
│       │   ├── resend/           # Email templates
│       │   ├── vonage/           # SMS integration
│       │   └── utils/            # Utility functions
│       └── public/
├── packages/
│   ├── database/                 # Database migrations and types
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── types/
│   ├── shared/                   # Shared utilities and types
│   └── config/                   # Shared configuration
├── supabase/
│   ├── functions/                # Edge Functions
│   │   ├── send-reminder/
│   │   ├── generate-invoice/
│   │   ├── ai-note-draft/
│   │   └── webhook-stripe/
│   └── migrations/               # SQL migrations
└── docs/
    ├── api/                      # API documentation
    ├── database/                 # Database schema docs
    └── deployment/               # Deployment guides
```

## Database Schema

### Core Tables

#### therapists
```sql
CREATE TABLE therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  practice_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  currency TEXT NOT NULL DEFAULT 'ZAR',
  regulatory_region TEXT NOT NULL, -- 'ZA', 'UK', 'UAE', 'AU', etc.
  subscription_tier TEXT NOT NULL DEFAULT 'starter', -- 'starter', 'solo_pro', 'group'
  subscription_status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'cancelled'
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### practices
```sql
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### practice_members
```sql
CREATE TABLE practice_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES practices(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, therapist_id)
);
```

#### clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  practice_id UUID REFERENCES practices(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  email TEXT,
  phone TEXT,
  emergency_contact JSONB, -- {name, phone, relationship}
  gp_details JSONB, -- {name, practice, phone}
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'waitlist', 'on_hold', 'discharged'
  gdpr_consent_date TIMESTAMPTZ,
  popia_consent_date TIMESTAMPTZ,
  intake_form_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### appointments
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  session_type TEXT NOT NULL, -- 'individual', 'couple', 'family', 'group'
  location_type TEXT NOT NULL, -- 'in_person', 'online', 'phone'
  location_details TEXT,
  fee DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'no_show', 'cancelled'
  notes_id UUID REFERENCES session_notes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reminder_sent_at TIMESTAMPTZ,
  reminder_sent_48h BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### session_notes
```sql
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL, -- 'soap', 'dap', 'narrative'
  content JSONB NOT NULL, -- Encrypted at application layer
  signed_at TIMESTAMPTZ,
  signed_by TEXT, -- Therapist name
  ai_draft_used BOOLEAN DEFAULT FALSE,
  ai_draft_content JSONB,
  amendment_log JSONB DEFAULT '[]', -- [{timestamp, changed_by, reason, changes}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  payment_method TEXT, -- 'stripe', 'payfast', 'cash', 'eft', 'manual'
  stripe_payment_intent_id TEXT,
  payfast_payment_id TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  reminder_sent_7d BOOLEAN DEFAULT FALSE,
  reminder_sent_14d BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### questionnaires
```sql
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'phq9', 'gad7', 'wemwbs'
  responses JSONB NOT NULL,
  score INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security Policies

All tables will have RLS policies ensuring therapists can only access their own data:

```sql
-- Enable RLS
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Therapist can only access their own record
CREATE POLICY "Therapists can view own record" ON therapists
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Therapists can update own record" ON therapists
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Therapist can only access their own clients
CREATE POLICY "Therapists can view own clients" ON clients
  FOR SELECT USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can insert own clients" ON clients
  FOR INSERT WITH CHECK (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can update own clients" ON clients
  FOR UPDATE USING (therapist_id::text = auth.uid()::text);

CREATE POLICY "Therapists can delete own clients" ON clients
  FOR DELETE USING (therapist_id::text = auth.uid()::text);

-- Similar policies for appointments, session_notes, invoices, etc.
```

## Phase 0: Foundation (Weeks 1-2)

### Week 1 Tasks
1. **Project Initialization**
   - Create Next.js project with TypeScript
   - Install and configure Tailwind CSS
   - Set up shadcn/ui components
   - Configure ESLint and Prettier
   - Set up Git repository with proper .gitignore

2. **Supabase Setup**
   - Create Supabase project in EU region
   - Configure environment variables (.env.local)
   - Set up Supabase client in Next.js
   - Create database schema migrations
   - Implement RLS policies
   - Test authentication flow

3. **Authentication**
   - Implement email/password registration
   - Implement email verification
   - Set up Google OAuth
   - Create protected route middleware
   - Build login/signup pages

### Week 2 Tasks
4. **Payment Integration**
   - Set up Stripe account
   - Configure Stripe webhook endpoints
   - Implement Stripe client in Next.js
   - Set up PayFast account (South Africa)
   - Configure PayFast ITN (Instant Transaction Notification)
   - Create payment processing Edge Functions

5. **Communication Services**
   - Set up Resend account
   - Create email templates (HTML)
   - Implement email sending function
   - Set up Vonage account
   - Configure SMS sending function
   - Test SMS delivery

6. **CI/CD Pipeline**
   - Set up GitHub repository
   - Configure Vercel project
   - Set up environment variables in Vercel
   - Create GitHub Actions workflow
   - Configure automatic deployments
   - Set up database migration automation

## Phase 1: Core MVP (Weeks 3-8)

### Week 3-4: Onboarding & Client Management
1. **Onboarding Wizard**
   - Build 5-step onboarding flow
   - Step 1: Practice name
   - Step 2: Currency selection (ZAR, GBP, AED, AUD, USD)
   - Step 3: Timezone selection
   - Step 4: Modality selection (psychology, counselling, coaching, etc.)
   - Step 5: Regulatory region (ZA, UK, UAE, AU, etc.)
   - Generate POPIA/GDPR consent documents based on region

2. **Client Management**
   - Client list view with search and filters
   - Add new client form
   - Client profile view
   - Client edit/delete functionality
   - Client status management (active, waitlist, on_hold, discharged)
   - Digital intake form builder
   - Consent and GDPR/POPIA agreement with e-signature
   - Client search with fuzzy matching

### Week 5-6: Appointments & Scheduling
3. **Appointment Scheduling**
   - Therapist availability configuration (day/time blocks)
   - Manual appointment booking form
   - Appointment types (in-person, online, phone)
   - Recurring appointment series (weekly, fortnightly, monthly)
   - Calendar view (monthly, weekly, daily)
   - Appointment details view
   - Appointment rescheduling
   - Appointment cancellation
   - No-show tracking

4. **Reminders System**
   - Automated SMS reminder (48 hours before)
   - Automated email reminder with join link
   - Configurable reminder timing
   - Reminder delivery tracking
   - Reschedule link in reminders

### Week 7-8: Session Notes & Invoicing
5. **Session Notes**
   - SOAP note template (Subjective, Objective, Assessment, Plan)
   - DAP note template (Data, Assessment, Plan)
   - Freeform narrative note option
   - Note linked to appointment
   - Note customization (add/remove sections)
   - Note signing (timestamp + therapist name)
   - Note locking after 48 hours
   - Note history/view

6. **Invoicing System**
   - Auto-generate invoice on session completion
   - Multi-currency support
   - Invoice PDF generation with letterhead
   - Stripe payment link integration
   - PayFast payment link integration
   - Manual mark-as-paid (cash/EFT)
   - Automated payment reminders (7d, 14d overdue)
   - Invoice status tracking
   - Invoice list view

7. **Income Dashboard**
   - Monthly income overview
   - Total billed vs total collected
   - Outstanding invoices
   - Revenue by session type
   - Quick stats cards
   - Date range filters

## Phase 2: Intelligence (Weeks 9-16)

### Week 9-10: AI Features
1. **AI Note Drafting**
   - Integrate Groq API (Llama 3.1 70B or Mixtral 8x7B)
   - Bullet point input → structured SOAP draft
   - Draft review and editing
   - Draft acceptance/rejection
   - AI draft tracking

2. **Voice Dictation**
   - Integrate OpenAI Whisper API
   - Voice recording interface
   - Transcription processing
   - AI summary from transcription
   - Note draft generation

### Week 11-12: Clinical Intelligence
3. **Questionnaires**
   - PHQ-9 questionnaire implementation
   - GAD-7 questionnaire implementation
   - WEMWBS questionnaire implementation
   - Auto-scoring logic
   - Trend graph visualization
   - Questionnaire assignment to clients
   - Client portal for questionnaire completion

4. **Goal Tracking**
   - Goal creation interface
   - Milestone check-ins
   - Progress visualization
   - Goal completion tracking

5. **Risk Assessment**
   - Risk assessment template builder
   - Safety planning document
   - At-risk client alerts
   - PHQ-9 deterioration detection
   - Automated notifications

### Week 13-14: Client Portal
6. **Client Self-Booking**
   - Shareable booking link
   - Availability display
   - Timezone conversion
   - Booking confirmation
   - Rescheduling capability

7. **Client Portal**
   - Client login
   - View upcoming appointments
   - View invoices
   - View documents
   - Complete questionnaires
   - Update contact info

### Week 15-16: Advanced Features
8. **Waitlist Management**
   - Waitlist join functionality
   - Auto-notification when slot opens
   - Waitlist priority management

9. **Medical Aid Receipts**
   - South African medical aid schemes
   - Receipt generation (Discovery, Momentum, Medshield)
   - Scheme-specific formatting

10. **Financial Reports**
    - Financial year income export (CSV)
    - Financial year income export (PDF)
    - Tax preparation summary
    - Annual income report

## Phase 3: Growth (Weeks 17-24)

### Week 17-18: Group Practice
1. **Multi-Clinician Support**
   - Group practice creation
   - Clinician invitation
   - Role-based access (owner, admin, member)
   - Shared client access
   - Clinician-specific settings

2. **Group Dashboard**
   - Revenue per clinician
   - Sessions per clinician
   - Client distribution
   - Practice-wide metrics

### Week 19-20: Telehealth
3. **Built-in Video**
   - Daily.co integration
   - Video session interface
   - Session recording consent
   - Auto-link in appointment reminders
   - Video session history

### Week 21-22: Supervision & Messaging
4. **Supervision Workflows**
   - Supervision log
   - Trainee note submission
   - Supervisor review
   - Approval workflow
   - Practice hour tracking

5. **Secure Messaging**
   - In-platform messaging
   - Therapist ↔ client
   - End-to-end encryption
   - Message templates
   - Message history

### Week 23-24: Advanced Business Features
6. **Package Billing**
   - Prepaid session bundles
   - 6-session packages
   - 12-session packages
   - Package usage tracking
   - Package renewal

7. **Enhanced Client Portal**
   - Document upload
   - Message center
   - Payment history
   - Appointment history

## Phase 4: Scale (Months 7-12)

### Localization
1. **UAE Market**
   - Arabic language support
   - DIFC compliance
   - Local pricing
   - Regional payment methods

2. **Australian Market**
   - NDIS billing support
   - Medicare integration
   - Local compliance
   - APD formatting

3. **Spanish Language**
   - Full UI translation
   - Spanish email templates
   - Spanish documentation

### Enterprise Features
4. **Employer Benefits**
   - White-label product
   - HR package integration
   - Employee onboarding
   - Bulk licensing

5. **API for Integrations**
   - REST API endpoints
   - API key management
   - Webhook system
   - Developer documentation

## Security & Compliance

### GDPR Compliance
- Data stored in EU region (Frankfurt)
- Data Processing Agreement (DPA)
- Right to erasure implementation
- Data breach notification (72 hours)
- Lawful basis: Legitimate interest + explicit consent
- Standard Contractual Clauses for data transfer

### POPIA Compliance
- POPIA Operator Agreement
- Data subject access rights
- Information Officer designation
- Data residency considerations
- 72-hour breach notification

### Encryption
- TLS 1.3 in transit
- AES-256 encryption at rest for session notes
- bcrypt (cost factor 12) for passwords
- Application-layer encryption for sensitive fields

### Audit Trail
- All data changes logged
- Note amendment tracking
- Access logging
- 7-year retention for clinical records

## Testing Strategy

### Unit Testing
- Jest for unit tests
- React Testing Library for component tests
- Supabase test database
- Mock external services

### Integration Testing
- Supabase integration tests
- Payment flow tests (Stripe test mode, PayFast sandbox)
- Email/SMS delivery tests
- AI API integration tests

### E2E Testing
- Playwright for E2E tests
- Critical user flows:
  - Registration and onboarding
  - Client creation
  - Appointment booking
  - Note creation and signing
  - Invoice generation and payment

### Security Testing
- OWASP ZAP for security scanning
- Penetration testing (annual)
- Dependency vulnerability scanning
- RLS policy testing

## Deployment Strategy

### Environments
- **Development**: Local + Vercel preview
- **Staging**: Vercel staging + Supabase staging
- **Production**: Vercel production + Supabase production (EU)

### Deployment Process
1. Feature branch → PR → CI tests
2. Merge to main → auto-deploy to staging
3. Manual QA on staging
4. Promote to production
5. Database migrations run automatically

### Monitoring
- Vercel Analytics
- Supabase Logs
- Error tracking (Sentry)
- Uptime monitoring
- Payment webhook monitoring

## Success Gates

### Phase 0 Gate
- All CI tests passing
- Schema deployed to staging
- Payment test successful (Stripe + PayFast)
- Email/SMS delivery verified
- Authentication flow working

### Phase 1 Gate
- 5 beta therapists using product weekly
- No critical bugs
- Core features functional:
  - Client management
  - Appointment scheduling
  - Session notes
  - Invoicing
  - Reminders

### Phase 2 Gate
- 20 paying customers
- NPS > 55
- AI note feature used in > 60% of sessions
- Questionnaires functional
- Client portal live

### Phase 3 Gate
- 50 paying customers
- $4,900 MRR
- Group practice pilot live
- Video sessions functional
- Supervision workflows working

### Phase 4 Gate
- $10,000 MRR
- Operations in 4 countries
- Enterprise pilot signed
- Localization complete for UAE and AU

## Open Decisions

1. **SMS Provider**: Vonage with per-country routing (recommended)
2. **Client Portal Domain**: Separate domain (portal.mindeeze.com) for security
3. **POPIA Features**: Offer to all users as differentiator
4. **Annual Discount**: 2 months free (17%) for psychological impact
5. **Medical Aid Integration**: Partner with MedSwitch or Healthbridge (decision before Phase 2 SA launch)
6. **Therapist Verification**: Optional self-certification with trust badge

## Next Steps

1. Begin Phase 0 Week 1: Project initialization
2. Set up Supabase project
3. Create initial database schema
4. Implement authentication
5. Configure payment gateways
6. Build onboarding wizard
7. Begin Phase 1 core features

## Timeline Summary

- **Phase 0**: Weeks 1-2 (Foundation)
- **Phase 1**: Weeks 3-8 (Core MVP)
- **Phase 2**: Weeks 9-16 (Intelligence)
- **Phase 3**: Weeks 17-24 (Growth)
- **Phase 4**: Months 7-12 (Scale)

**Total Timeline**: 12 months to full V1 with scale capabilities
