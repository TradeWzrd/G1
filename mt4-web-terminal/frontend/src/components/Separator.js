import React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

export const Separator = React.forwardRef(({
  className = '',
  orientation = 'horizontal',
  decorative = true,
  ...props
}, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={`shrink-0 bg-magic-border ${
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
    } ${className}`}
    {...props}
  />
));

Separator.displayName = 'Separator';
