'use client';

import { cn } from '@/lib/utils';

import { Toolbar } from './toolbar';

interface FixedToolbarProps extends React.ComponentProps<typeof Toolbar> {
  wrap?: boolean;
}

export function FixedToolbar({ wrap = false, ...props }: FixedToolbarProps) {
  return (
    <Toolbar
      {...props}
      wrap={wrap}
      className={cn(
        'sticky top-0 left-0 z-50 scrollbar-hide w-full justify-between rounded-t-lg border-b border-b-border bg-background/95 p-1 backdrop-blur-sm supports-backdrop-blur:bg-background/60',
        !wrap && 'overflow-x-auto',
        props.className
      )}
    />
  );
}
