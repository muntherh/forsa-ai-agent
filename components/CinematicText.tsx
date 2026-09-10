"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Letter-by-letter blur-to-focus entrance.
 *
 * Two details make this behave rather than just look right:
 *
 * 1. Delays are computed from a FLAT letter index across the whole string,
 *    not nested `staggerChildren` — so the rhythm stays perfectly even
 *    across line breaks and word boundaries, which nested variant staggering
 *    can't guarantee once lines are separate elements.
 * 2. Letters are grouped into per-word `inline-block` spans with real spaces
 *    between them. Transforms need `inline-block`, but making every LETTER
 *    inline-block would let the browser wrap mid-word; wrapping at the word
 *    span keeps normal line breaking intact.
 *
 * The animated spans are aria-hidden behind a single aria-label so screen
 * readers get the sentence, not a letter-by-letter spelling.
 */

interface CinematicTextProps {
  /** Use "\n" to force a line break. */
  text: string;
  className?: string;
  /**
   * Applied to every individual letter span. This is where any
   * `bg-clip-text` gradient treatment MUST go, not on `className`: each
   * letter animates `filter`/`transform` and therefore gets its own
   * compositing layer, and a parent's `background-clip: text` cannot clip to
   * glyphs its children painted in separate layers — the text renders
   * completely invisible. Per-letter is also visually identical for a
   * vertical gradient, since every inline-block letter shares the same line
   * box height.
   */
  letterClassName?: string;
  /** Seconds before the first letter animates. */
  delay?: number;
  /** Seconds between consecutive letters. */
  stagger?: number;
  as?: "h1" | "h2" | "p" | "span" | "div";
}

const HIDDEN = { opacity: 0, y: "0.4em", filter: "blur(14px)" };
const VISIBLE = { opacity: 1, y: "0em", filter: "blur(0px)" };

export default function CinematicText({
  text,
  className,
  letterClassName = "",
  delay = 0,
  stagger = 0.022,
  as = "div",
}: CinematicTextProps) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  const lines = text.split("\n");
  let letterIndex = 0;

  return (
    <Tag className={className} aria-label={text.replace(/\n/g, " ")}>
      {lines.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {lineIdx > 0 && <br aria-hidden />}
          {line.split(" ").map((word, wordIdx, words) => (
            <Fragment key={wordIdx}>
              <span aria-hidden className="inline-block">
                {Array.from(word).map((char, charIdx) => {
                  const thisDelay = delay + letterIndex * stagger;
                  letterIndex += 1;
                  return (
                    <motion.span
                      key={charIdx}
                      className={`inline-block will-change-[transform,filter,opacity] ${letterClassName}`}
                      initial={reduceMotion ? false : HIDDEN}
                      animate={VISIBLE}
                      transition={{ type: "spring", stiffness: 100, damping: 20, delay: reduceMotion ? 0 : thisDelay }}
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
              {wordIdx < words.length - 1 ? " " : null}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </Tag>
  );
}
