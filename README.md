#  Patholab - Laboratory Management SaaS

A comprehensive, production-ready Laboratory Management System built with Next.js 14, PostgreSQL (Neon), Prisma, TanStack Query, and Razorpay integration.

##  Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Role-Based Access](#role-based-access)
- [Deployment](#deployment)
- [Contributing](#contributing)

##  Features

###  Authentication & Authorization
- ✅ Email/Password registration with OTP verification
- ✅ Secure JWT-based authentication
- ✅ Role-based access control (Super Admin, Lab Owner, Technician, Receptionist)
- ✅ Password reset with OTP
- ✅ Email verification system

###  Subscription & Billing
- ✅ Multiple subscription plans (Monthly, Quarterly, Yearly)
- ✅ Razorpay payment integration
- ✅ Automated payment verification
- ✅ Plan upgrade/downgrade functionality
- ✅ Subscription renewal reminders
- ✅ Payment history and receipts
- ✅ Usage tracking and limits

###  Laboratory Management
- ✅ Lab registration and profile management
- ✅ Staff management with role assignments
- ✅ Patient registration and management
- ✅ Test catalog and categories
- ✅ Sample collection tracking
- ✅ Test processing workflow
- ✅ Report generation and delivery
- ✅ Appointment scheduling

###  Analytics & Reporting
- ✅ Beautiful charts with Recharts
- ✅ Revenue analytics
- ✅ Test statistics
- ✅ Patient demographics
- ✅ Subscription metrics
- ✅ Custom date range filters

###  UI/UX Features
- ✅ Dark/Light theme support
- ✅ Responsive design for all devices
- ✅ Modern, clean interface
- ✅ Loading states and error handling
- ✅ Toast notifications
- ✅ Real-time updates

###  Support System
- ✅ Ticket-based support system
- ✅ Support sidebar for quick access
- ✅ Priority levels (Low, Medium, High, Urgent)
- ✅ Ticket status tracking
- ✅ Email notifications

###  Notifications
- ✅ In-app notifications
- ✅ Email notifications for:
  - Account verification
  - Payment confirmations
  - Subscription updates
  - Test status changes
  - Support ticket updates

##  Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom components with CVA
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Icons:** Lucide React
- **Theme:** next-themes

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** JWT (jose)
- **Password Hashing:** bcryptjs
- **Email:** Nodemailer
- **Payment:** Razorpay

### DevOps
- **Hosting:** Vercel (recommended)
- **Database:** Neon PostgreSQL
- **Email Service:** Gmail SMTP / SendGrid
- **Payment Gateway:** Razorpay

##  Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** or **pnpm**
- **PostgreSQL database** (Neon recommended)
- **Razorpay account** (test/live)
- **Email service** credentials (Gmail/SendGrid)

##  Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/Patholab.git
cd Patholab
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

## 🗄️ Database Setup

### Step 1: Create Neon PostgreSQL Database

1. Go to [Neon](https://neon.tech)
2. Sign up / Log in
3. Create a new project
4. Create a database named `Patholab`
5. Copy the connection string

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/Patholab?sslmode=require"

# JWT Secret (generate using: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Razorpay (Get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret_key"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"
EMAIL_FROM="Patholab <noreply@Patholab.com>"

# Application
NEXT_PUBLIC_APP_NAME="Patholab"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Step 3: Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 4: Run Database Migrations

```bash
npm run prisma:migrate
```

This will create all necessary tables in your database.

### Step 5: Seed Database (Optional)

Create a seed file `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create subscription plans
  const starterPlan = await prisma.plan.create({
    data: {
      name: 'starter',
      displayName: 'Starter Plan',
      description: 'Perfect for small laboratories',
      price: 999,
      billingCycle: 'MONTHLY',
      features: JSON.stringify([
        'Up to 100 tests/month',
        'Up to 5 staff members',
        'Basic analytics',
        'Email support',
      ]),
      maxTests: 100,
      maxStaff: 5,
      maxPatients: 500,
      storageGB: 10,
      hasAnalytics: true,
      hasApiAccess: false,
      hasWhiteLabel: false,
      priority: 1,
      isActive: true,
      isPopular: false,
    },
  });

  const professionalPlan = await prisma.plan.create({
    data: {
      name: 'professional',
      displayName: 'Professional Plan',
      description: 'Best for growing laboratories',
      price: 2499,
      billingCycle: 'MONTHLY',
      features: JSON.stringify([
        'Up to 500 tests/month',
        'Up to 15 staff members',
        'Advanced analytics',
        'Priority support',
        'API access',
      ]),
      maxTests: 500,
      maxStaff: 15,
      maxPatients: 2000,
      storageGB: 50,
      hasAnalytics: true,
      hasApiAccess: true,
      hasWhiteLabel: false,
      priority: 2,
      isActive: true,
      isPopular: true,
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'enterprise',
      displayName: 'Enterprise Plan',
      description: 'For large laboratory chains',
      price: 4999,
      billingCycle: 'MONTHLY',
      features: JSON.stringify([
        'Unlimited tests',
        'Unlimited staff',
        'Full analytics suite',
        'Dedicated support',
        'API access',
        'White label',
        'Custom integrations',
      ]),
      maxTests: -1, // Unlimited
      maxStaff: -1,
      maxPatients: -1,
      storageGB: 200,
      hasAnalytics: true,
      hasApiAccess: true,
      hasWhiteLabel: true,
      priority: 3,
      isActive: true,
      isPopular: false,
    },
  });

  // Create super admin
  const hashedPassword = await hashPassword('admin123');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@Patholab.com',
      password: hashedPassword,
      name: 'Super Admin',
      phone: '9999999999',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Admin Email: admin@Patholab.com');
  console.log('🔑 Admin Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run the seed:

```bash
npm run prisma:seed
```

## 🔧 Environment Configuration

### Gmail SMTP Setup

1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password:
   - Go to Google Account → Security
   - App Passwords → Select "Mail" and "Other"
   - Copy the generated password
3. Use this password in `EMAIL_PASSWORD`

### Razorpay Setup

1. Sign up at [Razorpay](https://razorpay.com)
2. Go to Settings → API Keys
3. Generate test/live keys
4. Copy `Key ID` and `Key Secret`
5. For webhooks:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`, `subscription.charged`, `subscription.cancelled`
   - Copy webhook secret

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (Deletes all data)
npx prisma migrate reset

# Format schema
npx prisma format
```

## 📁 Project Structure

```
Patholab/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data
│   └── migrations/            # Migration files
├── public/
│   ├── logo.svg
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth pages (login, register, verify)
│   │   ├── (dashboard)/      # Dashboard pages (role-based)
│   │   │   ├── admin/        # Super admin dashboard
│   │   │   ├── workspace/    # Lab owner dashboard
│   │   │   ├── technician/   # Technician dashboard
│   │   │   └── receptionist/ # Receptionist dashboard
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── payments/     # Payment endpoints
│   │   │   ├── subscriptions/ # Subscription endpoints
│   │   │   ├── labs/         # Lab management
│   │   │   ├── patients/     # Patient management
│   │   │   ├── tests/        # Test management
│   │   │   └── support/      # Support system
│   │   ├── pricing/          # Pricing page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ui/               # UI components
│   │   ├── layouts/          # Layout components
│   │   ├── charts/           # Chart components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── subscription/     # Subscription components
│   │   ├── support/          # Support components
│   │   └── common/           # Common components
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client
│   │   ├── auth.ts           # Auth utilities
│   │   ├── razorpay.ts       # Razorpay integration
│   │   ├── email.ts          # Email service
│   │   ├── utils.ts          # Utility functions
│   │   ├── validation.ts     # Zod schemas
│   │   └── constants.ts      # Constants
│   ├── hooks/                # Custom hooks
│   ├── types/                # TypeScript types
│   └── middleware.ts         # Next.js middleware
├── .env                      # Environment variables
├── .env.example              # Example environment file
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🔌 API Documentation

### Authentication Endpoints

```typescript
// Register new user
POST /api/auth/register
Body: { name, email, password, phone, role? }
Response: { message, userId, email }

// Verify email OTP
POST /api/auth/verify-otp
Body: { email, otp }
Response: { message, user }

// Login
POST /api/auth/login
Body: { email, password }
Response: { message, user }

// Logout
POST /api/auth/logout
Response: { message }

// Resend OTP
POST /api/auth/send-otp
Body: { email }
Response: { message }

// Get current user
GET /api/auth/me
Response: { user }
```

### Payment Endpoints

```typescript
// Create Razorpay order
POST /api/payments/create-order
Body: { planId, billingCycle }
Response: { orderId, amount, currency, key }

// Verify payment
POST /api/payments/verify
Body: { orderId, paymentId, signature }
Response: { message, subscription }

// Webhook (for Razorpay)
POST /api/payments/webhook
Headers: { x-razorpay-signature }
```

### Subscription Endpoints

```typescript
// Get subscription
GET /api/subscriptions
Response: { subscription }

// Upgrade plan
POST /api/subscriptions/upgrade
Body: { planId }
Response: { message, plan }

// Cancel subscription
POST /api/subscriptions/cancel
Response: { message }
```

### Plan Endpoints

```typescript
// Get all plans
GET /api/plans
Response: { plans }
```

## 👥 Role-Based Access

### Super Admin
- Full system access
- Manage all labs
- View all analytics
- Manage subscription plans
- Support ticket management

### Lab Owner
- Lab management
- Staff management
- Patient management
- Test management
- Billing and subscription
- Lab analytics

### Technician
- View and process tests
- Manage samples
- Generate reports
- Update test status

### Receptionist
- Patient registration
- Appointment scheduling
- Billing and invoicing
- Test booking

##  Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Environment Variables on Vercel

Add all variables from `.env` file in Vercel Dashboard:
- Settings → Environment Variables
- Add each variable

### Database Connection

Ensure your `DATABASE_URL` has `?sslmode=require` for Neon:

```
postgresql://user:pass@host/db?sslmode=require
```

## 📝 Additional Configuration

### Custom Domain Setup

1. Add domain in Vercel
2. Update DNS records
3. Update `NEXT_PUBLIC_APP_URL` in environment variables

### Email Service Alternatives

Instead of Gmail, you can use:

**SendGrid:**
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_USER="apikey"
EMAIL_PASSWORD="your-sendgrid-api-key"
```

**AWS SES:**
```env
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_PORT="587"
EMAIL_USER="your-ses-username"
EMAIL_PASSWORD="your-ses-password"
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Solution: Check DATABASE_URL format and ensure Neon database is active
```

**2. OTP Email Not Sending**
```
Solution: 
- Verify EMAIL_USER and EMAIL_PASSWORD
- Enable "Less secure app access" (Gmail)
- Use App Password instead of regular password
```

**3. Payment Verification Failed**
```
Solution: 
- Check Razorpay keys are correct
- Ensure webhook secret matches
- Verify callback URL is correct
```

**4. Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run prisma:generate
```

## 📚 Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Razorpay Documentation](https://razorpay.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Next.js Team
- Prisma Team
- Razorpay
- TanStack Team
- The open-source community

## 📞 Support

For support, email support@Patholab.com or join our Slack channel.

---

**Made with ❤️ by [Your Name]**
