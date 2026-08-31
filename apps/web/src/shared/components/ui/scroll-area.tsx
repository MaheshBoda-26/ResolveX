'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-default', className)}
      {...props}
    />
  )
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };