"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ArrowRight, Check, ChevronDown, Search, X } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { useSiteLocale } from "@/components/locale-provider"

export type CountryPickerOption = { value: string; label: string; iso: string; keywords: string[] }

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase().trim()

export function CountryPicker({ label, placeholder, searchLabel, value, options, onChange, featuredValues }: {
  label: string
  placeholder: string
  searchLabel: string
  value: string
  options: CountryPickerOption[]
  onChange: (value: string) => void
  featuredValues?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(-1)
  const [showAll, setShowAll] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()
  const arabic = useSiteLocale() === "ar"
  const selected = options.find(option => option.value === value)
  const term = normalize(query)
  const compact = !!featuredValues?.length && !showAll && !term
  const filtered = compact
    ? featuredValues.flatMap(value => options.filter(option => option.value === value))
    : options.filter(option => normalize([option.label, option.value, ...option.keywords].join(" ")).includes(term))
  const canExpand = compact && filtered.length < options.length
  const resultCount = filtered.length + (canExpand ? 1 : 0)

  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) { setQuery(""); setActive(-1); setShowAll(false) }
  }

  function choose(nextValue: string) {
    onChange(nextValue)
    changeOpen(false)
  }

  function expand() {
    setShowAll(true)
    setActive(0)
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverAnchor asChild>
        <div className="ez-country-field" ref={field}>
          <label htmlFor={id}>{label}</label>
          <div className="ez-country-input" data-open={open} onClick={() => { setOpen(true); input.current?.focus() }}>
            <span aria-hidden="true" className="ez-country-input-icon">
              {selected && !query ? <CountryFlag iso={selected.iso} className="size-6" /> : <Search size={19} strokeWidth={1.7} />}
            </span>
            <input
              ref={input} id={id} role="combobox" autoComplete="off" spellCheck={false}
              aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
              aria-activedescendant={open && active >= 0 && active < resultCount ? `${id}-option-${active}` : undefined}
              placeholder={open ? searchLabel : placeholder}
              value={open ? query : selected?.label || ""}
              onFocus={() => { setOpen(true); setActive(-1) }}
              onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0) }}
              onKeyDown={event => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault()
                  setOpen(true)
                  setActive(index => {
                    if (!resultCount) return -1
                    if (index < 0) return event.key === "ArrowDown" ? 0 : resultCount - 1
                    return (index + (event.key === "ArrowDown" ? 1 : -1) + resultCount) % resultCount
                  })
                } else if (event.key === "Enter" && open) {
                  event.preventDefault()
                  if (filtered[active]) choose(filtered[active].value)
                  else if (canExpand && active === filtered.length) expand()
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  changeOpen(false)
                } else if (event.key === "Tab") changeOpen(false)
              }}
            />
            {selected ? <button type="button" className="ez-country-clear" aria-label={arabic ? `مسح ${label}` : `Clear ${label.toLowerCase()}`}
              onPointerDown={event => event.preventDefault()}
              onClick={event => { event.stopPropagation(); onChange(""); setQuery(""); setActive(-1); setOpen(true); input.current?.focus() }}><X size={15} /></button>
              : <ChevronDown className="ez-country-input-chevron" size={16} aria-hidden="true" />}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent className="ez-country-results" align="start" sideOffset={8} collisionPadding={20} dir={arabic ? "rtl" : "ltr"}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (field.current?.contains(event.target as Node)) event.preventDefault() }}>
        <div ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="ez-country-results-list">
          {filtered.map((option, index) => (
            <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={value === option.value}
              data-index={index} data-active={active === index} className="ez-country-result"
              onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(option.value)}>
              <span aria-hidden="true"><CountryFlag iso={option.iso} className="size-6" /></span>
              <span>{option.label}</span>
              {value === option.value && <Check size={16} aria-hidden="true" />}
            </div>
          ))}
          {canExpand && (
            <div id={`${id}-option-${filtered.length}`} role="option" aria-selected={false}
              data-index={filtered.length} data-active={active === filtered.length}
              className="ez-country-result ez-country-show-all"
              onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(filtered.length)} onClick={expand}>
              <span>{arabic ? "عرض كل الجنسيات" : "Show all nationalities"}</span>
              <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
            </div>
          )}
        </div>
        {!filtered.length && <p className="ez-country-empty" role="status">{arabic ? "لم نجد دولة بهذا الاسم. جرّب اسمًا آخر." : "No countries found. Try another name."}</p>}
      </PopoverContent>
    </Popover>
  )
}
