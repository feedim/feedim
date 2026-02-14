import { Heart } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 sm:py-20">
      <Heart className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4" strokeWidth={1.2} />
      <h2 className="text-lg sm:text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-zinc-400 mb-5 sm:mb-6 px-4">{description}</p>
      {action}
    </div>
  );
}
