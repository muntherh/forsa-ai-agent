/**
 * The role taxonomy shown in RoleSelector. Purely UI/search data — the
 * interview flow itself only ever sees the final `role` STRING (a picked
 * role's label, or whatever the candidate typed into the custom-role input),
 * substituted directly into the Vapi system prompt and the evaluation
 * prompt (see lib/assistant.ts, lib/rubric.ts). Adding a role here never
 * requires touching either of those.
 */

export interface RoleOption {
  /** Stable key for React lists — not sent anywhere, the `label` is. */
  id: string;
  label: string;
  /** Extra terms the search box matches against, beyond the label itself. */
  keywords?: string[];
}

export interface RoleCategory {
  id: string;
  label: string;
  description: string;
  roles: RoleOption[];
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: "engineering",
    label: "Software Engineering & Architecture",
    description: "Frontend, backend, fullstack, mobile, and infrastructure roles.",
    roles: [
      { id: "frontend-engineer", label: "Frontend Engineer", keywords: ["react", "vue", "ui", "web"] },
      { id: "backend-engineer", label: "Backend Engineer", keywords: ["api", "server", "database"] },
      { id: "fullstack-engineer", label: "Fullstack Engineer", keywords: ["full stack", "web"] },
      { id: "mobile-engineer", label: "Mobile Engineer", keywords: ["ios", "android", "react native", "swift", "kotlin"] },
      { id: "devops-engineer", label: "DevOps Engineer", keywords: ["ci/cd", "infrastructure", "sre"] },
      { id: "site-reliability-engineer", label: "Site Reliability Engineer", keywords: ["sre", "on-call", "reliability"] },
      { id: "software-architect", label: "Software Architect", keywords: ["system design", "architecture"] },
      { id: "embedded-engineer", label: "Embedded Systems Engineer", keywords: ["firmware", "iot", "c++"] },
      { id: "game-engineer", label: "Game Engineer", keywords: ["unity", "unreal", "gameplay"] },
      { id: "qa-engineer", label: "QA / Test Automation Engineer", keywords: ["quality", "testing", "automation"] },
    ],
  },
  {
    id: "data-ai",
    label: "Data Science & AI/ML",
    description: "Data science, machine learning, and AI research roles.",
    roles: [
      { id: "data-scientist", label: "Data Scientist", keywords: ["statistics", "modeling"] },
      { id: "ml-engineer", label: "Machine Learning Engineer", keywords: ["ml", "pytorch", "tensorflow"] },
      { id: "ai-researcher", label: "AI Researcher", keywords: ["research", "deep learning", "llm"] },
      { id: "data-analyst", label: "Data Analyst", keywords: ["sql", "dashboards", "reporting"] },
      { id: "data-engineer", label: "Data Engineer", keywords: ["etl", "pipelines", "spark"] },
      { id: "mlops-engineer", label: "MLOps Engineer", keywords: ["ml infrastructure", "deployment"] },
      { id: "nlp-engineer", label: "NLP Engineer", keywords: ["language models", "text"] },
      { id: "computer-vision-engineer", label: "Computer Vision Engineer", keywords: ["cv", "image", "vision"] },
      { id: "bi-analyst", label: "Business Intelligence Analyst", keywords: ["bi", "reporting", "analytics"] },
    ],
  },
  {
    id: "it-security",
    label: "Information Technology & Cybersecurity",
    description: "Cloud, networking, and security roles.",
    roles: [
      { id: "cloud-engineer", label: "Cloud Engineer", keywords: ["aws", "azure", "gcp"] },
      { id: "network-admin", label: "Network Administrator", keywords: ["networking", "infrastructure"] },
      { id: "security-analyst", label: "Security Analyst", keywords: ["infosec", "soc", "threats"] },
      { id: "penetration-tester", label: "Penetration Tester", keywords: ["pentest", "ethical hacking", "red team"] },
      { id: "security-engineer", label: "Security Engineer", keywords: ["appsec", "infosec"] },
      { id: "systems-administrator", label: "Systems Administrator", keywords: ["sysadmin", "it support"] },
      { id: "it-support", label: "IT Support Specialist", keywords: ["helpdesk", "support"] },
      { id: "cloud-architect", label: "Cloud Solutions Architect", keywords: ["architecture", "cloud"] },
    ],
  },
  {
    id: "finance",
    label: "Finance, FinTech & Business Analysis",
    description: "Financial analysis, banking, and business analysis roles.",
    roles: [
      { id: "financial-analyst", label: "Financial Analyst", keywords: ["fp&a", "modeling"] },
      { id: "investment-banking-analyst", label: "Investment Banking Analyst", keywords: ["ib", "m&a", "valuation"] },
      { id: "quantitative-analyst", label: "Quantitative Analyst", keywords: ["quant", "trading", "risk"] },
      { id: "business-analyst", label: "Business Analyst", keywords: ["requirements", "process"] },
      { id: "risk-analyst", label: "Risk Analyst", keywords: ["risk management", "compliance"] },
      { id: "fintech-product-analyst", label: "FinTech Product Analyst", keywords: ["fintech", "payments"] },
      { id: "accountant", label: "Accountant", keywords: ["accounting", "audit", "gaap"] },
      { id: "credit-analyst", label: "Credit Analyst", keywords: ["lending", "underwriting"] },
    ],
  },
  {
    id: "product-design",
    label: "Product, Design & Management",
    description: "Product, design, and delivery leadership roles.",
    roles: [
      { id: "product-manager", label: "Product Manager", keywords: ["roadmap", "strategy"] },
      { id: "ux-designer", label: "UX/UI Designer", keywords: ["design", "figma", "user research"] },
      { id: "product-designer", label: "Product Designer", keywords: ["design systems", "prototyping"] },
      { id: "scrum-master", label: "Scrum Master", keywords: ["agile", "sprint"] },
      { id: "project-manager", label: "Project Manager", keywords: ["pmp", "delivery"] },
      { id: "program-manager", label: "Program Manager", keywords: ["cross-functional", "delivery"] },
      { id: "growth-pm", label: "Growth Product Manager", keywords: ["growth", "experimentation"] },
      { id: "ux-researcher", label: "UX Researcher", keywords: ["user research", "usability"] },
    ],
  },
];

export const EXPERIENCE_LEVELS = ["Junior / Intern", "Mid-Level", "Senior", "Lead / Principal"] as const;

export function findRoleCategory(roleLabel: string): RoleCategory | undefined {
  return ROLE_CATEGORIES.find((category) => category.roles.some((role) => role.label === roleLabel));
}
