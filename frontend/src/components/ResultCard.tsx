type Props = {
  result: {
    recommendedAction: string;
    reasoning: string;
    riskLevel: string;
  };
};

export default function ResultCard({ result }: Props) {
  return (
    <div className="p-4 rounded-2xl shadow-md bg-white border">
      <h2 className="text-lg font-semibold mb-2">Recommended Action</h2>
      <p className="text-gray-800 mb-3">{result.recommendedAction}</p>

      <h3 className="text-sm font-medium text-gray-600">Reasoning</h3>
      <p className="text-gray-700 mb-3">{result.reasoning}</p>

      <div>
        <span className="text-sm font-medium">Risk Level: </span>
        <span
          className={`px-2 py-1 rounded ${
            result.riskLevel === "high"
              ? "bg-red-100 text-red-600"
              : result.riskLevel === "medium"
              ? "bg-yellow-100 text-yellow-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {result.riskLevel}
        </span>
      </div>
    </div>
  );
}
