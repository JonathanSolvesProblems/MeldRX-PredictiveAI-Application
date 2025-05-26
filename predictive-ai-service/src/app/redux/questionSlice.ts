import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface QuestionState {
  questions: string[];
}

const initialState: QuestionState = {
  questions: [],
};

const questionSlice = createSlice({
  name: "questions",
  initialState,
  reducers: {
    setQuestions(state, action: PayloadAction<string[]>) {
      state.questions = action.payload;
    },
    clearQuestions(state) {
      state.questions = [];
    },
  },
});

export const { setQuestions, clearQuestions } = questionSlice.actions;
export default questionSlice.reducer;
