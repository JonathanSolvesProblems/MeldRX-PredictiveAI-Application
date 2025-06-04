"use client";

import React, { useState, useEffect } from "react";
import {
  Pencil,
  X,
  PlusCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { setQuestions } from "@/app/redux/questionSlice";

const QUESTIONS_PER_PAGE = 5;

export const QuestionsOverlay: React.FC<{
  open: boolean;
  questions: string[];
  onClose: () => void;
}> = ({ open, questions, onClose }) => {
  const dispatch = useDispatch();
  const [editableQuestions, setEditableQuestions] =
    useState<string[]>(questions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setEditableQuestions(questions);
  }, [questions]);

  const totalPages = Math.ceil(editableQuestions.length / QUESTIONS_PER_PAGE);

  const handleEdit = (index: number, value: string) => {
    const globalIndex = currentPage * QUESTIONS_PER_PAGE + index;
    const updated = [...editableQuestions];
    updated[globalIndex] = value;
    setEditableQuestions(updated);
    dispatch(setQuestions(updated));
  };

  const handleAdd = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    const updated = [...editableQuestions, trimmed];
    setEditableQuestions(updated);
    dispatch(setQuestions(updated));
    setNewQuestion("");
    setCurrentPage(totalPages); // jump to last page
  };

  const handleDelete = (index: number) => {
    const globalIndex = currentPage * QUESTIONS_PER_PAGE + index;
    const updated = editableQuestions.filter((_, i) => i !== globalIndex);
    setEditableQuestions(updated);
    dispatch(setQuestions(updated));
    if (currentPage > 0 && globalIndex === editableQuestions.length - 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const paginatedQuestions = editableQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-base-100 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-lg p-6 overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4">Templated Questions</h2>

        <ul className="space-y-3">
          {paginatedQuestions.map((q, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-base font-semibold mt-1">
                {currentPage * QUESTIONS_PER_PAGE + idx + 1}.
              </span>
              {editingIndex === idx ? (
                <input
                  className="input input-bordered w-full"
                  value={q}
                  autoFocus
                  onBlur={() => setEditingIndex(null)}
                  onChange={(e) => handleEdit(idx, e.target.value)}
                />
              ) : (
                <div className="flex justify-between items-center w-full bg-base-200 rounded-lg px-3 py-2 hover:bg-base-300 transition">
                  <span
                    onClick={() => setEditingIndex(idx)}
                    className="flex-1 cursor-pointer"
                  >
                    {q}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingIndex(idx)}
                      className="btn btn-xs btn-ghost"
                    >
                      <Pencil className="w-4 h-4 text-base-content/70" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="btn btn-xs btn-ghost text-error"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0}
              className="btn btn-sm btn-ghost"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages - 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="btn btn-sm btn-ghost"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="pt-6 mt-4 border-t border-base-200 space-y-2">
          <h3 className="font-semibold">Add a New Question</h3>
          <div className="flex gap-2">
            <input
              className="input input-bordered w-full"
              placeholder="Type new question here..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <button
              onClick={handleAdd}
              className="btn btn-primary btn-square"
              title="Add"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
