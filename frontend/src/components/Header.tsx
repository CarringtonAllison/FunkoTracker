interface HeaderProps {
  lastFetchedAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ lastFetchedAt, onRefresh, isRefreshing }: HeaderProps) {
  const formattedDate = lastFetchedAt
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastFetchedAt))
    : 'Never';

  return (
    <header className="bg-funko-darker border-b-4 border-funko-orange sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-funko-orange flex items-center justify-center font-bold text-white text-lg select-none">
            F
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Funko Tracker</h1>
            <p className="text-gray-400 text-xs">Live updates from funko.com</p>
          </div>
        </div>

        {/* Last fetched + refresh */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Last updated</p>
            <p className="text-funko-light text-sm font-medium">{formattedDate}</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-funko-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Refreshing…
              </>
            ) : (
              'Refresh Now'
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
