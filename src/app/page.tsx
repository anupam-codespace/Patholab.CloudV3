import type { Metadata } from 'next';
import LandingClient from '@/components/landing/LandingClient';

export const metadata: Metadata = {
  title: 'Globiz Patholab | Enterprise Cloud LIMS for High-Volume Labs',
  description: 'The operating system for modern pathology labs. Automate reporting, billing, inventory, and machine interfacing with Globiz Patholab.',
  keywords: ['LIMS Software', 'Pathology Lab Management', 'Medical Billing', 'Cloud LIMS', 'Globiz Patholab'],
  openGraph: {
    title: 'Globiz Patholab - The Future of Diagnostics',
    description: 'Scale your lab with AI-powered reporting and multi-center management.',
    url: 'https://Globiz Patholab',
    siteName: 'Globiz Patholab',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    locale: 'en_IN',
    type: 'website',
  },
  alternates: {
    canonical: 'https://Globiz Patholab',
  },
};

export default function Page() {
  return <LandingClient />;
}