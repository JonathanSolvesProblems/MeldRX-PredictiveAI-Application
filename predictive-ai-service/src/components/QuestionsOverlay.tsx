import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Pencil } from "lucide-react";

type Props = {
  open: boolean;
  questions: string[];
  onClose: () => void;
  onUpdate?: (updated: string[]) => void;
};

const QuestionsOverlay: React.FC<Props> = ({
  open,
  questions,
  onClose,
  onUpdate,
}) => {
  const [editableQuestions, setEditableQuestions] = useState(questions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditValue(editableQuestions[index]);
  };

  const handleSave = () => {
    if (editingIndex !== null) {
      const updated = [...editableQuestions];
      updated[editingIndex] = editValue;
      setEditableQuestions(updated);
      setEditingIndex(null);
      if (onUpdate) onUpdate(updated);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-base-100 rounded-xl p-6 shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto relative"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 btn btn-sm btn-circle btn-ghost"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4">Templated Questions</h3>

            <div className="space-y-4">
              {editableQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold w-6 text-right">{i + 1}.</span>
                  {editingIndex === i ? (
                    <div className="flex flex-col w-full gap-1">
                      <textarea
                        className="textarea textarea-bordered text-sm w-full"
                        rows={2}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditingIndex(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between w-full items-center">
                      <p className="text-sm whitespace-pre-wrap w-full">{q}</p>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleEditClick(i)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuestionsOverlay;
