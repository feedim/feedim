import type { ReactNode } from "react";

export interface HelpArticle {
  question: string;
  answer: ReactNode;
  searchText: string;
  section: string;
}

export interface HelpPageLink {
  title: string;
  href: string;
  description: string;
}

export interface HelpSection {
  id: string;
  label: string;
}
