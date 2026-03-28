'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import with SSR disabled
const RegistrationWizard = dynamic(
  () => import('@/components/RegistrationWizard'),
  { ssr: false }
);

export default function RegisterPage() {
  return <RegistrationWizard />;
}
