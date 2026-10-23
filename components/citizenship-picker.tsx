"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  CITIZENSHIP_OPTIONS,
  citizenshipName,
  citizenshipSearchValue,
  toCitizenshipIso,
} from "@/lib/nationalities"
import { cn } from "@/lib/utils"

export function CitizenshipPicker({
  value,
  onChange,
  placeholder = "Select nationality",
  className,
}: {
  value?: string
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const iso = toCitizenshipIso(value)
  const name = citizenshipName(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-12 w-full justify-between rounded-xl font-medium", className)}
        >
          {iso ? (
            <span className="flex min-w-0 items-center gap-2">
              <CountryFlag iso={iso} title={name} />
              <span className="truncate text-foreground">{name}</span>
            </span>
          ) : (
            <span className="font-normal text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by country or code" />
          <CommandList>
            <CommandEmpty>No nationality found.</CommandEmpty>
            <CommandGroup>
              {CITIZENSHIP_OPTIONS.map((country) => (
                <CommandItem
                  key={country.iso}
                  value={citizenshipSearchValue(country)}
                  onSelect={() => {
                    onChange(country.iso)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("me-2 size-4", iso === country.iso ? "opacity-100" : "opacity-0")} />
                  <span className="me-2"><CountryFlag iso={country.iso} title={country.name} /></span>
                  <span className="flex-1">{country.name}</span>
                  <span className="ltr-isolate text-xs text-muted-foreground">{country.iso}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
