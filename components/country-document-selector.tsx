"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { COUNTRY_DATA, getCountryUrl } from "@/lib/countries"

export function CountryDocumentSelector() {
  const [selectedCountry, setSelectedCountry] = useState("")
  const router = useRouter()

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryName = e.target.value
    setSelectedCountry(countryName)
    
    if (countryName) {
      const url = getCountryUrl(countryName)
      router.push(url)
    }
  }

  return (
    <section className="mt-16 pt-16 border-t border-border">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl text-foreground mb-3 font-medium">
            Check Required Documents by Country
          </h2>
          <div className="w-16 h-1 bg-primary mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl">
            Select your destination country to view the specific document requirements for your visa application
          </p>
        </div>

        {/* Country Selector */}
        <div className="relative inline-block w-full">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="w-full h-14 px-4 pr-12 text-base bg-white dark:bg-card border-2 border-border rounded-lg appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-foreground"
          >
            <option value="">Select a country...</option>
            {COUNTRY_DATA.map((country) => (
              <option key={country.slug} value={country.name}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-50 bg-white dark:bg-card px-1">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M6 9L12 15L18 9" 
                stroke="#000000" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Helper Text */}
        <p className="mt-4 text-sm text-muted-foreground">
          Each country may have slightly different requirements. Make sure to check the specific requirements for your destination.
        </p>
      </div>
    </section>
  )
}
