import { promises as fs } from 'fs';
import path from 'path';
import { Metadata } from 'next';
import ChangelogClient from './changelog-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Changelog — Patholab Cloud',
  description:
    'Every improvement, fix, and new feature shipped to Patholab Cloud — from v3.0.0 to the latest release. Updated continuously.',
  keywords: ['Patholab changelog', 'LIMS updates', 'pathology software release notes', 'Patholab Cloud'],
  openGraph: {
    title: 'Changelog — Patholab Cloud',
    description: 'Every improvement, fix, and new feature shipped to Patholab Cloud.',
    url: '/changelog',
    siteName: 'Patholab Cloud',
    type: 'website',
  },
  alternates: { canonical: '/changelog' },
};

// ============================================================================
// Server Component — reads CHANGELOG.md from disk at request time so the page
// always reflects the latest committed changelog (no rebuild needed for typo
// fixes to the markdown file).
// ============================================================================
export default async function ChangelogPage() {
  let markdown = '';
  try {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    markdown = await fs.readFile(changelogPath, 'utf-8');
  } catch {
    markdown = '# Changelog\n\nNo changelog file found.';
  }

  return <ChangelogClient markdown={markdown} />;
}
