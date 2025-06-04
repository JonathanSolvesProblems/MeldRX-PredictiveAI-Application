"use client";

import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";
import { setQuestions } from "@/app/redux/questionSlice";
import * as XLSX from "xlsx";
import { UploadCloud, XCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const QuestionUploader: React.FC = () => {
  const dispatch = useDispatch();
  const questions = useSelector(
    (state: RootState) => state.questions.questions
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------ HELPERS ----------------------------- */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    const div = document.createElement("div");
    div.className = `alert alert-${type} shadow-lg w-fit`;
    div.innerHTML = `<span>${msg}</span>`;
    document.querySelector(".toast")?.appendChild(div);
    setTimeout(() => div.remove(), 4200);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed))
          throw new Error("Invalid format: JSON must be an array of strings");
        dispatch(setQuestions(parsed));
        showToast("Templated questions loaded!");
      } else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        }) as string[][];
        const flatQuestions = rows.flat().filter((q) => typeof q === "string");
        dispatch(setQuestions(flatQuestions));
        showToast("Templated questions loaded from Excel!");
      } else {
        throw new Error("Unsupported file type. Use JSON or Excel.");
      }
    } catch (e) {
      showToast(`Failed to load: ${(e as Error).message}`, "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearQuestions = () => {
    dispatch(setQuestions([]));
    showToast("Templated questions cleared!", "error");
  };

  /* ------------------------------------------------------------------- */
  return (
    <motion.div
      className="glass bg-base-100/60 border border-base-content/10 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-center max-w-fit hover:shadow-xl transition-shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <label className="btn btn-primary gap-2 cursor-pointer">
        <UploadCloud className="w-4 h-4" /> Import Questions
        <input
          type="file"
          accept=".json,.xls,.xlsx"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
      </label>

      <AnimatePresence mode="wait">
        {questions.length > 0 && (
          <motion.div
            key="loaded-state"
            className="flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <span className="badge badge-success gap-1 text-sm py-2 px-3">
              <CheckCircle className="w-4 h-4" /> {questions.length} questions
            </span>
            <button
              className="btn btn-error btn-sm gap-1"
              onClick={handleClearQuestions}
            >
              <XCircle className="w-4 h-4" /> Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
