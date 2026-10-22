import Link from "next/link"

import type { Detail } from "./content"

export function DetailsList({ items }: { items: Detail[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.title} className="flex gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.body}
                {item.href && item.linkLabel && (
                  <>
                    {" "}
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.linkLabel}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
