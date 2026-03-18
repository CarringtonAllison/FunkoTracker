interface SectionHeaderProps {
  title: string;
  count: number;
  accentColor?: 'orange' | 'red';
}

export default function SectionHeader({ title, count, accentColor = 'orange' }: SectionHeaderProps) {
  const barColor = accentColor === 'red' ? 'bg-funko-red' : 'bg-funko-orange';
  const countColor = accentColor === 'red' ? 'bg-funko-red' : 'bg-funko-orange';

  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-1 h-8 rounded-full ${barColor}`} />
      <h2 className="text-white font-bold text-xl">{title}</h2>
      <span className={`ml-1 ${countColor} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
        {count}
      </span>
    </div>
  );
}
