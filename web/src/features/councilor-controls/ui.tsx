import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui"
import type { SortKey } from "./model.js"

const ALL = "__all__"

export function CouncilorControls({
  factions,
  faction,
  sort,
  onFactionChange,
  onSortChange,
}: {
  factions: string[]
  faction: string | null
  sort: SortKey
  onFactionChange: (f: string | null) => void
  onSortChange: (s: SortKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-sm">
        会派で絞り込み
        <Select
          value={faction ?? ALL}
          onValueChange={(v) => onFactionChange(v === ALL ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべて</SelectItem>
            {factions.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        並べ替え
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kana">氏名(かな)</SelectItem>
            <SelectItem value="questions">一般質問が多い順</SelectItem>
            <SelectItem value="attendance">本会議出席率が高い順</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}
