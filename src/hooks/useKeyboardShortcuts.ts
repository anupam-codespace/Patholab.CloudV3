import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

export default function useKeyboardShortcuts() {
  const { undo, redo, copy, paste, deleteElement, selectedElementIds } = useEditorStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Z -> Undo
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z -> Redo
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        redo();
      }
      // Ctrl+C -> Copy
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        copy();
      }
      // Ctrl+V -> Paste
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        paste();
      }
      // Delete -> Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0 && !e.ctrlKey) {
          e.preventDefault();
          selectedElementIds.forEach((id) => deleteElement(id));
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, copy, paste, deleteElement, selectedElementIds]);
}