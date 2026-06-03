"use client";

import { X, Printer, FileText } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface StudentWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentReading: string;
  indicatorCode: string;
  subject: string;
  grade: string;
  strand: string;
  subStrand?: string;
}

export default function StudentWorksheetModal({
  isOpen,
  onClose,
  studentReading,
  indicatorCode,
  subject,
  grade,
  strand,
  subStrand,
}: StudentWorksheetModalProps) {
  if (!isOpen) return null;

  // Parser to extract reading text vs comprehension questions
  const parseWorksheetData = (text: string) => {
    if (!text) return { readingContent: "", questions: [] };

    // Split at "Check Your Understanding" header
    const parts = text.split(/###?\s*(?:Check Your Understanding|CHECK YOUR UNDERSTANDING)/i);
    const readingContent = parts[0]?.trim() || "";
    const questionsSection = parts[1]?.trim() || "";

    let questions: string[] = [];
    if (questionsSection) {
      // Split questions by numbers e.g. "1. " or "2. "
      const splitQuestions = questionsSection.split(/^(?:\d+[\.\)]|\-\s+)/m);
      questions = splitQuestions
        .map((q) => q.trim())
        .filter((q) => q.length > 0);
    }

    // Fallback if split failed but we have text
    if (questions.length === 0 && questionsSection) {
      questions = [questionsSection];
    }

    return { readingContent, questions };
  };

  const { readingContent, questions } = parseWorksheetData(studentReading);

  const handlePrint = () => {
    document.body.classList.add("printing-worksheet");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-worksheet");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-gray-250 dark:border-gray-800 animate-fadeUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="bg-green-150 dark:bg-green-900/30 p-1.5 rounded-lg text-green-700 dark:text-green-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Student Worksheet Generator
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Preview and print student-facing materials with ruled spaces
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Printer size={13} />
              Print Worksheet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-550 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-950">
          <div className="max-w-[210mm] mx-auto">
            
            {/* The A4 Sheet itself */}
            <div className="bg-white text-black p-8 md:p-12 shadow-md rounded-lg border border-gray-200 student-worksheet-print-area font-sans print:border-none print:shadow-none">
              
              {/* Worksheet School Header */}
              <div className="border-b-4 border-double border-gray-800 pb-4 mb-6">
                <div className="text-center space-y-1">
                  <h1 className="text-lg font-extrabold uppercase tracking-wide">
                    Student Reading Material & Worksheet
                  </h1>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Standards-Based Curriculum (Ghana NaCCA)
                  </p>
                </div>

                {/* Fillable Student Info Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-xs border-t border-gray-200 pt-4">
                  <div className="col-span-2">
                    <span className="font-bold text-gray-700">STUDENT NAME:</span>
                    <span className="inline-block border-b border-gray-400 w-[70%] ml-2 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">CLASS:</span>
                    <span className="inline-block border-b border-gray-400 w-[60%] ml-2 h-4">{grade}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">DATE:</span>
                    <span className="inline-block border-b border-gray-400 w-[60%] ml-2 h-4" />
                  </div>
                </div>

                {/* Lesson details metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-[10px] text-gray-600 bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-bold">Subject:</span> {subject}
                  </div>
                  <div>
                    <span className="font-bold">Indicator:</span> {indicatorCode}
                  </div>
                  <div>
                    <span className="font-bold">Strand:</span> {strand}
                  </div>
                  {subStrand && (
                    <div>
                      <span className="font-bold">Sub-strand:</span> {subStrand}
                    </div>
                  )}
                </div>
              </div>

              {/* Reading Content */}
              <div className="space-y-4">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-800 border-b border-gray-200 pb-1 mb-2">
                  Part 1: Concept Reading
                </h2>
                <div className="text-xs text-gray-800 leading-relaxed text-justify space-y-3">
                  <MarkdownRenderer content={readingContent} />
                </div>
              </div>

              {/* Comprehension Questions Section */}
              {questions.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 break-before-page print:break-before-page">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-800 border-b border-gray-200 pb-1 mb-4">
                    Part 2: Check Your Understanding
                  </h2>
                  <p className="text-[10px] text-gray-500 italic mb-4">
                    Answer the following questions in the spaces provided. Show your workings where necessary.
                  </p>

                  <div className="space-y-6">
                    {questions.map((q, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-start gap-2 text-xs font-semibold text-gray-900 leading-relaxed">
                          <span>{idx + 1}.</span>
                          <div className="flex-1">
                            <MarkdownRenderer content={q} />
                          </div>
                        </div>

                        {/* Ruled lines for writing */}
                        <div className="space-y-5 pt-2 pl-4">
                          {[1, 2, 3, 4].map((line) => (
                            <div
                              key={line}
                              className="border-b border-gray-300 w-full h-4 opacity-80"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer citation stamp */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[9px] text-gray-400">
                <span>CurriculumCraft AI — Instantly generated supporting materials for Ghanaian schools.</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
