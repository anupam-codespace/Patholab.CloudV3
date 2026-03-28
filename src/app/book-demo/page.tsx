import { Metadata } from 'next';
import BookDemoModal from '@/components/landing/BookDemoModal';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Book a Demo - Globiz Patholab',
  description: 'Schedule a personalized walkthrough of our LIMS software.',
};

export default function BookDemoPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]" />
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
           See Globiz Patholab in Action
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
           Experience the fastest LIMS built for modern diagnostics. 
           Join 500+ labs growing with us.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400 py-4">
           <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400"/> Live Walkthrough</span>
           <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400"/> Q&A Session</span>
           <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400"/> No Commitment</span>
        </div>

        {/* THE BOOK DEMO MODAL TRIGGER */}
        <BookDemoModal>
           <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white h-14 px-10 text-lg font-bold shadow-xl shadow-blue-900/50">
              Schedule Free Demo
           </Button>
        </BookDemoModal>
      </div>
    </div>
  );
}