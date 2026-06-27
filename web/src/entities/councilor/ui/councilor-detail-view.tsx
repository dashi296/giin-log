import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatBadge,
  Provenance,
} from "@/shared/ui"
import type { CouncilorDetail } from "../api/get-councilor-detail.js"
import { formatRate } from "../lib/format-rate.js"

export function CouncilorDetailView({ detail }: { detail: CouncilorDetail }) {
  const { councilor, membership, stats, timeline } = detail
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{councilor.name}</h1>
        {membership?.faction ? <Badge>{membership.faction}</Badge> : null}
        <Provenance
          sourceUrl={councilor.sourceUrl}
          updatedAt={councilor.updatedAt}
        />
      </header>

      {stats ? (
        <div className="flex gap-2">
          <StatBadge
            label="一般質問"
            value={String(stats.generalQuestionCount)}
          />
          <StatBadge label="発言件数" value={String(stats.statementCount)} />
          <StatBadge
            label="本会議出席率"
            value={formatRate(stats.honkaigiAttendanceRate)}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">活動タイムライン</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-neutral-500">記録がありません。</p>
        ) : (
          timeline.map((t) => (
            <Card key={t.statement.id}>
              <CardHeader>
                <CardTitle className="text-base">{t.statement.title}</CardTitle>
                <p className="text-xs text-neutral-500">
                  {t.meeting.heldOn} ・ {t.meeting.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.statement.body ? (
                  <p className="text-sm">{t.statement.body}</p>
                ) : null}
                <Provenance
                  sourceUrl={t.statement.sourceUrl}
                  updatedAt={t.statement.updatedAt}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  )
}
