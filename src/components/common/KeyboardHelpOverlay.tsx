"use client";
import { useHelpOverlay, getAllShortcuts } from "@/hooks/useKeyboardShortcut";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export function KeyboardHelpOverlay() {
  const [show, setShow] = useHelpOverlay();
  const shortcuts = getAllShortcuts();
  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5 text-primary" /> Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-muted border border-border rounded-md shadow-sm min-w-[60px] text-center">{s.key}</kbd>
            </div>
          ))}
          {shortcuts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No shortcuts registered.</p>}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">Ctrl+/</kbd> or <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">ESC</kbd> to close</p>
      </DialogContent>
    </Dialog>
  );
}
