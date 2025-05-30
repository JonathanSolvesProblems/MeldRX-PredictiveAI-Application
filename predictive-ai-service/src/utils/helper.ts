export const formatResultForPDF = (result: any): string => {
  let output = "";

  if (result.summaryText) {
    output += `📝 Summary:\n${result.summaryText}\n\n`;
  }

  if (result.accuracy !== undefined) {
    output += `✅ Accuracy: ${(result.accuracy * 100).toFixed(0)}%\n`;
    if (result.accuracyExplanation) {
      output += `📌 Accuracy Explanation:\n${result.accuracyExplanation}\n\n`;
    }
  }

  if (result.riskScores?.length) {
    output += `📊 Risk Scores:\n`;
    for (const r of result.riskScores) {
      output += `- ${r.label}: ${r.score}\n`;
    }
    output += "\n";
  }

  if (result.recommendedTreatments?.length) {
    output += `💊 Recommended Treatments:\n`;
    for (const t of result.recommendedTreatments) {
      output += `- ${t.treatment} (${t.condition})\n`;
    }
    output += "\n";
  }

  if (result.preventiveMeasures?.length) {
    output += `🛡️ Preventive Measures:\n`;
    for (const p of result.preventiveMeasures) {
      output += `- ${p}\n`;
    }
    output += "\n";
  }

  if (result.sources?.length) {
    output += `📁 FHIR Sources:\n`;
    for (const s of result.sources) {
      output += `- ${s}\n`;
    }
    output += "\n";
  }

  return output.trim();
};
