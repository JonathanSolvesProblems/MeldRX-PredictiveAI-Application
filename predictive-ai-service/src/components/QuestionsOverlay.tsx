"use client";

import React, { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useDispatch } from "react-redux";
import { setQuestions } from "@/app/redux/questionSlice";

export const QuestionsOverlay: React.FC<{
  open: boolean;
  questions: string[];
  onClose: () => void;
}> = ({ open, questions, onClose }) => {
  const dispatch = useDispatch();
  const [editableQuestions, setEditableQuestions] =
    useState<string[]>(questions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEdit = (index: number, value: string) => {
    const updated = [...editableQuestions];
    updated[index] = value;
    setEditableQuestions(updated);
    dispatch(setQuestions(updated));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-start pt-20 p-4">
      <div className="bg-base-100 w-full max-w-2xl rounded-2xl shadow-lg p-6 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 btn btn-circle btn-sm btn-ghost"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-4">Templated Questions</h2>
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {editableQuestions.map((q, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-base font-semibold mt-1">{idx + 1}.</span>
              {editingIndex === idx ? (
                <input
                  className="input input-bordered w-full"
                  value={q}
                  autoFocus
                  onBlur={() => setEditingIndex(null)}
                  onChange={(e) => handleEdit(idx, e.target.value)}
                />
              ) : (
                <div
                  className="flex justify-between items-center w-full bg-base-200 rounded-lg px-3 py-2 hover:bg-base-300 transition"
                  onClick={() => setEditingIndex(idx)}
                >
                  <span>{q}</span>
                  <Pencil className="w-4 h-4 text-base-content/70" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
