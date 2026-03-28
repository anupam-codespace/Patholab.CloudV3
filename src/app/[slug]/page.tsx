import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';

// 1. Generate Metadata dynamically for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await prisma.page.findUnique({
    where: { slug: params.slug, isPublished: true },
    select: { metaTitle: true, metaDesc: true, title: true }
  });

  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDesc || `Read about ${page.title} on Globiz Patholab`,
  };
}

// 2. The Page Component
export default async function DynamicPage({ params }: { params: { slug: string } }) {
  
  // Fetch Page Data
  const page = await prisma.page.findUnique({
    where: { 
      slug: params.slug,
      isPublished: true // Only show if published
    }
  });

  if (!page) {
    notFound(); // Triggers the 404 page
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Optional: Add your public Navbar here */}
      
      {/* Page Header */}
      <header className="bg-slate-50 border-b py-16">
         <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
               {page.title}
            </h1>
         </div>
      </header>

      {/* Page Content */}
      <main className="container mx-auto px-4 max-w-4xl py-12">
         <article className="prose prose-slate lg:prose-lg mx-auto">
            {/* ⚠️ DANGER: Only use this if you trust your admin users. 
               Since only SUPER_ADMIN creates pages, this is generally safe.
            */}
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
         </article>
      </main>

      {/* Optional: Add your public Footer here */}
    </div>
  );
}

