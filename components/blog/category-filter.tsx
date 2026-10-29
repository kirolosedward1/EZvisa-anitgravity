"use client"

import { LocaleLink } from "@/components/locale-link"
import { NewsCategory } from "@/components/blog/news-copy"
import { useSiteLocale } from "@/components/locale-provider"

export function CategoryFilter({ categories, selectedCategory }: { categories: string[]; selectedCategory: string }) {
  const arabic = useSiteLocale() === "ar"
  return (
    <nav className="ez-journal-categories" aria-label={arabic ? "تصنيفات المقالات" : "Article categories"}>
      {categories.map((category) => (
        <LocaleLink key={category} href={category === "All" ? "/news" : `/news?category=${encodeURIComponent(category)}`}
          aria-current={selectedCategory === category ? "page" : undefined}>
          <NewsCategory category={category} />
        </LocaleLink>
      ))}
    </nav>
  )
}
