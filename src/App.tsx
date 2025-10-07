import { useState, useEffect, useMemo } from 'react';
import { Star, Download, Upload, Search, Filter } from 'lucide-react';
import amiiboData from './data/amiibo.json';

interface Amiibo {
  amiiboSeries: string;
  character: string;
  gameSeries: string;
  head: string;
  image: string;
  name: string;
  tail: string;
  type: string;
}

interface AmiiboWithStatus extends Amiibo {
  owned: boolean;
  favorite: boolean;
}

function App() {
  const [amiibos, setAmiibos] = useState<AmiiboWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwned, setFilterOwned] = useState<boolean | null>(null);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string>('');

  useEffect(() => {
    fetchAmiibos();
  }, []);

  const fetchAmiibos = () => {
    try {
      const savedData = localStorage.getItem('amiiboCollection');
      const savedStatuses: Record<string, { owned: boolean; favorite: boolean }> = savedData
        ? JSON.parse(savedData)
        : {};

      const amiiboWithStatus: AmiiboWithStatus[] = amiiboData.amiibo.map((amiibo: Amiibo) => {
        const id = `${amiibo.head}${amiibo.tail}`;
        return {
          ...amiibo,
          owned: savedStatuses[id]?.owned || false,
          favorite: savedStatuses[id]?.favorite || false,
        };
      });

      setAmiibos(amiiboWithStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error loading amiibos:', error);
      setLoading(false);
    }
  };

  const saveToLocalStorage = (updatedAmiibos: AmiiboWithStatus[]) => {
    const statuses: Record<string, { owned: boolean; favorite: boolean }> = {};
    updatedAmiibos.forEach(amiibo => {
      const id = `${amiibo.head}${amiibo.tail}`;
      statuses[id] = {
        owned: amiibo.owned,
        favorite: amiibo.favorite,
      };
    });
    localStorage.setItem('amiiboCollection', JSON.stringify(statuses));
  };

  const toggleOwned = (index: number) => {
    const updated = [...amiibos];
    updated[index].owned = !updated[index].owned;
    setAmiibos(updated);
    saveToLocalStorage(updated);
  };

  const toggleFavorite = (index: number) => {
    const updated = [...amiibos];
    updated[index].favorite = !updated[index].favorite;
    setAmiibos(updated);
    saveToLocalStorage(updated);
  };

  const exportCollection = () => {
    const statuses: Record<string, { owned: boolean; favorite: boolean }> = {};
    amiibos.forEach(amiibo => {
      const id = `${amiibo.head}${amiibo.tail}`;
      if (amiibo.owned || amiibo.favorite) {
        statuses[id] = {
          owned: amiibo.owned,
          favorite: amiibo.favorite,
        };
      }
    });

    const dataStr = JSON.stringify(statuses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'amiibo-collection.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        localStorage.setItem('amiiboCollection', JSON.stringify(imported));

        const updated = amiibos.map(amiibo => {
          const id = `${amiibo.head}${amiibo.tail}`;
          return {
            ...amiibo,
            owned: imported[id]?.owned || false,
            favorite: imported[id]?.favorite || false,
          };
        });
        setAmiibos(updated);
      } catch (error) {
        alert('Error importing file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const uniqueSeries = useMemo(() => {
    const series = new Set(amiibos.map(a => a.gameSeries));
    return Array.from(series).sort();
  }, [amiibos]);

  const filteredAmiibos = useMemo(() => {
    return amiibos.filter(amiibo => {
      const matchesSearch = searchTerm === '' ||
        amiibo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        amiibo.character.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesOwned = filterOwned === null || amiibo.owned === filterOwned;
      const matchesFavorite = !filterFavorite || amiibo.favorite;
      const matchesSeries = selectedSeries === '' || amiibo.gameSeries === selectedSeries;

      return matchesSearch && matchesOwned && matchesFavorite && matchesSeries;
    });
  }, [amiibos, searchTerm, filterOwned, filterFavorite, selectedSeries]);

  const stats = useMemo(() => {
    return {
      total: amiibos.length,
      owned: amiibos.filter(a => a.owned).length,
      favorites: amiibos.filter(a => a.favorite).length,
    };
  }, [amiibos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading Amiibo collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
            Nintendo Amiibo Collection
          </h1>
          <p className="text-gray-600 text-base md:text-lg">Track your complete Amiibo collection</p>

          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 items-stretch sm:items-center bg-white rounded-lg shadow-sm p-4">
            <div className="flex gap-4 justify-around sm:justify-start flex-1">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs md:text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.owned}</div>
                <div className="text-xs md:text-sm text-gray-600">Owned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-600">{stats.favorites}</div>
                <div className="text-xs md:text-sm text-gray-600">Favorites</div>
              </div>
            </div>

            <div className="w-full sm:w-auto sm:ml-auto flex gap-2 md:gap-3">
              <button
                onClick={exportCollection}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base active:scale-95"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
              <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm md:text-base active:scale-95">
                <Upload size={18} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importCollection}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </header>

        <div className="mb-4 md:mb-6 bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-600" />
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search size={16} className="inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ownership Status
              </label>
              <select
                value={filterOwned === null ? 'all' : filterOwned ? 'owned' : 'not-owned'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterOwned(value === 'all' ? null : value === 'owned');
                }}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="owned">Owned</option>
                <option value="not-owned">Not Owned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Game Series
              </label>
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Series</option>
                {uniqueSeries.map(series => (
                  <option key={series} value={series}>{series}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterFavorite}
                  onChange={(e) => setFilterFavorite(e.target.checked)}
                  className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Favorites Only
                </span>
              </label>
            </div>
          </div>

          <div className="mt-3 md:mt-4 text-xs md:text-sm text-gray-600">
            Showing {filteredAmiibos.length} of {stats.total} amiibos
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {filteredAmiibos.map((amiibo, index) => {
            const originalIndex = amiibos.findIndex(
              a => a.head === amiibo.head && a.tail === amiibo.tail
            );

            return (
              <div
                key={`${amiibo.head}${amiibo.tail}`}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-xl active:scale-95 ${
                  amiibo.owned ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="relative aspect-square bg-gray-50 p-2 md:p-4">
                  <img
                    src={amiibo.image}
                    alt={amiibo.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <button
                    onClick={() => toggleFavorite(originalIndex)}
                    className={`absolute top-1 right-1 md:top-2 md:right-2 p-1.5 md:p-2 rounded-full transition-colors active:scale-90 ${
                      amiibo.favorite
                        ? 'bg-yellow-400 text-white'
                        : 'bg-white/80 text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    <Star size={16} className="md:w-[18px] md:h-[18px]" fill={amiibo.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="p-2 md:p-3">
                  <h3 className="font-semibold text-xs md:text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2rem] md:min-h-[2.5rem]">
                    {amiibo.name}
                  </h3>

                  <div className="text-[10px] md:text-xs text-gray-600 mb-1.5 md:mb-2 space-y-0.5 md:space-y-1">
                    <div className="line-clamp-1">{amiibo.type}</div>
                    <div className="line-clamp-1">{amiibo.gameSeries}</div>
                  </div>

                  <button
                    onClick={() => toggleOwned(originalIndex)}
                    className={`w-full py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-colors active:scale-95 ${
                      amiibo.owned
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {amiibo.owned ? 'Owned' : 'Not Owned'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAmiibos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No amiibos match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
