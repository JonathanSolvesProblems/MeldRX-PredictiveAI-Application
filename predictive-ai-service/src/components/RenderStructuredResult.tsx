const RenderStructuredResult = (result: any) => {
  return (
    <div className="space-y-4">
      {result.riskScores && (
        <div>
          <h3 className="font-semibold text-base">📊 Risk Scores</h3>
          <ul className="list-disc ml-5">
            {result.riskScores.map((item: any, idx: number) => (
              <li key={idx}>
                <strong>{item.label}</strong>: {item.score}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendedTreatments && (
        <div>
          <h3 className="font-semibold text-base">💊 Recommended Treatments</h3>
          <ul className="list-disc ml-5">
            {result.recommendedTreatments.map((item: any, idx: number) => (
              <li key={idx}>
                {item.treatment} ({item.condition})
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.preventiveMeasures && (
        <div>
          <h3 className="font-semibold text-base">🛡️ Preventive Measures</h3>
          <ul className="list-disc ml-5">
            {result.preventiveMeasures.map((item: any, idx: number) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.sources && (
        <div>
          <h3 className="font-semibold text-base">📁 Sources</h3>
          <ul className="list-disc ml-5 text-xs">
            {result.sources.map((src: string, idx: number) => (
              <li key={idx}>{src}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
