type Props = {
  emotion: string;
  intensity: string;
};

export default function MoodIndicator({ emotion, intensity }: Props) {
  const colorMap: Record<string, string> = {
    calm: "green",
    stressed: "yellow",
    anxious: "orange",
    angry: "red",
    sad: "blue",
    confused: "gray",
  };

  const color = colorMap[emotion] || "gray";

  return (
    <div className={`p-3 rounded-xl bg-${color}-100`}>
      <p className={`text-${color}-700 font-medium`}>
        Emotion: {emotion}
      </p>
      <p className="text-sm text-gray-600">
        Intensity: {intensity}
      </p>
    </div>
  );
}
