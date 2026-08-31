"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, AlertCircle, Sparkles, Wrench, Package,
  RefreshCw, ChevronDown, Copy, Check, ArrowUp, Github, Rss, Search,
} from "lucide-react";

// ============================================================================
// Lightweight Markdown renderer
// Supports the subset of markdown used in CHANGELOG.md:
//   - # H1, ## H2, ### H3, #### H4
//   - Bullet lists (- or *)
//   - Bold (**text**)
//   - Inline code (`text`)
//   - Horizontal rule (---)
//   - Links ([text](url))
//   - Paragraphs
// We don't pull in react-markdown to avoid a heavy dependency for a single page.
// ============================================================================

interface ParsedSection {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'hr';
  text?: string;
  items?: string[];
  version?: string;
  date?: string;
}

function parseMarkdown(md: string): ParsedSection[] {
  const lines = md.split('\n');
  const sections: ParsedSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      sections.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('#### ')) {
      sections.push({ type: 'h4', text: trimmed.slice(5) });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      sections.push({ type: 'h3', text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const headerText = trimmed.slice(3);
      // Parse "## [3.2.4.1] — 2026-08-31" or "## [3.1.0] / [3.1.1] — 2026-08-26"
      const versionMatch = headerText.match(/\[([\d.\w /]+)\]/);
      const dateMatch = headerText.match(/—\s*(.+)$/);
      sections.push({
        type: 'h2',
        text: headerText,
        version: versionMatch ? versionMatch[1] : headerText,
        date: dateMatch ? dateMatch[1].trim() : '',
      });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      sections.push({ type: 'h1', text: trimmed.slice(2) });
      i++;
      continue;
    }

    // Bullet list — collect consecutive bullet lines
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
        i++;
      }
      sections.push({ type: 'ul', items });
      continue;
    }

    // Paragraph (single line of text that's not a header or list)
    sections.push({ type: 'p', text: trimmed });
    i++;
  }

  return sections;
}

// Render inline markdown (bold, code, links)
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Combined regex for **bold**, `code`, and [text](url)
  const regex = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // Bold
      nodes.push(<strong key={key++} className="font-bold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // Inline code
      nodes.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-100 text-primary text-[0.85em] font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // Link
      nodes.push(
        <a key={key++} href={match[7]} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">
          {match[6]}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

// Detect category from h4 text for icon + color
function getCategoryMeta(text: string): { icon: any; color: string; bg: string } {
  const lower = text.toLowerCase();
  if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('error') || lower.includes('crash')) {
    return { icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' };
  }
  if (lower.startsWith('add') || lower.includes('new') || lower.includes('create')) {
    return { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (lower.startsWith('chang') || lower.startsWith('updat') || lower.startsWith('refactor')) {
    return { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  }
  if (lower.startsWith('remov') || lower.startsWith('deprecat')) {
    return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  }
  return { icon: Package, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
}

function VersionBadge({ version }: { version: string }) {
  // Color-code by major version
  const major = version.split('.')[0];
  const colors: Record<string, string> = {
    '3': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    '2': 'bg-blue-100 text-blue-700 border-blue-200',
    '1': 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const cls = colors[major] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      v{version}
    </span>
  );
}

export default function ChangelogClient({ markdown }: { markdown: string }) {
  const [activeVersion, setActiveVersion] = useState<string>('');
  const [copiedVersion, setCopiedVersion] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const sections = useMemo(() => parseMarkdown(markdown), [markdown]);

  // Extract all versions for the sticky nav
  const versions = useMemo(() => {
    return sections
      .filter((s): s is ParsedSection & { version: string; date: string } => s.type === 'h2' && !!s.version)
      .map(s => ({ version: s.version, date: s.date, text: s.text || '' }));
  }, [sections]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    // Keep headers always, but filter bullet items and paragraphs
    return sections.map(s => {
      if (s.type === 'ul' && s.items) {
        const matchedItems = s.items.filter(item => item.toLowerCase().includes(q));
        if (matchedItems.length === 0) return null;
        return { ...s, items: matchedItems };
      }
      if (s.type === 'p' && s.text) {
        return s.text.toLowerCase().includes(q) ? s : null;
      }
      return s; // Keep all headers
    }).filter(Boolean) as ParsedSection[];
  }, [sections, searchQuery]);

  // Track which version is in view for the sticky nav highlight
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveVersion(entry.target.id.replace('version-', ''));
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    versions.forEach(v => {
      const el = document.getElementById(`version-${v.version.replace(/[^a-zA-Z0-9.]/g, '-')}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [versions]);

  // Show scroll-to-top button
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToVersion = (version: string) => {
    const id = `version-${version.replace(/[^a-zA-Z0-9.]/g, '-')}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const copyVersionLink = (version: string) => {
    const url = `${window.location.origin}/changelog#version-${version.replace(/[^a-zA-Z0-9.]/g, '-')}`;
    navigator.clipboard?.writeText(url);
    setCopiedVersion(version);
    setTimeout(() => setCopiedVersion(''), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
              <span className="text-rose-600">←</span> Patholab Cloud
            </Link>
            <div className="flex items-center gap-2">
              <a
                href="/changelog.rss"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                title="RSS feed (coming soon)"
              >
                <Rss className="h-3.5 w-3.5" /> RSS
              </a>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg"
              >
                Get Started <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Title */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Changelog</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Every improvement, fix, and new feature shipped to Patholab Cloud.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search changelog... (e.g., 'invoice', 'timezone', 'report')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>

        {versions.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            {versions.length} releases documented • Latest: <span className="font-mono font-bold text-slate-600">v{versions[0].version}</span> ({versions[0].date})
          </p>
        )}
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 flex gap-8">
        {/* Sticky version nav (desktop) */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3">Versions</p>
            <nav className="space-y-0.5">
              {versions.map(v => (
                <button
                  key={v.version}
                  onClick={() => scrollToVersion(v.version)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeVersion === v.version
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  v{v.version}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-2">
          {filteredSections.map((section, idx) => {
            if (section.type === 'h1') {
              return (
                <h1 key={idx} className="text-2xl font-black text-slate-900 mt-8 mb-4">
                  {section.text}
                </h1>
              );
            }
            if (section.type === 'h2') {
              const safeId = `version-${(section.version || '').replace(/[^a-zA-Z0-9.]/g, '-')}`;
              const isLatest = idx === sections.findIndex(s => s.type === 'h2');
              return (
                <div key={idx} id={safeId} className="scroll-mt-24 pt-8 pb-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <VersionBadge version={section.version || ''} />
                      {isLatest && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> LATEST
                        </span>
                      )}
                      {section.date && (
                        <span className="text-xs text-slate-400 font-medium">{section.date}</span>
                      )}
                    </div>
                    <button
                      onClick={() => copyVersionLink(section.version || '')}
                      className="text-xs text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
                      title="Copy link to this version"
                    >
                      {copiedVersion === section.version ? (
                        <><Check className="h-3 w-3" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Link</>
                      )}
                    </button>
                  </div>
                </div>
              );
            }
            if (section.type === 'h3') {
              return (
                <h3 key={idx} className="text-sm font-black text-slate-700 uppercase tracking-wider mt-6 mb-2">
                  {section.text}
                </h3>
              );
            }
            if (section.type === 'h4') {
              const meta = getCategoryMeta(section.text || '');
              const Icon = meta.icon;
              return (
                <h4 key={idx} className={`flex items-center gap-2 text-base font-bold mt-6 mb-2 px-3 py-2 rounded-lg border ${meta.bg}`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className={meta.color}>{section.text}</span>
                </h4>
              );
            }
            if (section.type === 'hr') {
              return <hr key={idx} className="border-slate-200 my-8" />;
            }
            if (section.type === 'p') {
              return (
                <p key={idx} className="text-sm text-slate-600 leading-relaxed mb-3">
                  {renderInline(section.text || '')}
                </p>
              );
            }
            if (section.type === 'ul' && section.items) {
              return (
                <ul key={idx} className="space-y-1.5 mb-4 ml-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                      <span className="flex-1">{renderInline(item)}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            return null;
          })}

          {/* Empty search result */}
          {filteredSections.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No results for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try a different search term.</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              That's all for now. Stay tuned for more updates — we ship continuously.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-primary hover:underline"
            >
              Start using Patholab Cloud <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </main>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 h-10 w-10 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-700 z-40"
          title="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
