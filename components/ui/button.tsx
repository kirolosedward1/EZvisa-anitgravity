import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** Trailing icon sits in a 20px white/20 disc. RTL flex puts that disc on the left, and the glyph mirrors. */
const trailingIcon =
  "[&>svg:last-child]:box-border [&>svg:last-child]:size-5 [&>svg:last-child]:shrink-0 [&>svg:last-child]:rounded-full [&>svg:last-child]:bg-primary-foreground/20 [&>svg:last-child]:p-[3px] [&>svg:last-child]:rtl:-scale-x-100"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-medium leading-normal transition-[color,background-color,transform,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground shadow-none inset-shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_72%,black)] hover:bg-[color-mix(in_srgb,var(--primary)_88%,black)] hover:inset-shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_64%,black)] ${trailingIcon}`,
        destructive:
          'bg-destructive text-destructive-foreground shadow-none hover:bg-[color-mix(in_srgb,var(--destructive)_88%,black)] focus-visible:ring-destructive',
        outline:
          'border border-border bg-background text-foreground shadow-none hover:bg-[#E6E8EB] hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'border-0 bg-[#F1F2F4] text-[#3A4150] shadow-none hover:bg-[#E4E6EA] [&>svg:last-child]:size-4 [&>svg:last-child]:bg-transparent [&>svg:last-child]:p-0 [&>svg:last-child]:text-current [&>svg:last-child]:rtl:-scale-x-100',
        ghost:
          'bg-transparent text-foreground shadow-none hover:bg-[#F1F2F4] hover:text-foreground dark:hover:bg-muted/50',
        link: 'h-auto min-h-0 rounded-none bg-transparent px-0 py-0 text-primary underline-offset-4 shadow-none hover:bg-transparent hover:underline active:scale-100',
      },
      size: {
        default: 'h-12 min-h-12 px-6',
        sm: 'h-11 min-h-11 gap-1.5 px-4',
        lg: 'h-12 min-h-12 px-6',
        icon: 'size-12 p-0 [&_svg]:!size-4 [&_svg]:!rounded-none [&_svg]:!bg-transparent [&_svg]:!p-0',
        'icon-sm': 'size-11 p-0 [&_svg]:!size-4 [&_svg]:!rounded-none [&_svg]:!bg-transparent [&_svg]:!p-0',
        'icon-lg': 'size-12 p-0 [&_svg]:!size-4 [&_svg]:!rounded-none [&_svg]:!bg-transparent [&_svg]:!p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
