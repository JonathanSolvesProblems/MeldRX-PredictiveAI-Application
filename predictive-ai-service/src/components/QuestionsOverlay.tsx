"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";

interface QuestionsOverlayProps {
  open: boolean;
  questions: string[];
  onClose: () => void;
}

export default function QuestionsOverlay({
  open,
  questions,
  onClose,
}: QuestionsOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="card bg-base-100 shadow-2xl w-full max-w-lg mx-4"
          >
            <div className="card-body space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="card-title text-xl">
                  Loaded Questions ({questions.length})
                </h2>
                <button
                  onClick={onClose}
                  className="btn btn-sm btn-circle btn-ghost"
                  aria-label="Close questions overlay"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className="font-bold">{idx + 1}.</span>
                    <span className="flex-1 text-sm">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
