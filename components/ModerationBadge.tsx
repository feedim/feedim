import { Clock, XCircle, CheckCircle } from "lucide-react";

interface ModerationBadgeProps {
  label?: string;
  variant?: "review" | "rejected" | "approved";
  className?: string;
}

export default function ModerationBadge({ label = "İçeriğiniz inceleniyor", variant = "review", className = "" }: ModerationBadgeProps) {
  const styles = {
    review: { bg: "bg-[var(--accent-color)]/10", text: "text-[var(--accent-color)]", Icon: Clock },
    rejected: { bg: "bg-error/10", text: "text-error", Icon: XCircle },
    approved: { bg: "bg-success/10", text: "text-success", Icon: CheckCircle },
  };
  const s = styles[variant];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 ${s.bg} ${s.text} text-xs font-medium rounded-lg w-fit ${className}`}>
      <s.Icon size={12} />
      <span>{label}</span>
    </div>
  );
}
