import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value: number;
}

export default function StatsCard({ icon: Icon, iconColor, iconBgColor, label, value }: StatsCardProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h3 className="text-sm text-zinc-400">{label}</h3>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
