"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXPERIENCE_LEVELS, ROLE_CATEGORIES, type RoleOption } from "@/lib/roles";

interface RoleSelectorProps {
  role: string;
  onRoleChange: (role: string) => void;
  level: string;
  onLevelChange: (level: string) => void;
}

/** Snappy spring for tactile feedback (taps, hovers, the sliding indicator). */
const SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

/** One flat, keyboard-navigable row of the command menu. */
type MenuRow =
  | { kind: "role"; key: string; label: string; categoryId: string; categoryLabel: string }
  | { kind: "custom"; key: string; label: string };

function matches(option: RoleOption, query: string): boolean {
  const q = query.toLowerCase();
  return option.label.toLowerCase().includes(q) || (option.keywords ?? []).some((k) => k.toLowerCase().includes(q));
}

export default function RoleSelector({ role, onRoleChange, level, onLevelChange }: RoleSelectorProps) {
  const listId = useId();
  const rowIdPrefix = useId();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  // The flat row list drives both rendering and keyboard navigation, so the
  // highlighted index can never disagree with what's on screen.
  const rows = useMemo<MenuRow[]>(() => {
    const result: MenuRow[] = [];
    for (const category of ROLE_CATEGORIES) {
      if (categoryFilter && category.id !== categoryFilter) continue;
      for (const option of category.roles) {
        if (trimmedQuery && !matches(option, trimmedQuery)) continue;
        result.push({
          kind: "role",
          key: option.id,
          label: option.label,
          categoryId: category.id,
          categoryLabel: category.label,
        });
      }
    }
    // The custom-role escape hatch: any typed text that isn't already an
    // exact role name can be used verbatim as the interview role.
    const exactExists = ROLE_CATEGORIES.some((c) =>
      c.roles.some((r) => r.label.toLowerCase() === trimmedQuery.toLowerCase())
    );
    if (trimmedQuery && !exactExists) {
      result.push({ kind: "custom", key: "__custom__", label: trimmedQuery });
    }
    return result;
  }, [trimmedQuery, categoryFilter]);

  // Any change to the result set re-aims the highlight at the top, so Enter
  // never fires on a row that scrolled out from under it.
  useEffect(() => {
    setHighlight(0);
  }, [trimmedQuery, categoryFilter]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${highlight}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const isCustomRole = useMemo(
    () => role !== "" && !ROLE_CATEGORIES.some((c) => c.roles.some((r) => r.label === role)),
    [role]
  );

  function commit(row: MenuRow) {
    onRoleChange(row.label);
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[highlight];
      if (row) commit(row);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
    }
  }

  // Group consecutive rows by category for the section headers, without
  // losing each row's flat index (which the keyboard nav depends on).
  const grouped: { categoryLabel: string | null; rows: { row: MenuRow; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    const label = row.kind === "role" ? row.categoryLabel : null;
    const last = grouped[grouped.length - 1];
    if (last && last.categoryLabel === label) last.rows.push({ row, index });
    else grouped.push({ categoryLabel: label, rows: [{ row, index }] });
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`${rowIdPrefix}-input`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted dark:text-dark-muted">
          Target role
        </label>
        <span className="text-[11px] text-muted/70 dark:text-dark-muted/70">↑↓ to browse · ⏎ to select</span>
      </div>

      {/* The command menu */}
      <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3 dark:border-white/10">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0 text-muted dark:text-dark-muted">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={`${rowIdPrefix}-input`}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows[highlight] ? `${rowIdPrefix}-row-${highlight}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search roles, or type your own…"
            className="w-full bg-transparent text-sm text-navy placeholder:text-muted/80 focus:outline-none dark:text-dark-text dark:placeholder:text-dark-muted/70"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2.5 dark:border-white/10">
          <FilterPill label="All" active={categoryFilter === null} onClick={() => setCategoryFilter(null)} />
          {ROLE_CATEGORIES.map((category) => (
            <FilterPill
              key={category.id}
              label={category.label.split(" & ")[0].split(", ")[0]}
              active={categoryFilter === category.id}
              onClick={() => setCategoryFilter(category.id)}
            />
          ))}
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Roles" className="menu-scroll max-h-[236px] overflow-y-auto px-1.5 py-1.5">
          {grouped.length === 0 && (
            <p className="px-2.5 py-6 text-center text-xs text-muted dark:text-dark-muted">
              No roles match that. Keep typing to use it as a custom role.
            </p>
          )}

          {grouped.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.categoryLabel && (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted/80 dark:text-dark-muted/80">
                  {group.categoryLabel}
                </p>
              )}
              {group.rows.map(({ row, index }) => {
                const isSelected = row.label === role;
                const isHighlighted = index === highlight;
                return (
                  <button
                    key={row.key}
                    id={`${rowIdPrefix}-row-${index}`}
                    data-row-index={index}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => commit(row)}
                    className={`relative flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${
                      isHighlighted
                        ? "bg-blue/[0.07] text-navy dark:bg-teal-glow/[0.08] dark:text-white"
                        : "text-navy/80 dark:text-dark-text/80"
                    }`}
                  >
                    {isHighlighted && (
                      <motion.span
                        layoutId="menu-highlight"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl ring-1 ring-inset ring-blue/25 dark:ring-teal-glow/25"
                      />
                    )}
                    <span className="relative flex min-w-0 items-center gap-2">
                      {row.kind === "custom" && (
                        <span className="flex-shrink-0 text-teal-dark dark:text-teal-glow" aria-hidden>
                          ✦
                        </span>
                      )}
                      <span className="truncate">
                        {row.kind === "custom" ? (
                          <>
                            Use <span className="font-semibold">“{row.label}”</span> as a custom role
                          </>
                        ) : (
                          row.label
                        )}
                      </span>
                    </span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="relative flex-shrink-0 text-teal-dark dark:text-teal-glow">
                        <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Current selection, always visible so the choice is never ambiguous
          once the list scrolls or filters away from it. */}
      <div className="mt-2.5 flex items-center gap-2 text-xs">
        <span className="text-muted dark:text-dark-muted">Interviewing as</span>
        {/* popLayout, not "wait": the outgoing chip is pulled out of layout
            flow so the new selection appears on the same frame it's made.
            "wait" would hold the previous role on screen for the length of
            the exit animation, which reads as lag on a confirmation. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={role}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={SPRING}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-1 font-semibold text-teal-dark dark:border-teal-glow/25 dark:bg-teal-glow/10 dark:text-teal-glow"
          >
            {role}
            {isCustomRole && <span className="text-[10px] font-medium opacity-70">custom</span>}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted dark:text-dark-muted">Experience level</label>
        <div className="mt-2 flex rounded-full border border-line bg-white/60 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
          {EXPERIENCE_LEVELS.map((option) => {
            const isActive = option === level;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onLevelChange(option)}
                aria-pressed={isActive}
                className={`relative flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                  isActive ? "text-white" : "text-muted hover:text-navy dark:text-dark-muted dark:hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="level-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full bg-blue shadow-[0_2px_12px_-2px_rgba(36,112,179,0.7)] dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:shadow-[0_0_18px_-2px_rgba(47,224,182,0.65)]"
                  />
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

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={SPRING}
      aria-pressed={active}
      className={`relative rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active ? "text-white" : "text-muted hover:text-navy dark:text-dark-muted dark:hover:text-white"
      }`}
    >
      {active && (
        <motion.span
          layoutId="category-pill"
          transition={SPRING}
          className="absolute inset-0 rounded-full bg-navy dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:shadow-[0_0_14px_-2px_rgba(47,224,182,0.6)]"
        />
      )}
      <span className="relative">{label}</span>
    </motion.button>
  );
}
