"use client";

import type { KeyboardEvent, RefObject } from "react";
import { Plus, X } from "lucide-react";
import { formatCount, formatDisplayTagLabel } from "@/lib/utils";
import type { CreateTag } from "@/components/create/types";

interface CreateTagInputProps {
  label: string;
  tags: CreateTag[];
  maxTags: number;
  tagSearch: string;
  tagSuggestions: CreateTag[];
  tagHighlight: number;
  tagCreating: boolean;
  placeholder: string;
  createLabel: string;
  postsCountLabel: string;
  tagUnitLabel: string;
  autocompleteRef: RefObject<HTMLDivElement | null>;
  locale?: string;
  onTagSearchChange: (value: string) => void;
  onTagKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onTagFocus: () => void;
  onTagHighlight: (index: number) => void;
  onAddTag: (tag: CreateTag) => void;
  onCreateTag: () => void;
  onRemoveTag: (tagId: number | string) => void;
}

export default function CreateTagInput({
  label,
  tags,
  maxTags,
  tagSearch,
  tagSuggestions,
  tagHighlight,
  tagCreating,
  placeholder,
  createLabel,
  postsCountLabel,
  tagUnitLabel,
  autocompleteRef,
  locale,
  onTagSearchChange,
  onTagKeyDown,
  onTagFocus,
  onTagHighlight,
  onAddTag,
  onCreateTag,
  onRemoveTag,
}: CreateTagInputProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      {tags.length < maxTags && (
        <div ref={autocompleteRef} className="relative">
          <input
            type="text"
            value={tagSearch}
            onChange={(event) => onTagSearchChange(event.target.value)}
            onKeyDown={onTagKeyDown}
            maxLength={30}
            onFocus={onTagFocus}
            placeholder={placeholder}
            className="input-modern w-full !pr-[110px]"
          />
          {tagSuggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 mb-[7px] bg-bg-secondary border border-border-primary rounded-[13px] z-10 max-h-48 overflow-y-auto"
              onMouseDown={(event) => event.preventDefault()}
            >
              {tagSuggestions.map((tag, index) => (
                <button
                  type="button"
                  key={tag.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onAddTag(tag)}
                  onMouseEnter={() => onTagHighlight(index)}
                  className={`w-full text-left px-4 py-3.5 text-[0.88rem] transition flex items-center border-b border-border-primary/40 last:border-b-0 ${
                    index === tagHighlight ? "bg-accent-main/10 text-accent-main" : "text-text-primary hover:bg-bg-tertiary"
                  }`}
                >
                  <span className="text-accent-main">#</span>
                  <span className="font-semibold truncate">{tag.name}</span>
                  {tag.post_count !== undefined && (
                    <span className="ml-auto text-[0.7rem] text-text-muted font-medium shrink-0 pl-2">
                      {formatCount(tag.post_count || 0, locale)} {postsCountLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {tagSearch.trim() && tagSuggestions.length === 0 && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onCreateTag}
              disabled={tagCreating}
              className="absolute right-3 inset-y-0 my-auto flex items-center gap-1 text-xs font-semibold text-accent-main hover:underline disabled:opacity-50 tag-create-btn"
            >
              {tagCreating ? (
                <span className="flex items-center justify-center" style={{ width: 27, height: 27 }}>
                  <span className="loader" style={{ width: 14, height: 14, borderTopColor: "var(--accent-color)" }} />
                </span>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {createLabel}
                </>
              )}
            </button>
          )}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag) => (
            <span key={tag.id} className="flex items-center gap-1.5 bg-accent-main/10 text-accent-main text-sm font-medium px-3 py-1.5 rounded-full">
              <span title={`#${tag.name}`}>{formatDisplayTagLabel(tag.name)}</span>
              <button onClick={() => onRemoveTag(tag.id)} className="hover:text-error transition">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-text-muted mt-1.5 text-right font-semibold mr-2">
        {tags.length}/{maxTags} {tagUnitLabel}
      </p>
    </div>
  );
}
