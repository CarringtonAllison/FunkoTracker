interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4 select-none">📦</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
