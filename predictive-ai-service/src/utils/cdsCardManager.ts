type CDSCard = {
  summary: string;
  indicator: "info" | "warning" | "critical";
  source: { label: string };
  links?: { label: string; url: string; type: string }[];
};

const displayedCards: CDSCard[] = [];

export function createCDSCard(summary: string, indicator: "warning" | "critical") {
  const newCard: CDSCard = {
    summary,
    indicator,
    source: { label: "AI Predictive Risk Assessment" },
    links: [
      {
        label: "Review Full Analysis",
        url: "https://meldrx-predictiveai-application.apps.darenahealth.com/launch",
        type: "smart",
      },
    ],
  };

  // Avoid duplicates (based on summary)
  const alreadyExists = displayedCards.some((card) => card.summary === summary);
  if (!alreadyExists) {
    displayedCards.push(newCard);
    console.log("🚨 New CDS Card:", newCard); // Replace with modal, toast, etc.
  }
}

export function getCDSCards() {
  return displayedCards;
}
