export const ANNOUNCEMENT_SETTINGS = {
  earlyAccessEnds: "October 31",
  premiumPrice: "GH₵10/month",
  rotationMs: 6000,
};

export const ANNOUNCEMENTS = [
  {
    id: "early-access",
    title: `🎉 FREE until ${ANNOUNCEMENT_SETTINGS.earlyAccessEnds}`,
    message: `Premium from ${ANNOUNCEMENT_SETTINGS.premiumPrice}`,
    description: "Enjoy CurriculumCraft AI during the early-access period. More powerful teacher tools are coming.",
    cta: "See What's Coming",
    area: "CREATE",
  },
  {
    id: "teaching-tools",
    title: "🚀 More teaching tools are coming",
    message: "Improved Activities, Exercises, Assessments & Worksheets",
    description: "Building on the tools you already use, with expanded capabilities and better classroom-ready resources.",
    cta: "Explore the roadmap",
    area: "CREATE",
  },
  {
    id: "ai-for-teachers",
    title: "🤖 AI for Teachers",
    message: "Discover practical AI tools that can make your everyday teaching easier.",
    description: "A teacher-focused space for useful AI tools, practical AI guidance, and resources for your daily work.",
    cta: "See what's ahead",
    area: "DISCOVER",
  },
  {
    id: "teacher-growth",
    title: "🎓 Stay informed. Keep growing.",
    message: "Teacher news, education updates, CPD resources & professional opportunities",
    description: "Ghana education news, curriculum updates, professional development, teaching opportunities, and useful learning resources.",
    cta: "See what's ahead",
    area: "STAY UPDATED · GROW",
  },
] as const;
