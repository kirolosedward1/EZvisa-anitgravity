"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string
}

export function CategoryFilter({ categories, selectedCategory }: CategoryFilterProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleCategoryChange = (category: string) => {
    const href = category === "All" ? "/news" : `/news?category=${encodeURIComponent(category)}`
    router.push(href)
    setIsOpen(false)
    setTimeout(() => window.scrollTo(0, 0), 0)
  }

  return (
    <>
      <div className="hidden md:flex flex-wrap gap-2 justify-center">
        {categories.map((category, index) => {
          const isActive = selectedCategory === category
          const href = category === "All" ? "/news" : `/news?category=${encodeURIComponent(category)}`

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={href}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-background border border-border hover:border-primary hover:text-primary"
                }`}
              >
                {category}
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="md:hidden relative w-full max-w-sm mx-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg flex items-center justify-between hover:border-primary transition-colors"
        >
          <span className="font-medium">{selectedCategory}</span>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {categories.map((category) => {
              const isActive = selectedCategory === category
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </motion.div>
        )}

        {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
      </div>
    </>
  )
}
