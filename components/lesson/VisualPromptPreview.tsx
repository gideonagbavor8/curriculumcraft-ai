"use client";

import { useState, useEffect } from "react";
import { 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Presentation, 
  FileText, 
  Camera, 
  BookOpen,
  Sparkles,
  RefreshCw
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface VisualPromptPreviewProps {
  content: string;
  subject?: string;
}

interface ParsedPromptItem {
  title: string;
  description: string;
}

interface ParsedPrompts {
  poster: ParsedPromptItem;
  board: ParsedPromptItem;
  photo: ParsedPromptItem;
  notebook: ParsedPromptItem;
}

export default function VisualPromptPreview({
  content,
  subject = "Mathematics",
}: VisualPromptPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"poster" | "board" | "photo" | "notebook">("poster");
  
  // Chalkboard states
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Parse visual prompts from LLM response
  const parseVisualPrompts = (text: string): ParsedPrompts => {
    const result: ParsedPrompts = {
      poster: { title: "Classroom Poster / Anchor Chart", description: "" },
      board: { title: "Board Worked Example", description: "" },
      photo: { title: "Real-World Photograph Prompt", description: "" },
      notebook: { title: "Student Notebook Diagram", description: "" },
    };

    if (!text) return result;

    const lines = text.split("\n");
    let currentKey: keyof ParsedPrompts | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect active category by looking for keywords or common structure in the start line
      const lower = trimmed.toLowerCase();
      const hasMatch = trimmed.includes("**") || trimmed.match(/^[1-4]\./);

      if (hasMatch) {
        if ((lower.includes("poster") || lower.includes("anchor chart")) && (trimmed.includes("1.") || lower.includes("poster"))) {
          currentKey = "poster";
        } else if ((lower.includes("worked example") || lower.includes("board")) && (trimmed.includes("2.") || lower.includes("example"))) {
          currentKey = "board";
        } else if ((lower.includes("photograph") || lower.includes("photo")) && (trimmed.includes("3.") || lower.includes("photo"))) {
          currentKey = "photo";
        } else if ((lower.includes("notebook") || lower.includes("diagram")) && (trimmed.includes("4.") || lower.includes("notebook") || lower.includes("diagram"))) {
          currentKey = "notebook";
        }
      }

      if (currentKey) {
        const isStartLine = 
          (currentKey === "poster" && (lower.includes("poster") || lower.includes("anchor chart")) && (trimmed.includes("1.") || lower.includes("poster"))) ||
          (currentKey === "board" && (lower.includes("worked example") || lower.includes("board")) && (trimmed.includes("2.") || lower.includes("example"))) ||
          (currentKey === "photo" && (lower.includes("photograph") || lower.includes("photo")) && (trimmed.includes("3.") || lower.includes("photo"))) ||
          (currentKey === "notebook" && (lower.includes("notebook") || lower.includes("diagram")) && (trimmed.includes("4.") || lower.includes("diagram")));

        let cleanText = trimmed;
        if (isStartLine) {
          // Format is usually: "1. **Classroom Poster** — Description text" or "2. **Board Worked Example**: Description text"
          const regexMatch = trimmed.match(/^(?:\d+\.|\*|-|###)?\s*(?:\*\*(.*?)\*\*|\*(.*?)\*)\s*(?:[-—:]|&mdash;)?\s*(.*)$/i);
          if (regexMatch) {
            const title = regexMatch[1] || regexMatch[2] || "";
            const desc = regexMatch[3] || "";
            if (title) result[currentKey].title = title;
            cleanText = desc;
          } else {
            // Remove listing markers if match fails
            cleanText = trimmed.replace(/^(?:\d+\.|\*|-|###)\s*/, "");
          }
        }

        if (cleanText) {
          if (result[currentKey].description) {
            result[currentKey].description += "\n" + cleanText;
          } else {
            result[currentKey].description = cleanText;
          }
        }
      }
    }

    // Fallback: If parsing yielded empty descriptions, split text into paragraphs
    const totalLength = 
      result.poster.description.length + 
      result.board.description.length + 
      result.photo.description.length + 
      result.notebook.description.length;

    if (totalLength < 30) {
      const paragraphs = text
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 15 && !p.startsWith("###"));

      if (paragraphs[0]) result.poster.description = paragraphs[0];
      if (paragraphs[1]) result.board.description = paragraphs[1];
      if (paragraphs[2]) result.photo.description = paragraphs[2];
      if (paragraphs[3]) result.notebook.description = paragraphs[3];
    }

    return result;
  };

  const parsedPrompts = parseVisualPrompts(content);

  // Helper to split chalkboard description into steps
  const getChalkboardSteps = (desc: string): string[] => {
    if (!desc) return [];
    const lines = desc.split("\n");
    const steps: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match step lists (e.g. "Step 1: ...", "1. ...", "- ...")
      if (trimmed.match(/^(?:[-•*]|\d+\.)\s*(.+)$/) || trimmed.toLowerCase().startsWith("step")) {
        steps.push(trimmed);
      } else if (steps.length > 0) {
        steps[steps.length - 1] += "\n" + trimmed;
      } else {
        steps.push(trimmed);
      }
    }

    if (steps.length <= 1) {
      // Split by sentence ending punctuation
      const sentences = desc
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return sentences.length > 0 ? sentences : [desc];
    }

    return steps;
  };

  const boardSteps = getChalkboardSteps(parsedPrompts.board.description);

  // Reset steps when tab or content changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setShowAllSteps(false);
  }, [activeTab, content]);

  // Determine photo mockup subject graphic
  const renderSubjectIllustration = () => {
    const subLower = subject.toLowerCase();
    let bgGradient = "from-amber-400 to-orange-500 text-white";
    let iconLabel = "🏫";
    let subName = "Ghanaian Classroom";

    if (subLower.includes("math")) {
      bgGradient = "from-blue-500 via-indigo-600 to-violet-700 text-white";
      iconLabel = "📐";
      subName = "Mathematics Visual Aid";
    } else if (subLower.includes("science")) {
      bgGradient = "from-emerald-400 via-teal-500 to-cyan-600 text-white";
      iconLabel = "🔬";
      subName = "Scientific Setup";
    } else if (subLower.includes("computer") || subLower.includes("comput")) {
      bgGradient = "from-slate-700 via-slate-800 to-slate-900 text-cyan-400";
      iconLabel = "💻";
      subName = "Computing Concept";
    } else if (subLower.includes("english") || subLower.includes("language")) {
      bgGradient = "from-rose-400 via-pink-500 to-orange-500 text-white";
      iconLabel = "📚";
      subName = "Language & Reading";
    }

    return (
      <div className={`w-full h-full bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center p-6 relative`}>
        {/* Subtle camera view lines */}
        <div className="absolute inset-4 border border-white/20 pointer-events-none rounded" />
        <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-white/40" />
        <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-white/40" />
        <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-white/40" />
        <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-white/40" />
        
        <span className="text-5xl mb-3 drop-shadow-md filter animate-pulse">{iconLabel}</span>
        <span className="text-xs font-semibold uppercase tracking-widest opacity-80">{subName}</span>
        <span className="text-[10px] opacity-60 mt-1">Real-World Photo Reference</span>
      </div>
    );
  };

  if (!showPreview) {
    return (
      <button
        onClick={() => setShowPreview(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
      >
        <Presentation size={15} />
        Open Interactive Visual Sandbox
      </button>
    );
  }

  return (
    <div className="space-y-4 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-950/20">
      {/* Sandbox Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="text-amber-500 animate-spin-slow" size={14} />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Interactive Visual Sandbox
          </span>
        </div>
        <button
          onClick={() => setShowPreview(false)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-semibold transition-all cursor-pointer"
        >
          <EyeOff size={12} />
          Close Sandbox
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab("poster")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "poster"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
          }`}
        >
          <FileText size={12} />
          1. Classroom Poster
        </button>
        <button
          onClick={() => setActiveTab("board")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "board"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
          }`}
        >
          <Presentation size={12} />
          2. Chalkboard Worked Example
        </button>
        <button
          onClick={() => setActiveTab("photo")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "photo"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
          }`}
        >
          <Camera size={12} />
          3. Photo Prompt
        </button>
        <button
          onClick={() => setActiveTab("notebook")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "notebook"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
          }`}
        >
          <BookOpen size={12} />
          4. Student Notebook
        </button>
      </div>

      {/* Sandbox Views */}
      <div className="flex flex-col items-center justify-center py-2">
        {/* TAB 1: CLASSROOM POSTER MOCKUP */}
        {activeTab === "poster" && (
          <div className="w-full max-w-xl animate-fadeIn">
            {/* Paper Poster container */}
            <div className="bg-[#faf7ed] dark:bg-amber-950/15 border-2 border-amber-800/40 rounded-xl shadow-xl p-6 relative overflow-hidden">
              {/* Decorative Pinned Tape corners */}
              <div className="absolute -top-1 -left-4 w-12 h-6 bg-gray-300/40 dark:bg-gray-800/40 border border-gray-400/20 rotate-[-35deg] shadow-sm" />
              <div className="absolute -top-1 -right-4 w-12 h-6 bg-gray-300/40 dark:bg-gray-800/40 border border-gray-400/20 rotate-[35deg] shadow-sm" />
              <div className="absolute -bottom-2 -left-4 w-12 h-6 bg-gray-300/40 dark:bg-gray-800/40 border border-gray-400/20 rotate-[35deg] shadow-sm" />
              <div className="absolute -bottom-2 -right-4 w-12 h-6 bg-gray-300/40 dark:bg-gray-800/40 border border-gray-400/20 rotate-[-35deg] shadow-sm" />
              
              {/* Poster frame */}
              <div className="border-4 border-double border-amber-850 dark:border-amber-700/60 p-4 rounded-lg bg-[#fcf9f2] dark:bg-gray-900/40">
                <h3 className="text-center font-sans font-bold text-sm tracking-wider uppercase text-amber-900 dark:text-amber-400 border-b border-amber-200 dark:border-amber-850 pb-2 mb-4 flex items-center justify-center gap-1.5">
                  📌 {parsedPrompts.poster.title || "Classroom Poster"}
                </h3>
                <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed space-y-2">
                  <MarkdownRenderer content={parsedPrompts.poster.description} />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-2 text-center">
              💡 Poster Mockup: Copy these core rules or headers onto cardboard for a classroom wall poster.
            </p>
          </div>
        )}

        {/* TAB 2: CHALKBOARD SIMULATOR MOCKUP */}
        {activeTab === "board" && (
          <div className="w-full max-w-2xl animate-fadeIn">
            {/* Wooden frame and chalkboard */}
            <div className="border-[14px] border-amber-900 dark:border-amber-950 rounded-2xl shadow-2xl relative overflow-hidden">
              {/* Chalkboard slate */}
              <div className="bg-gradient-to-br from-[#122e1f] via-[#102b1d] to-[#0a1b12] text-[#f4eedb] p-6 min-h-[220px] flex flex-col justify-between font-mono relative">
                {/* Board grid overlay for alignment feeling */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                
                {/* Header info */}
                <div className="border-b border-[#f4eedb]/20 pb-1.5 mb-3 flex items-center justify-between text-[10px] text-[#f4eedb]/60">
                  <span>SUBJECT: {subject.toUpperCase()}</span>
                  <span className="font-bold text-[#fbcfe8]">{parsedPrompts.board.title}</span>
                </div>

                {/* Chalk Content rendering */}
                <div className="flex-1 space-y-2.5 text-xs select-none">
                  {showAllSteps ? (
                    boardSteps.map((step, idx) => (
                      <div key={idx} className="animate-fadeIn pb-1">
                        <MarkdownRenderer content={step} className="text-[#f4eedb]" />
                      </div>
                    ))
                  ) : (
                    boardSteps.slice(0, currentStepIndex + 1).map((step, idx) => {
                      const isNewest = idx === currentStepIndex;
                      return (
                        <div key={idx} className={`pb-1 ${isNewest ? "text-yellow-100 animate-fadeIn" : "text-[#f4eedb]"}`}>
                          <MarkdownRenderer content={step} className={isNewest ? "text-yellow-100" : "text-[#f4eedb]"} />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chalk tray details */}
                <div className="mt-4 flex items-end justify-between border-t border-[#f4eedb]/15 pt-2">
                  <div className="text-[9px] text-[#f4eedb]/45">
                    {!showAllSteps && `Step ${currentStepIndex + 1} of ${boardSteps.length}`}
                  </div>
                  <div className="text-[9px] tracking-wide text-[#f4eedb]/40">✏️ Chalkboard Simulator</div>
                </div>
              </div>

              {/* Physical Chalk Tray at the bottom */}
              <div className="w-full h-3 bg-amber-800 dark:bg-amber-900 border-t border-amber-950 relative flex items-center px-12 gap-6 shadow-inner">
                {/* Chalk sticks */}
                <div className="w-7 h-2 bg-white rounded-full rotate-[15deg] shadow-sm opacity-90 absolute left-8" />
                <div className="w-6 h-2 bg-yellow-200 rounded-full rotate-[-5deg] shadow-sm opacity-95 absolute left-18" />
                <div className="w-5 h-2 bg-cyan-200 rounded-full rotate-[40deg] shadow-sm opacity-90 absolute right-16" />
                <div className="w-6 h-2 bg-pink-200 rounded-full rotate-[-25deg] shadow-sm opacity-90 absolute right-8" />
              </div>
            </div>

            {/* Stepper Controls */}
            <div className="mt-3 flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-xs">
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStepIndex(prev => Math.max(0, prev - 1));
                  }}
                  disabled={currentStepIndex === 0 && !showAllSteps}
                  className="p-1 px-2.5 rounded-lg border border-gray-250 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-medium flex items-center gap-1 select-none"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <button
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStepIndex(prev => Math.min(boardSteps.length - 1, prev + 1));
                  }}
                  disabled={currentStepIndex === boardSteps.length - 1 && !showAllSteps}
                  className="p-1 px-2.5 rounded-lg border border-green-600 bg-green-700 text-white disabled:opacity-40 hover:bg-green-800 cursor-pointer font-medium flex items-center gap-1 select-none"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setShowAllSteps(true);
                  }}
                  className={`p-1 px-2.5 rounded-lg border cursor-pointer font-medium select-none ${
                    showAllSteps 
                      ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/35 dark:border-amber-700 dark:text-amber-300"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  Show All
                </button>
                <button
                  onClick={() => {
                    setCurrentStepIndex(0);
                    setShowAllSteps(false);
                  }}
                  className="p-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-150 dark:hover:bg-gray-800 cursor-pointer font-medium flex items-center gap-1 select-none text-gray-500 dark:text-gray-400"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POLAROID PHOTO MOCKUP */}
        {activeTab === "photo" && (
          <div className="w-full max-w-sm animate-fadeIn">
            {/* Polaroid body */}
            <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 p-4 pb-7 rounded-lg shadow-xl">
              {/* Photo viewfinder area */}
              <div className="aspect-[4/3] w-full rounded border border-gray-200 dark:border-gray-850 overflow-hidden relative shadow-inner">
                {renderSubjectIllustration()}
              </div>

              {/* Description caption */}
              <div className="mt-4 px-2 border-t border-gray-100 dark:border-gray-850 pt-3">
                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  📸 PHOTO IDEA / REAL-WORLD CONNECTION
                </h4>
                <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic font-sans text-center">
                  <MarkdownRenderer content={parsedPrompts.photo.description} />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-2 text-center">
              💡 Photographic Reference: Draw or show students a local picture representing this real-world concept.
            </p>
          </div>
        )}

        {/* TAB 4: STUDENT NOTEBOOK MOCKUP */}
        {activeTab === "notebook" && (
          <div className="w-full max-w-lg animate-fadeIn">
            {/* Exercise Book Page */}
            <div className="bg-[#fcfcff] dark:bg-[#14151b] border border-gray-300 dark:border-gray-850 rounded-xl shadow-lg relative overflow-hidden p-6">
              
              {/* Notebook Page Header (Date & Page no) */}
              <div className="flex justify-between text-[9px] font-mono text-gray-400 dark:text-gray-550 border-b border-gray-200 dark:border-gray-850 pb-2 mb-4 px-2">
                <span>DATE: __________________</span>
                <span>PAGE: _____</span>
              </div>

              {/* Ruled lines helper box */}
              <div className="relative border-l-2 border-red-400/50 dark:border-red-800/40 pl-6 ml-3">
                <h4 className="font-bold text-xs text-blue-800 dark:text-blue-400 mb-2 border-b border-blue-100 dark:border-blue-900/50 pb-1">
                  ✍️ {parsedPrompts.notebook.title || "Student Notebook Diagram"}
                </h4>

                {/* Drawing template sandbox box */}
                <div className="my-4 border border-dashed border-gray-350 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg p-4 text-center min-h-[110px] flex flex-col justify-center items-center shadow-inner">
                  <span className="text-2xl mb-1.5 opacity-60">✏️</span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notebook Sketch Area
                  </span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 max-w-[280px]">
                    Draw a sketch corresponding to: &ldquo;{parsedPrompts.notebook.title}&rdquo;
                  </span>
                </div>

                <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-1.5">
                  <MarkdownRenderer content={parsedPrompts.notebook.description} />
                </div>
              </div>

              {/* Lined paper decoration background on lines */}
              <div className="absolute inset-y-0 right-0 w-3 border-l border-gray-200/50 pointer-events-none" />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-2 text-center">
              💡 Student Notebook Guide: Instruct your students to copy this diagram / summary into their exercise books.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

