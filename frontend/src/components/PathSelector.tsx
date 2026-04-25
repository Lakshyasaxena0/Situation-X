type Path = {
  action: string;
  risk: string;
  stability: string;
};

type Props = {
  paths: Path[];
};

export default function PathSelector({ paths }: Props) {
  return (
    <div className="space-y-3">
      {paths.map((path, index) => (
        <div
          key={index}
          className="p-3 border rounded-xl hover:shadow transition"
        >
          <p className="font-medium">{path.action}</p>
          <div className="text-sm text-gray-600 mt-1">
            Risk: {path.risk} | Stability: {path.stability}
          </div>
        </div>
      ))}
    </div>
  );
}
