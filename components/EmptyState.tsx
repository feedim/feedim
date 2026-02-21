import Link from "next/link";
import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode | { label: string; href?: string; onClick?: () => void };
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 sm:py-20">
      {icon && (
        <div className="flex justify-center mb-3 sm:mb-4 text-text-muted">
          {icon}
        </div>
      )}
      <h2 className="text-lg sm:text-xl font-bold mb-2">{title}</h2>
      <p className="text-[13px] text-text-muted mb-5 sm:mb-6 px-4 max-w-[300px] mx-auto">{description}</p>
      {action && (
        typeof action === "object" && action !== null && "label" in action ? (
          action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-bg-inverse text-bg-primary text-sm font-semibold hover:opacity-90 transition"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-bg-inverse text-bg-primary text-sm font-semibold hover:opacity-90 transition"
            >
              {action.label}
            </button>
          )
        ) : action
      )}
    </div>
  );
}
