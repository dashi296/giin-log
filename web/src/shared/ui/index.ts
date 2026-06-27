// shadcn プリミティブの唯一の公開窓口(上位層はここからのみ import する)
export { Button } from "@/shadcn/ui/button"
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/shadcn/ui/card"
export { Badge } from "@/shadcn/ui/badge"
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shadcn/ui/select"
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shadcn/ui/table"
export { Skeleton } from "@/shadcn/ui/skeleton"

export { Provenance } from "./provenance.js"
export { StatBadge } from "./stat-badge.js"
