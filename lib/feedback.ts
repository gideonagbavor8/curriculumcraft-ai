export const FEEDBACK_TYPES = [
  { id: "general", label: "General Feedback", icon: "💬", entry: "entry.1244136003" },
  { id: "problem", label: "Report a Problem", icon: "🐛", entry: "entry.6577081" },
  { id: "feature", label: "Suggest a Feature", icon: "💡", entry: "entry.806585065" },
  { id: "content", label: "Curriculum or Content Feedback", icon: "📚", entry: "entry.1244136003" },
  { id: "experience", label: "Share Your Experience", icon: "⭐", entry: "entry.499980226" },
] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number]["id"];

export function getFeedbackFields(type: FeedbackType, message: string) {
  const category = FEEDBACK_TYPES.find((item) => item.id === type);
  if (!category) throw new Error("Unknown feedback type");
  const text = message.trim();
  if (!text || text.length > 2000) throw new Error("Feedback must contain between 1 and 2,000 characters");
  return { entry: category.entry, value: `[${category.label}]\n\n${text}` };
}
