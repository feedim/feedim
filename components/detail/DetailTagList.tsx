import Link from "next/link";
import { formatDisplayTagLabel } from "@/lib/utils";

interface DetailTag {
  id: number | string;
  name: string;
  slug: string;
}

interface DetailTagListProps {
  tags: DetailTag[];
  className?: string;
}

export default function DetailTagList({
  tags,
  className = "flex flex-wrap gap-2 mt-[9px] mb-[6px]",
}: DetailTagListProps) {
  if (tags.length === 0) return null;

  return (
    <div className={className}>
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/explore/tag/${tag.slug}`}
          title={`#${tag.name}`}
          className="bg-bg-secondary text-text-primary text-[0.78rem] font-bold px-4 py-1 rounded-full transition hover:bg-bg-tertiary"
        >
          {formatDisplayTagLabel(tag.name)}
        </Link>
      ))}
    </div>
  );
}
