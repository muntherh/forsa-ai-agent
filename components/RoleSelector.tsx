"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EXPERIENCE_LEVELS, ROLE_CATEGORIES, type RoleOption } from "@/lib/roles";

interface RoleSelectorProps {
  role: string;
  onRoleChange: (role: string) => void;
  level: string;
  onLevelChange: (level: string) => void;
}

const SPRING = { type: "spring", damping: 20, stiffness: 300 } as const;

function matchesSearch(option: RoleOption, query: string): boolean {
  const q = query.toLowerCase();
  return option.label.toLowerCase().includes(q) || (option.keywords ?? []).some((k) => k.toLowerCase().includes(q));
}

export default function RoleSelector({ role, onRoleChange, level, onLevelChange }: RoleSelectorProps) {
  const searchId = useId();
  const customId = useId();
  const [activeCategoryId, setActiveCategoryId] = useState(ROLE_CATEGORIES[0].id);
  const [search, setSearch] = useState("");
  // Local draft for the custom-role input, so it renders whatever the
  // candidate is typing even before/after it stops being the "winning"
  // value (e.g. right after they click a category card, which clears it).
  const [customDraft, setCustomDraft] = useState("");

  const isCustomActive = useMemo(
    () => role !== "" && !ROLE_CATEGORIES.some((category) => category.roles.some((r) => r.label === role)),
    [role]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return ROLE_CATEGORIES.map((category) => ({
      ...category,
      roles: category.roles.filter((r) => matchesSearch(r, search)),
    })).filter((category) => category.roles.length > 0);
  }, [search]);

  const activeCategory = ROLE_CATEGORIES.find((c) => c.id === activeCategoryId) ?? ROLE_CATEGORIES[0];
  const visibleCategories = searchResults ?? [activeCategory];

  function pickRole(label: string) {
    setCustomDraft("");
    onRoleChange(label);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">Target role</label>
        <div className="relative w-40 sm:w-52">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted dark:text-dark-muted"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roles…"
            className="w-full rounded-full border border-line bg-white py-1.5 pl-8 pr-3 text-xs text-navy placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:focus:ring-indigo"
          />
        </div>
      </div>

      {!searchResults && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ROLE_CATEGORIES.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-muted hover:text-navy dark:text-dark-muted dark:hover:text-dark-text"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="category-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full bg-navy dark:bg-indigo"
                  />
                )}
                <span className="relative">{category.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-4">
        {visibleCategories.map((category) => (
          <div key={category.id}>
            {searchResults && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
                {category.label}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {category.roles.map((option) => {
                const isSelected = option.label === role;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    onClick={() => pickRole(option.label)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-teal bg-teal/10 text-teal-dark dark:border-emerald dark:bg-emerald/10 dark:text-emerald-glow"
                        : "border-line bg-white text-navy hover:border-blue dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:border-indigo"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
        {searchResults && searchResults.length === 0 && (
          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted dark:border-dark-border dark:text-dark-muted">
            No roles match “{search}” — try the custom role field below.
          </p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor={customId} className="block text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
          Not listed? Describe your role
        </label>
        <input
          id={customId}
          type="text"
          value={customDraft}
          onChange={(event) => {
            const value = event.target.value;
            setCustomDraft(value);
            onRoleChange(value.trim() ? value : (activeCategory.roles[0]?.label ?? ""));
          }}
          placeholder="e.g. Senior Platform Engineer, Growth Marketing Lead…"
          className={`mt-2 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-navy placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue dark:bg-dark-surface dark:text-dark-text dark:focus:ring-indigo ${
            isCustomActive ? "border-teal dark:border-emerald" : "border-line dark:border-dark-border"
          }`}
        />
        <p className="mt-1.5 text-xs text-muted dark:text-dark-muted">
          Ava will tailor the interview persona and questions to whatever you type here.
        </p>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">Experience level</label>
        <div className="mt-2 flex rounded-full border border-line bg-bg p-1 dark:border-dark-border dark:bg-dark-surface">
          {EXPERIENCE_LEVELS.map((option) => {
            const isActive = option === level;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onLevelChange(option)}
                className={`relative flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                  isActive ? "text-white" : "text-muted hover:text-navy dark:text-dark-muted dark:hover:text-dark-text"
                }`}
              >
                {isActive && (
                  <motion.span layoutId="level-pill" transition={SPRING} className="absolute inset-0 rounded-full bg-blue dark:bg-indigo" />
                )}
                <span className="relative">{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
