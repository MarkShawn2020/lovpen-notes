import { Toaster } from 'sonner';

import { PlateEditor } from '@/components/editor/plate-editor';

export default function Page() {
  return (
    <div className="h-full w-full">
      <PlateEditor />

      <Toaster />
    </div>
  );
}
