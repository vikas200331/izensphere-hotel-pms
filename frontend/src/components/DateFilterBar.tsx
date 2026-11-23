import { useMemo } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useT, uiDateLocale } from "../lib/i18n"
import { cn } from "../lib/utils"
import { parseDate, shiftDate, isoDate } from "../lib/stay"

export interface DateFieldOption {
  id: string
  label: string
}

export type PresetKey =
  | "today"
  | "yesterday"
  | "tomorrow"
  | "this_week"
  | "last_week"
  | "next_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"

export interface DateFilterBarProps {
  /** "single" for day-wise view (e.g. Room Status Board, Ledgers, Dashboard),
   *  "range" for date intervals (e.g. Reservations, Folios, Tickets, Reports) */
  mode?: "single" | "range"

  /** Currently selected date in YYYY-MM-DD (single mode) */
  date?: string
  onDateChange?: (date: string) => void

  /** Currently selected range in YYYY-MM-DD (range mode) */
  fromDate?: string
  toDate?: string
  onRangeChange?: (from: string, to: string) => void

  /** Currently selected field name (when multiple fields are applicable) */
  selectedField?: string
  fieldOptions?: DateFieldOption[]
  onFieldChange?: (field: string) => void

  /** Custom title or section label */
  label?: string
  className?: string
  compact?: boolean

  /** Quick navigation buttons (Prev / Next) */
  showNavigation?: boolean

  /** Quick preset chips */
  showPresets?: boolean

  /** Clear button */
  showClear?: boolean

  /** List of presets to display (defaults to common set) */
  customPresets?: PresetKey[]
}

const pad = (n: number) => String(n).padStart(2, "0")

export function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function calculateDateRange(preset: PresetKey): { from: string; to: string } {
  const now = new Date()
  const todayStr = getToday()

  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr }

    case "yesterday": {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      const s = isoDate(y)
      return { from: s, to: s }
    }

    case "tomorrow": {
      const t = new Date(now)
      t.setDate(now.getDate() + 1)
      const s = isoDate(t)
      return { from: s, to: s }
    }

    case "this_week": {
      const dayOfWeek = (now.getDay() + 6) % 7 // 0=Mon, 6=Sun
      const mon = new Date(now)
      mon.setDate(now.getDate() - dayOfWeek)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { from: isoDate(mon), to: isoDate(sun) }
    }

    case "last_week": {
      const dayOfWeek = (now.getDay() + 6) % 7
      const mon = new Date(now)
      mon.setDate(now.getDate() - dayOfWeek - 7)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { from: isoDate(mon), to: isoDate(sun) }
    }

    case "next_week": {
      const dayOfWeek = (now.getDay() + 6) % 7
      const mon = new Date(now)
      mon.setDate(now.getDate() - dayOfWeek + 7)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { from: isoDate(mon), to: isoDate(sun) }
    }

    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: isoDate(start), to: isoDate(end) }
    }

    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: isoDate(start), to: isoDate(end) }
    }

    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      const end = new Date(now.getFullYear(), (q + 1) * 3, 0)
      return { from: isoDate(start), to: isoDate(end) }
    }

    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3)
      const prevQYear = q === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const prevQ = q === 0 ? 3 : q - 1
      const start = new Date(prevQYear, prevQ * 3, 1)
      const end = new Date(prevQYear, (prevQ + 1) * 3, 0)
      return { from: isoDate(start), to: isoDate(end) }
    }

    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { from: isoDate(start), to: isoDate(end) }
    }

    case "last_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const end = new Date(now.getFullYear() - 1, 11, 31)
      return { from: isoDate(start), to: isoDate(end) }
    }

    default:
      return { from: todayStr, to: todayStr }
  }
}

export function formatFriendlyDate(isoStr?: string): string {
  if (!isoStr) return ""
  const d = parseDate(isoStr)
  if (!d) return isoStr
  return d.toLocaleDateString(uiDateLocale(undefined), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatFriendlyRange(from?: string, to?: string): string {
  if (!from && !to) return ""
  if (from && !to) return `From ${formatFriendlyDate(from)}`
  if (!from && to) return `Until ${formatFriendlyDate(to)}`
  if (from === to) return formatFriendlyDate(from)
  return `${formatFriendlyDate(from)} – ${formatFriendlyDate(to)}`
}

export default function DateFilterBar({
  mode = "range",
  date = "",
  onDateChange,
  fromDate = "",
  toDate = "",
  onRangeChange,
  selectedField,
  fieldOptions,
  onFieldChange,
  label,
  className,
  compact = false,
  showNavigation = true,
  showPresets = true,
  showClear = true,
  customPresets,
}: DateFilterBarProps) {
  const { t } = useT()
  const todayStr = useMemo(() => getToday(), [])

  const singlePresets: { key: PresetKey; label: string }[] = useMemo(
    () => [
      { key: "yesterday", label: t("Yesterday") },
      { key: "today", label: t("Today") },
      { key: "tomorrow", label: t("Tomorrow") },
    ],
    [t],
  )

  const defaultRangePresets: { key: PresetKey; label: string }[] = useMemo(
    () => [
      { key: "today", label: t("Today") },
      { key: "yesterday", label: t("Yesterday") },
      { key: "this_week", label: t("This Week") },
      { key: "last_week", label: t("Last Week") },
      { key: "this_month", label: t("This Month") },
      { key: "last_month", label: t("Last Month") },
      { key: "this_quarter", label: t("This Quarter") },
      { key: "this_year", label: t("This Year") },
    ],
    [t],
  )

  const activeRangePreset = useMemo(() => {
    if (!fromDate && !toDate) return null
    for (const p of defaultRangePresets) {
      const r = calculateDateRange(p.key)
      if (r.from === fromDate && r.to === toDate) {
        return p.key
      }
    }
    return null
  }, [fromDate, toDate, defaultRangePresets])

  // Single date navigation
  const handlePrevDay = () => {
    const cur = date || todayStr
    const prev = shiftDate(cur, -1)
    if (prev && onDateChange) onDateChange(prev)
  }

  const handleNextDay = () => {
    const cur = date || todayStr
    const next = shiftDate(cur, 1)
    if (next && onDateChange) onDateChange(next)
  }

  const handleSinglePreset = (preset: PresetKey) => {
    const r = calculateDateRange(preset)
    if (onDateChange) onDateChange(r.from)
  }

  // Range navigation (shifts range by its span in days, minimum 1 day)
  const handleShiftRange = (direction: -1 | 1) => {
    if (!onRangeChange) return
    const f = parseDate(fromDate || todayStr)
    const tDate = parseDate(toDate || fromDate || todayStr)
    if (!f || !tDate) return
    const spanDays = Math.max(
      1,
      Math.round((tDate.getTime() - f.getTime()) / 86400000) + 1,
    )
    const newFrom = shiftDate(isoDate(f), direction * spanDays)
    const newTo = shiftDate(isoDate(tDate), direction * spanDays)
    onRangeChange(newFrom, newTo)
  }

  const handleRangePreset = (preset: PresetKey) => {
    if (!onRangeChange) return
    const r = calculateDateRange(preset)
    onRangeChange(r.from, r.to)
  }

  const handleClear = () => {
    if (mode === "single") {
      if (onDateChange) onDateChange(todayStr)
    } else {
      if (onRangeChange) onRangeChange("", "")
    }
  }

  const inputCls =
    "min-h-9 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 shadow-sm " +
    "focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"

  const btnCls = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-sm",
      active
        ? "border-brand-600 bg-brand-50 text-brand-800 font-semibold"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
    )

  if (mode === "single") {
    const isToday = (date || todayStr) === todayStr

    return (
      <div
        className={cn(
          "flex flex-wrap items-center rounded-xl border border-zinc-200/80 bg-zinc-50/60",
          compact ? "gap-1 p-1.5 text-[11px]" : "gap-2 p-2 text-xs",
          className,
        )}
      >
        {label && (
          <div className="flex items-center gap-1 font-semibold text-zinc-700 mr-1">
            <Calendar className="size-3.5 text-brand-600" />
            <span>{t(label)}</span>
          </div>
        )}

        {/* Quick Presets */}
        {showPresets && (
          <div className="flex items-center gap-1">
            {singlePresets.map((sp) => {
              const r = calculateDateRange(sp.key)
              const isMatch = (date || todayStr) === r.from
              return (
                <button
                  key={sp.key}
                  type="button"
                  onClick={() => handleSinglePreset(sp.key)}
                  className={btnCls(isMatch)}
                >
                  {sp.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Date Stepper and Picker */}
        <div className="flex items-center gap-1">
          {showNavigation && (
            <button
              type="button"
              onClick={handlePrevDay}
              title={t("Previous day")}
              aria-label={t("Previous day")}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}

          <input
            type="date"
            aria-label={t("Select date")}
            className={inputCls}
            value={date || todayStr}
            onChange={(e) => onDateChange && onDateChange(e.target.value)}
          />

          {showNavigation && (
            <button
              type="button"
              onClick={handleNextDay}
              title={t("Next day")}
              aria-label={t("Next day")}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>

        {/* Display friendly date string */}
        <span className="font-medium text-zinc-600 ml-1">
          {formatFriendlyDate(date || todayStr)}
        </span>

        {/* Clear/Reset to Today */}
        {showClear && !isToday && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700"
            title={t("Reset to Today")}
          >
            <RotateCcw className="size-3" />
            {t("Reset")}
          </button>
        )}
      </div>
    )
  }

  // Range Mode
  const rangePresets = customPresets
    ? defaultRangePresets.filter((p) => customPresets.includes(p.key))
    : defaultRangePresets

  return (
    <div
      className={cn(
        "flex flex-wrap items-center rounded-xl border border-zinc-200/80 bg-zinc-50/60",
        compact ? "gap-1 p-1.5 text-[11px]" : "gap-2 p-2 text-xs",
        className,
      )}
    >
      {/* Optional Field Selector */}
      {fieldOptions && fieldOptions.length > 0 && onFieldChange && (
        <div className="flex items-center gap-1 mr-1">
          <SlidersHorizontal className="size-3.5 text-zinc-400" />
          <select
            className={cn(inputCls, "font-medium text-zinc-700")}
            value={selectedField || fieldOptions[0]?.id}
            onChange={(e) => onFieldChange(e.target.value)}
            aria-label={t("Date field to filter by")}
          >
            {fieldOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preset Chips */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1">
          {rangePresets.map((p) => {
            const isMatch = activeRangePreset === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleRangePreset(p.key)}
                className={btnCls(isMatch)}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Range inputs with stepper */}
      <div className="flex items-center gap-1">
        {showNavigation && (fromDate || toDate) && (
          <button
            type="button"
            onClick={() => handleShiftRange(-1)}
            title={t("Previous period")}
            aria-label={t("Previous period")}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        <input
          type="date"
          aria-label={t("From date")}
          className={inputCls}
          value={fromDate}
          placeholder={t("From")}
          onChange={(e) => onRangeChange && onRangeChange(e.target.value, toDate)}
        />
        <span className="text-zinc-400">→</span>
        <input
          type="date"
          aria-label={t("To date")}
          className={inputCls}
          value={toDate}
          min={fromDate || undefined}
          placeholder={t("To")}
          onChange={(e) => onRangeChange && onRangeChange(fromDate, e.target.value)}
        />

        {showNavigation && (fromDate || toDate) && (
          <button
            type="button"
            onClick={() => handleShiftRange(1)}
            title={t("Next period")}
            aria-label={t("Next period")}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-100"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {/* Clear button */}
      {showClear && (fromDate || toDate) && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700"
        >
          <X className="size-3" />
          {t("Clear")}
        </button>
      )}
    </div>
  )
}
