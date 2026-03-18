import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFunkoData, useRefresh } from './api/funkoApi';
import Header from './components/Header';
import FunkoCard from './components/FunkoCard';
import NewsCard from './components/NewsCard';
import SectionHeader from './components/SectionHeader';
import EmptyState from './components/EmptyState';
import { buildVariantMap } from './utils/variants';

const queryClient = new QueryClient();

function Dashboard() {
  const { data, isLoading, isError, error } = useFunkoData();
  const refresh = useRefresh();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-funko-orange border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading Funko data…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-funko-red font-semibold">Failed to load data</p>
        <p className="text-gray-500 text-xs">{(error as Error)?.message}</p>
        <p className="text-gray-500 text-xs">Make sure the backend is running on port 3001.</p>
      </div>
    );
  }

  return (
    <>
      <Header
        lastFetchedAt={data?.last_fetched_at ?? null}
        onRefresh={() => refresh.mutate()}
        isRefreshing={refresh.isPending}
      />

      {refresh.isError && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-funko-red/10 border border-funko-red/30 text-funko-red rounded-lg px-4 py-3 text-sm">
            Refresh failed: {(refresh.error as Error)?.message}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-12">
        {/* New Releases */}
        <section>
          <SectionHeader
            title="New Releases"
            count={data?.new_releases.length ?? 0}
            accentColor="orange"
          />
          {(() => {
            const variantMap = buildVariantMap(data?.new_releases ?? []);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data?.new_releases.length ? (
                  data.new_releases.map((item) => {
                    const v = variantMap.get(item.external_id);
                    return (
                      <FunkoCard
                        key={item.external_id}
                        item={item}
                        badge="NEW"
                        badgeColor="orange"
                        variantBadge={v?.variantLabel ?? undefined}
                        variantBadgeClass={v?.variantClass}
                      />
                    );
                  })
                ) : (
                  <EmptyState message="No new releases found. Hit Refresh Now to fetch the latest." />
                )}
              </div>
            );
          })()}
        </section>

        {/* Back in Stock */}
        <section>
          <SectionHeader
            title="Back in Stock"
            count={data?.back_in_stock.length ?? 0}
            accentColor="red"
          />
          {(() => {
            const variantMap = buildVariantMap(data?.back_in_stock ?? []);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data?.back_in_stock.length ? (
                  data.back_in_stock.map((item) => {
                    const v = variantMap.get(item.external_id);
                    return (
                      <FunkoCard
                        key={item.external_id}
                        item={item}
                        badge="BACK"
                        badgeColor="red"
                        variantBadge={v?.variantLabel ?? undefined}
                        variantBadgeClass={v?.variantClass}
                      />
                    );
                  })
                ) : (
                  <EmptyState message="No back-in-stock items found." />
                )}
              </div>
            );
          })()}
        </section>

        {/* News & Updates */}
        <section>
          <SectionHeader
            title="News & Updates"
            count={data?.news_updates.length ?? 0}
            accentColor="orange"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.news_updates.length ? (
              data.news_updates.map((item) => (
                <NewsCard key={item.external_id} item={item} />
              ))
            ) : (
              <EmptyState message="No news updates found." />
            )}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-funko-gray py-6 text-center text-gray-600 text-xs">
        Funko Tracker — data sourced from funko.com
      </footer>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
