"use client";

import { motion, useReducedMotion } from "motion/react";
import { FileText, TrendingUp, Zap } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";

import CourseCard from "@/components/app/CourseCard";
import SkillMatchPanel from "@/components/app/SkillMatchPanel";
import { Card } from "@/components/ui";
import type { PlanCourseRef, PlanDetail, SkillRef } from "@/lib/api/plans";
import { formatDate } from "@/lib/format";
import { ease } from "@/lib/motion";
import type { Course } from "@/lib/mock-data/courses";
import type { Skill } from "@/lib/mock-data/skills";

const sectionStaggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Renders a plan's content (header, skills, courses, projects). Page chrome — the
// back link and save bar for saved plans, or the guest banner — lives in the caller.
export default function PlanView({ plan }: { plan: PlanDetail }) {
  const reduced = useReducedMotion() ?? false;
  const sectionFadeUpVariants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: ease.out },
    },
  };

  const matchedSkills = plan.matched_skills.map(toSkill);
  const missingSkills = plan.missing_skills.map(toSkill);
  const projects = [plan.project_one_md, plan.project_two_md];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionStaggerVariants}
      className="mt-4"
    >
      <motion.section variants={sectionFadeUpVariants}>
        <h1 className="text-h3">Your gap plan</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-text-muted">
          <FileText className="size-3.5" aria-hidden />
          Generated {formatDate(plan.created_at)} · Fit score {plan.fit_score}
        </p>
      </motion.section>

      <motion.section variants={sectionFadeUpVariants} className="mt-8">
        <SkillMatchPanel matched={matchedSkills} missing={missingSkills} />
      </motion.section>

      <motion.section variants={sectionFadeUpVariants} className="mt-12">
        <SectionHeading>Recommended courses</SectionHeading>
        <div className="mt-6 space-y-4">
          {plan.courses.map((planCourse) => (
            <CourseCard
              key={planCourse.course_id}
              rank={planCourse.rank === 1 ? 1 : 2}
              course={toCourse(planCourse)}
              skillsCovered={planCourse.skills_covered.map(toSkill)}
            />
          ))}
        </div>
      </motion.section>

      <motion.section variants={sectionFadeUpVariants} className="mt-12">
        <SectionHeading>Recommended projects</SectionHeading>
        <div className="mt-6 space-y-4">
          {projects.map((markdown, index) => (
            <ProjectMarkdownCard key={index} markdown={markdown} isCurrent={index === 0} />
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-h4 text-score-soft">{children}</h2>
      <div className="mt-3 h-px bg-border" />
    </div>
  );
}

// The model sometimes wraps its whole answer in an outer ```markdown fence — strip
// only that outer fence (inner fences, e.g. in a README outline, are left alone).
const OUTER_FENCE_RE = /^```(?:markdown)?\s*\n([\s\S]*?)\n```\s*$/i;

function stripOuterFence(markdown: string): string {
  const trimmed = markdown.trim();
  const match = OUTER_FENCE_RE.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mb-2 mt-5 text-[17px] font-semibold text-text first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-5 text-[15px] font-semibold text-text first:mt-0">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-1.5 mt-4 text-[14px] font-semibold text-text first:mt-0">{children}</h5>
  ),
  h4: ({ children }) => (
    <h6 className="mb-1 mt-3 text-[13px] font-medium text-text-muted first:mt-0">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[14px] leading-[1.7] text-text last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-[14px] leading-[1.7] text-text last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-[14px] leading-[1.7] text-text last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 marker:text-text-muted">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic text-text">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 text-text-muted italic">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-card border border-border bg-elevated p-4 font-mono text-[13px] leading-relaxed text-text">
      {children}
    </pre>
  ),
  code: ({ className, children }) => (
    <code
      className={
        className ?? "rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.9em] text-text"
      }
    >
      {children}
    </code>
  ),
};

// The pipeline emits project briefs as Markdown; render them with ReactMarkdown,
// styled to match the app's dark UI (see markdownComponents above).
function ProjectMarkdownCard({ markdown, isCurrent }: { markdown: string; isCurrent: boolean }) {
  const Icon = isCurrent ? Zap : TrendingUp;
  const badgeText = isCurrent ? "Build with what you have" : "Build after Course 1";
  return (
    <Card>
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-bg-secondary px-2.5 py-1 text-caption text-text">
        <Icon className="size-3.5" aria-hidden />
        {badgeText}
      </span>
      <div className="mt-3">
        <ReactMarkdown components={markdownComponents}>{stripOuterFence(markdown)}</ReactMarkdown>
      </div>
    </Card>
  );
}

function toSkill(ref: SkillRef): Skill {
  // The backend has 8 categories (incl. "technique"); the frontend Skill type lists 7.
  // Components only display id + canonical_name, so the category is a display detail.
  return {
    id: ref.id,
    canonical_name: ref.display_name,
    category: ref.category as Skill["category"],
    aliases: [],
  };
}

function toCourse(ref: PlanCourseRef): Course {
  return {
    id: ref.course_id,
    title: ref.title,
    provider: ref.provider,
    description: ref.description ?? "",
    url: ref.url,
    skills_covered: ref.skills_covered.map((s) => s.id),
    popularity: 0,
  };
}
