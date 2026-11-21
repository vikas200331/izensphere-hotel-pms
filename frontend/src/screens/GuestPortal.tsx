import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Search,
  Calendar,
  Phone,
  Wifi,
  Clock,
  User,
  BedDouble,
  ShieldCheck,
  Building2,
  CreditCard,
} from "lucide-react"
import { call } from "../lib/api"
import { Button } from "../components/ui/button"
import { useT } from "../lib/i18n"
import { moneyLocale } from "../lib/money"

export interface BookingSummary {
  reservation: string
  property: string
  property_name: string
  property_slug: string
  city: string
  phone: string
  wifi_ssid: string
  wifi_password: string
  checkin_time: string
  checkout_time: string
  guest_name: string
  room_type: string
  room: string
  check_in_date: string
  check_out_date: string
  nights: number
  adults: number
  children: number
  status: string
  precheckin_status: string
  precheckin_token: string
  grand_total: number
  paid_amount: number
  balance: number
  currency_symbol: string
}

export default function GuestPortal() {
  const { t } = useT()
  const [searchParams] = useSearchParams()
  const [reference, setReference] = useState(searchParams.get("ref") || "")
  const [phone, setPhone] = useState(searchParams.get("phone") || "")
  const token = searchParams.get("token") || ""
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (overrideRef?: string, overridePhone?: string) => {
    const r = (overrideRef ?? reference).trim()
    const p = (overridePhone ?? phone).trim()
    if (!token && (!r || !p)) {
      setError(t("Please enter both your Booking Reference and Phone Number."))
      return
    }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await call<{ found: boolean; bookings: BookingSummary[] }>(
        "izensphere_stay_and_dine.public_api.lookup_booking",
        { reference: r, phone: p, token },
      )
      if (res.found && res.bookings.length > 0) {
        setBookings(res.bookings)
      } else {
        setBookings([])
        setError(t("No reservations found matching this booking reference and phone number."))
      }
    } catch (e: unknown) {
      setBookings([])
      setError((e as Error).message || t("Could not look up reservation. Please check your reference and phone."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const r = searchParams.get("ref")
    const p = searchParams.get("phone")
    if (token || (r && p)) {
      handleSearch(r || undefined, p || undefined)
    }
  }, [searchParams])

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "Confirmed":
      case "Checked In":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "Checked Out":
        return "bg-zinc-100 text-zinc-800 border-zinc-200"
      case "Cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200"
      default:
        return "bg-amber-100 text-amber-800 border-amber-200"
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-16">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm font-bold text-lg">
              IS
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                Izensphere Stay &amp; Dine
              </h1>
              <p className="text-xs text-zinc-500">{t("Guest Stay Portal & Booking Verification")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/book">
              <Button variant="outline" className="text-xs sm:text-sm">
                {t("Book a New Stay")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        {/* Search Hero */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {t("Find Your Booking")}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {t("Enter your Booking Reference and the Phone Number used during reservation to view your stay details and complete online check-in.")}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={t("Booking Reference (e.g. RES-2026-00030)")}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                placeholder={t("Guest Phone Number")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || (!token && (!reference.trim() || !phone.trim()))}
              className="justify-center py-3 px-6 text-sm font-semibold shrink-0"
            >
              {loading ? t("Searching…") : t("Look Up Stay")}
            </Button>
          </form>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        {searched && bookings.length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">
                {t("Your Reservations ({count})", { count: String(bookings.length) })}
              </h3>
            </div>

            {bookings.map((b) => (
              <div
                key={b.reservation}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                {/* Card Top Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-zinc-900">
                      {b.reservation}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeVariant(
                        b.status,
                      )}`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Building2 className="size-3.5" />
                    <span>{b.property_name}</span>
                    {b.city && <span>· {b.city}</span>}
                  </div>
                </div>

                {/* Card Content Grid */}
                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Stay Dates */}
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      {t("Stay Dates")}
                    </span>
                    <div className="mt-1.5 flex items-start gap-2 text-sm font-semibold text-zinc-900">
                      <Calendar className="mt-0.5 size-4 text-brand-600 shrink-0" />
                      <div>
                        <div>{b.check_in_date} → {b.check_out_date}</div>
                        <div className="text-xs font-normal text-zinc-500">
                          {b.nights} {b.nights === 1 ? t("night") : t("nights")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Room & Guests */}
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      {t("Accommodation")}
                    </span>
                    <div className="mt-1.5 flex items-start gap-2 text-sm font-semibold text-zinc-900">
                      <BedDouble className="mt-0.5 size-4 text-brand-600 shrink-0" />
                      <div>
                        <div>{b.room_type}</div>
                        <div className="text-xs font-normal text-zinc-500">
                          {b.room ? `${t("Room")} ${b.room}` : t("Room assigned on arrival")}
                        </div>
                        <div className="text-xs font-normal text-zinc-500">
                          {b.adults} {t("Adults")}{b.children > 0 ? `, ${b.children} ${t("Children")}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Balance */}
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      {t("Payment Summary")}
                    </span>
                    <div className="mt-1.5 text-sm">
                      <div className="flex items-baseline justify-between font-semibold text-zinc-900">
                        <span>{t("Total Amount")}:</span>
                        <span>{b.currency_symbol}{b.grand_total.toLocaleString(moneyLocale())}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between text-xs text-zinc-500">
                        <span>{t("Paid")}:</span>
                        <span>{b.currency_symbol}{b.paid_amount.toLocaleString(moneyLocale())}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between font-semibold text-xs text-emerald-700">
                        <span>{t("Balance Due")}:</span>
                        <span>{b.currency_symbol}{b.balance.toLocaleString(moneyLocale())}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Perks / Info */}
                <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 py-3 text-xs text-zinc-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-zinc-400 shrink-0" />
                    <span>{t("Check-in: {in} · Check-out: {out}", { in: b.checkin_time.slice(0, 5), out: b.checkout_time.slice(0, 5) })}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-zinc-400 shrink-0" />
                      <span>{t("Hotel Direct")}: {b.phone}</span>
                    </div>
                  )}
                  {b.wifi_ssid && (
                    <div className="flex items-center gap-2">
                      <Wifi className="size-3.5 text-zinc-400 shrink-0" />
                      <span>Wi-Fi: {b.wifi_ssid} (Pass: {b.wifi_password})</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <User className="size-3.5" />
                    <span>{t("Guest")}: <b>{b.guest_name}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.precheckin_token && (
                      <Link to={`/checkin/${b.precheckin_token}`}>
                        <Button className="gap-1.5 text-xs">
                          <ShieldCheck className="size-3.5" />
                          {b.precheckin_status === "Completed"
                            ? t("View Check-in Pass")
                            : t("Complete Online Check-in")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Helpful Info Section when idle */}
        {!searched && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <ShieldCheck className="size-6 text-brand-600" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">{t("Fast Self Check-in")}</h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {t("Upload ID and sign your registration card before arrival for express key pickup.")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <Clock className="size-6 text-brand-600" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">{t("Real-Time Status")}</h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {t("Check confirmed dates, room assignment, hotel Wi-Fi details, and stay policy.")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <CreditCard className="size-6 text-brand-600" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">{t("Folio & Balance")}</h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {t("View transparent billing breakdown with room rate, GST, and advance deposit payments.")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
