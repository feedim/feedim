import { PROFESSIONAL_CATEGORIES } from "@/lib/constants";

export function getCategoryLabelKey(accountType: string, categoryValue: string): string {
  const cats = accountType === "creator" ? PROFESSIONAL_CATEGORIES.creator : PROFESSIONAL_CATEGORIES.business;
  const cat = cats.find(c => c.value === categoryValue);
  return cat ? cat.labelKey.split('.')[1] : categoryValue;
}

export function isProfessional(accountType?: string): boolean {
  return accountType === "creator" || accountType === "business";
}
