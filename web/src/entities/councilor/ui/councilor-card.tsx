import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Provenance,
  StatBadge,
} from "@/shared/ui"
import type { CouncilorListItem } from "../model/index.js"
import { formatRate } from "../lib/format-rate.js"

export function CouncilorCard({ item }: { item: CouncilorListItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        {item.faction ? <Badge>{item.faction}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <StatBadge
            label="一般質問"
            value={String(item.generalQuestionCount)}
          />
          <StatBadge
            label="本会議出席率"
            value={formatRate(item.honkaigiAttendanceRate)}
          />
        </div>
        <Provenance sourceUrl={item.sourceUrl} updatedAt={item.updatedAt} />
      </CardContent>
    </Card>
  )
}
