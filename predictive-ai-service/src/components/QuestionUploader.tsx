// components/QuestionUploader.tsx
"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/redux/store";
import { setQuestions } from "@/app/redux/questionSlice";
import * as XLSX from "xlsx";

export const QuestionUploader: React.FC = () => {
  const dispatch = useDispatch();
  const questions = useSelector(
    (state: RootState) => state.questions.questions
  );

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
        alert("Templated questions loaded!");
      } else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const flatQuestions = json.flat().filter((q) => typeof q === "string");
        dispatch(setQuestions(flatQuestions));
        alert("Templated questions loaded from Excel!");
      } else {
        throw new Error("Unsupported file type. Use JSON or Excel.");
      }
    } catch (e) {
      alert("Failed to load questions: " + (e as Error).message);
    }
  };

  const handleClearQuestions = () => {
    dispatch(setQuestions([]));
    alert("Templated questions cleared!");
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <label className="btn btn-outline btn-sm">
        📥 Import Questions
        <input
          type="file"
          accept=".json,.xls,.xlsx"
          hidden
          onChange={handleFileUpload}
        />
      </label>
      {questions.length > 0 && (
        <>
          <span className="text-success text-sm">
            ✓ {questions.length} questions loaded
          </span>
          <button
            className="btn btn-outline btn-error btn-sm"
            onClick={handleClearQuestions}
          >
            ✖ Clear Questions
          </button>
        </>
      )}
    </div>
  );
};
