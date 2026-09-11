"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Mail, 
  FileCode, 
  ExternalLink,
  AlertCircle,
  Lock
} from "lucide-react"

interface CaseItem {
  id: string
  tracking_token: string
  full_name: string
  email: string
  phone: string
  destination_country: string
  nationality: string
  entry_date?: string
  exit_date?: string
  travel_start_date?: string
  travel_end_date?: string
  application_status: string
  payment_status: string
  payment_amount: number
  has_passport: boolean
  has_bank_statements: boolean
  has_employment_proof: boolean
  has_photos: boolean
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const [secret, setSecret] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem("ez_admin_secret")
    if (saved) {
      setSecret(saved)
      setIsAuthenticated(true)
      loadCases(saved, filterStatus, searchQuery)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!secret.trim()) return
    sessionStorage.setItem("ez_admin_secret", secret)
    setIsAuthenticated(true)
    loadCases(secret, filterStatus, searchQuery)
  }

  const loadCases = async (authSecret: string, status: string, search: string) => {
    setLoading(true)
    setActionError(null)
    try {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/cases?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authSecret}`,
        },
      })

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          sessionStorage.removeItem("ez_admin_secret")
          throw new Error("Invalid Admin Secret")
        }
        throw new Error("Failed to load cases")
      }

      const data = await res.json()
      setCases(data.cases || [])
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (caseItem: CaseItem, newStatus: string) => {
    setActionError(null)
    setActionMessage(null)
    try {
      const res = await fetch("/api/admin/cases", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          id: caseItem.id,
          application_status: newStatus,
          expected_updated_at: caseItem.updated_at,
          notes: `Updated status from ${caseItem.application_status} to ${newStatus}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update case")
      }

      setActionMessage(`Case #${caseItem.id.substring(0, 8)} updated to ${newStatus}`)
      loadCases(secret, filterStatus, searchQuery)
    } catch (err: any) {
      setActionError(err.message)
    }
  }

  const handleTriggerEmail = async (applicationId: string, event: string) => {
    setActionError(null)
    setActionMessage(null)
    try {
      const res = await fetch("/api/admin/trigger-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          event,
          application_id: applicationId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email")
      }

      setActionMessage(`Email event '${event}' dispatched successfully`)
      loadCases(secret, filterStatus, searchQuery)
    } catch (err: any) {
      setActionError(err.message)
    }
  }

  const handleGenerateDocuments = async (applicationId: string) => {
    setActionError(null)
    setActionMessage(null)
    try {
      const res = await fetch("/api/admin/generate-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          applicationId,
          version: 1,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate documents")
      }

      setActionMessage(`Documents generated successfully for case #${applicationId.substring(0, 8)}`)
      loadCases(secret, filterStatus, searchQuery)
    } catch (err: any) {
      setActionError(err.message)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Staff Case Management</h1>
          <p className="text-slate-400 text-sm mb-6">
            Enter the authorized staff secret to access case operations.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Admin Secret Key
              </label>
              <Input
                type="password"
                placeholder="Enter ADMIN_API_SECRET"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 h-12"
                required
              />
            </div>
            {actionError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {actionError}
              </p>
            )}
            <Button type="submit" className="w-full h-12 font-semibold bg-blue-600 hover:bg-blue-500 text-white">
              Authenticate
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Authorized Operations Console
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Visa Case Management</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCases(secret, filterStatus, searchQuery)}
              disabled={loading}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Cases
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("ez_admin_secret")
                setIsAuthenticated(false)
              }}
              className="text-slate-400 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {actionMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex flex-wrap gap-2">
            {["all", "submitted", "reviewing", "ready", "cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st)
                  loadCases(secret, st, searchQuery)
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterStatus === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <Input
                placeholder="Search name, email, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCases(secret, filterStatus, searchQuery)
                }}
                className="pl-9 bg-slate-950 border-slate-800 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <Button
              size="sm"
              onClick={() => loadCases(secret, filterStatus, searchQuery)}
              className="bg-slate-800 hover:bg-slate-700 text-white"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4 pl-6">Case Ref / Created</th>
                  <th className="p-4">Applicant & Destination</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Document Checklist</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Staff Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {loading ? "Loading cases..." : "No visa cases matching criteria"}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6">
                        <span className="font-mono text-xs text-blue-400 font-semibold block">
                          #{c.id.substring(0, 8)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-white">{c.full_name}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                        <div className="text-xs text-blue-300/80 mt-0.5 font-medium">
                          {c.destination_country} ({c.nationality})
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            c.payment_status === "paid" || c.payment_status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {c.payment_status}
                        </span>
                        <span className="text-xs text-slate-400 block mt-1">
                          {c.payment_amount ? `${c.payment_amount} AED` : "Standard"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.has_passport ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Passport
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.has_bank_statements ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Bank
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.has_employment_proof ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            NOC
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.has_photos ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            Photo
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                            c.application_status === "ready"
                              ? "bg-emerald-600 text-white"
                              : c.application_status === "reviewing"
                              ? "bg-blue-600 text-white"
                              : c.application_status === "cancelled"
                              ? "bg-rose-900/60 text-rose-300"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {c.application_status}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {c.application_status === "submitted" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(c, "reviewing")}
                              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                            >
                              Review
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTriggerEmail(c.id, "documents.requested")}
                            className="h-8 text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                          >
                            <Mail className="w-3 h-3 mr-1" /> Request Docs
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateDocuments(c.id)}
                            className="h-8 text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                          >
                            <FileCode className="w-3 h-3 mr-1" /> Generate
                          </Button>

                          {c.application_status !== "ready" && (
                            <Button
                              size="sm"
                              onClick={() => handleTriggerEmail(c.id, "documents.ready")}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Ready
                            </Button>
                          )}

                          <a
                            href={`/track/${c.tracking_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 inline-flex items-center"
                            title="View customer tracking page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
