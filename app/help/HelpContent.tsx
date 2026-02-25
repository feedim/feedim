"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Search, ChevronRight, X, HelpCircle, Mail,
} from "lucide-react";
import type { HelpArticle, HelpPageLink, HelpSection } from "./articles.types";

import {
  sections as sectionsTr,
  pageLinks as pageLinksTr,
  articles as articlesTr,
} from "./articles.tr";
import {
  sections as sectionsEn,
  pageLinks as pageLinksEn,
  articles as articlesEn,
} from "./articles.en";
import {
  sections as sectionsAz,
  pageLinks as pageLinksAz,
  articles as articlesAz,
} from "./articles.az";

const lnk = "text-accent-main hover:opacity-80 font-semibold";

const localeData: Record<string, {
  sections: HelpSection[];
  pageLinks: HelpPageLink[];
  articles: HelpArticle[];
}> = {
  tr: { sections: sectionsTr, pageLinks: pageLinksTr, articles: articlesTr },
  en: { sections: sectionsEn, pageLinks: pageLinksEn, articles: articlesEn },
  az: { sections: sectionsAz, pageLinks: pageLinksAz, articles: articlesAz },
};

export default function HelpContent() {
  const locale = useLocale();
  const t = useTranslations("helpCenter");

  const { sections, pageLinks, articles } = localeData[locale] || localeData.en;

  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const filteredArticles = useMemo(() => {
    if (!query) return [];
    return articles.filter(
      (a) =>
        a.question.toLowerCase().includes(query) ||
        a.searchText.toLowerCase().includes(query)
    );
  }, [query, articles]);

  const filteredPages = useMemo(() => {
    if (!query) return [];
    return pageLinks.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [query, pageLinks]);

  const clearSearch = () => {
    setSearch("");
    inputRef.current?.focus();
  };

  const toggleItem = (key: string) => {
    setOpenItem(openItem === key ? null : key);
  };

  return (
    <>
      {/* Hero + Search */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t("heroTitle")}</h1>
        <p className="text-text-muted mb-8">{t("heroSubtitle")}</p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full h-14 rounded-2xl border border-border-primary bg-bg-secondary text-text-primary text-[0.95rem] outline-none transition-colors focus:border-text-muted"
            style={{ paddingLeft: 52, paddingRight: 48 }}
            autoComplete="off"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-bg-tertiary transition">
              <X className="h-4 w-4 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="mb-8">
          {/* Page Results */}
          {filteredPages.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-3 font-medium">{t("pagesLabel")}</p>
              <div className="space-y-2">
                {filteredPages.map((page, i) => (
                  <Link
                    key={`${page.href}-${i}`}
                    href={page.href}
                    className="flex items-center justify-between px-5 py-3.5 rounded-[13px] bg-bg-secondary hover:opacity-80 transition-opacity"
                  >
                    <div>
                      <span className="text-[0.95rem] font-semibold">{page.title}</span>
                      <span className="block text-[0.7rem] text-text-muted mt-0.5">{page.description}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Article Results */}
          <p className="text-xs text-text-muted mb-4">
            {filteredArticles.length > 0
              ? t("resultsFound", { count: filteredArticles.length })
              : filteredPages.length === 0 ? t("noResultsFound") : t("noArticlesFound")}
          </p>
          {filteredArticles.length > 0 ? (
            <div className="space-y-2.5">
              {filteredArticles.map((article, i) => {
                const key = `search-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-[0.95rem] font-semibold">{article.question}</span>
                        <span className="block text-[0.7rem] text-text-muted mt-0.5">
                          {sections.find((s) => s.id === article.section)?.label}
                        </span>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pt-2 pb-5 text-sm text-text-secondary leading-relaxed">
                        {article.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-text-secondary mb-1">{t("noResultsTitle")}</p>
              <p className="text-sm text-text-muted">
                {t("noResultsTryAgain")}{" "}
                <Link href="/help/contact" className={lnk}>{t("noResultsContactUs")}</Link>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Sections */}
      {!isSearching && (
        <div className="space-y-2.5">
          {sections.map((section) => {
            const sectionArticles = articles.filter((a) => a.section === section.id);
            const isSectionOpen = openSection === section.id;
            return (
              <div key={section.id} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                <button
                  onClick={() => {
                    setOpenSection(isSectionOpen ? null : section.id);
                    setOpenItem(null);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-[0.95rem] font-bold text-text-primary">{section.label}</span>
                    <span className="block text-[0.7rem] text-text-muted mt-0.5">{t("articlesCount", { count: sectionArticles.length })}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isSectionOpen ? "rotate-90" : ""}`} />
                </button>
                {isSectionOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {sectionArticles.map((article, i) => {
                      const key = `${section.id}-${i}`;
                      const isOpen = openItem === key;
                      return (
                        <div key={key} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity text-left"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <span className="text-[0.95rem] font-semibold text-text-primary">{article.question}</span>
                              <span className="block text-[0.7rem] text-text-muted mt-0.5">{section.label}</span>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          </button>
                          {isOpen && (
                            <div className="px-5 pt-2 pb-5 text-sm text-text-secondary leading-relaxed">
                              {article.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* CTA */}
          <div className="mt-14 rounded-2xl bg-accent-main/[0.06] p-8 sm:p-10 text-center">
            <HelpCircle className="h-10 w-10 text-accent-main mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">{t("ctaTitle")}</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">{t("ctaDescription")}</p>
            <Link href="/help/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-main text-white font-semibold text-sm hover:opacity-90 transition">
              <Mail className="h-4 w-4" /> {t("ctaButton")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
