import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Star, Download, Upload, Search, Filter, ShoppingCart, Share2 } from "lucide-react"
import LZString from "lz-string"
import AmiiboDetail from "./AmiiboDetail"
import ShoppingLinksModal from "./ShoppingLinksModal"
import shoppingLinksData from "./data/shopping-links.json"

interface Amiibo {
  amiiboSeries: string
  character: string
  gameSeries: string
  head: string
  image: string
  name: string
  tail: string
  type: string
}

interface AmiiboWithStatus extends Amiibo {
  owned: boolean
  favorite: boolean
}

interface ShoppingLink {
  id: string
  name: string
  image: string
  links: {
    amazon?: Record<string, string>
    ebay?: Record<string, string>
    bestbuy?: Record<string, string>
  }
}

function App() {
  const [amiibos, setAmiibos] = useState<AmiiboWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterOwned, setFilterOwned] = useState<boolean | null>(null)
  const [filterFavorite, setFilterFavorite] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<string>("")
  const [selectedTypes, setSelectedTypes] = useState<string>("")
  const [selectedAmiibo, setSelectedAmiibo] = useState<AmiiboWithStatus | null>(null)
  const [shoppingLinks, setShoppingLinks] = useState<Record<string, ShoppingLink>>({})
  const [selectedShoppingAmiibo, setSelectedShoppingAmiibo] = useState<ShoppingLink | null>(null)
  const [shareMode, setShareMode] = useState(false)
  const [sharedCollection, setSharedCollection] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkForSharedCollection()
    fetchAmiibos()
    loadShoppingLinks()
  }, [])

  const checkForSharedCollection = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const collectionParam = urlParams.get("collection")

    if (collectionParam) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(collectionParam)
        if (!decompressed) {
          console.error("Failed to decompress shared collection")
          return
        }

        const ownedIds = JSON.parse(decompressed)
        setSharedCollection(new Set(ownedIds))
        setShareMode(true)
        setFilterOwned(true)
      } catch (error) {
        console.error("Error decoding shared collection:", error)
      }
    }
  }

  const loadShoppingLinks = () => {
    const linksMap: Record<string, ShoppingLink> = {}
    shoppingLinksData.forEach((link) => {
      linksMap[link.id] = link
    })
    setShoppingLinks(linksMap)
  }

  const hasShoppingLinks = (amiibo: AmiiboWithStatus): boolean => {
    const id = `${amiibo.head}${amiibo.tail}`
    return id in shoppingLinks
  }

  const getShoppingData = (amiibo: AmiiboWithStatus): ShoppingLink | null => {
    const id = `${amiibo.head}${amiibo.tail}`
    return shoppingLinks[id] || null
  }

  const fetchAmiibos = async () => {
    try {
      const shouldUpdate = await shouldUpdateCache()

      let amiiboData: Amiibo[]

      if (shouldUpdate) {
        console.log("[v0] Fetching fresh data from API...")
        const response = await fetch("https://www.amiiboapi.com/api/amiibo/")
        const data = await response.json()
        amiiboData = data.amiibo

        const timestampResponse = await fetch("https://www.amiiboapi.com/api/lastupdated/")
        const timestampData = await timestampResponse.json()

        localStorage.setItem("amiiboData", JSON.stringify(amiiboData))
        localStorage.setItem("amiiboLastUpdated", timestampData.lastUpdated)
      } else {
        console.log("[v0] Loading data from cache...")
        const cachedData = localStorage.getItem("amiiboData")
        amiiboData = cachedData ? JSON.parse(cachedData) : []
      }

      let savedStatuses: Record<string, { owned: boolean; favorite: boolean }> = {}

      if (shareMode && sharedCollection.size > 0) {
        sharedCollection.forEach((id) => {
          savedStatuses[id] = { owned: true, favorite: false }
        })
      } else {
        const savedData = localStorage.getItem("amiiboCollection")
        savedStatuses = savedData ? JSON.parse(savedData) : {}
      }

      const amiiboWithStatus: AmiiboWithStatus[] = amiiboData.map((amiibo: Amiibo) => {
        const id = `${amiibo.head}${amiibo.tail}`
        return {
          ...amiibo,
          owned: savedStatuses[id]?.owned || false,
          favorite: savedStatuses[id]?.favorite || false,
        }
      })

      setAmiibos(amiiboWithStatus)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching amiibos:", error)
      setLoading(false)
    }
  }

  const shouldUpdateCache = async (): Promise<boolean> => {
    try {
      const cachedData = localStorage.getItem("amiiboData")
      const cachedTimestamp = localStorage.getItem("amiiboLastUpdated")

      if (!cachedData || !cachedTimestamp) {
        console.log("[v0] No cache found, will fetch fresh data")
        return true
      }

      try {
        const response = await fetch("https://www.amiiboapi.com/api/lastupdated/")
        const data = await response.json()
        const apiTimestamp = data.lastUpdated

        if (apiTimestamp !== cachedTimestamp) {
          console.log("[v0] Cache is outdated, will fetch fresh data")
          return true
        }

        console.log("[v0] Cache is up to date")
        return false
      } catch (error) {
        console.log("[v0] Network unavailable, using cached data")
        return false
      }
    } catch (error) {
      console.error("Error checking cache status:", error)
      return !localStorage.getItem("amiiboData")
    }
  }

  const saveToLocalStorage = (updatedAmiibos: AmiiboWithStatus[]) => {
    const statuses: Record<string, { owned: boolean; favorite: boolean }> = {}
    updatedAmiibos.forEach((amiibo) => {
      const id = `${amiibo.head}${amiibo.tail}`
      statuses[id] = {
        owned: amiibo.owned,
        favorite: amiibo.favorite,
      }
    })
    localStorage.setItem("amiiboCollection", JSON.stringify(statuses))
  }

  const preloadAmiiboDetails = async (amiibo: AmiiboWithStatus) => {
    try {
      const cacheKey = `amiibo_detail_${amiibo.name}`
      const cachedDetail = localStorage.getItem(cacheKey)
      const cachedTimestamp = localStorage.getItem("amiibo_details_lastupdated")

      let shouldFetch = !cachedDetail

      if (cachedDetail && cachedTimestamp) {
        try {
          const timestampResponse = await fetch("https://www.amiiboapi.com/api/lastupdated/")
          const timestampData = await timestampResponse.json()

          if (timestampData.lastUpdated !== cachedTimestamp) {
            shouldFetch = true
          }
        } catch (error) {
          shouldFetch = false
        }
      }

      if (shouldFetch) {
        console.log(`[v0] Preloading details for ${amiibo.name}...`)
        const response = await fetch(
          `https://www.amiiboapi.com/api/amiibo/?name=${encodeURIComponent(amiibo.name)}&showusage&showgames`,
        )
        const data = await response.json()

        if (data.amiibo && data.amiibo.length > 0) {
          const detailInfo = data.amiibo[0]
          localStorage.setItem(cacheKey, JSON.stringify(detailInfo))

          const timestampResponse = await fetch("https://www.amiiboapi.com/api/lastupdated/")
          const timestampData = await timestampResponse.json()
          localStorage.setItem("amiibo_details_lastupdated", timestampData.lastUpdated)

          console.log(`[v0] Successfully preloaded details for ${amiibo.name}`)
        }
      } else {
        console.log(`[v0] Details for ${amiibo.name} already cached`)
      }
    } catch (error) {
      console.error(`Error preloading details for ${amiibo.name}:`, error)
    }
  }

  const toggleOwned = (index: number) => {
    if (shareMode) return

    const updated = [...amiibos]
    updated[index].owned = !updated[index].owned
    setAmiibos(updated)
    saveToLocalStorage(updated)

    if (updated[index].owned) {
      preloadAmiiboDetails(updated[index])
    }
  }

  const toggleFavorite = (index: number) => {
    if (shareMode) return

    const updated = [...amiibos]
    updated[index].favorite = !updated[index].favorite
    setAmiibos(updated)
    saveToLocalStorage(updated)
  }

  const exportCollection = () => {
    const statuses: Record<string, { owned: boolean; favorite: boolean }> = {}
    amiibos.forEach((amiibo) => {
      const id = `${amiibo.head}${amiibo.tail}`
      if (amiibo.owned || amiibo.favorite) {
        statuses[id] = {
          owned: amiibo.owned,
          favorite: amiibo.favorite,
        }
      }
    })

    const dataStr = JSON.stringify(statuses, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "amiibo-collection.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        localStorage.setItem("amiiboCollection", JSON.stringify(imported))

        const updated = amiibos.map((amiibo) => {
          const id = `${amiibo.head}${amiibo.tail}`
          return {
            ...amiibo,
            owned: imported[id]?.owned || false,
            favorite: imported[id]?.favorite || false,
          }
        })
        setAmiibos(updated)
      } catch (error) {
        alert("Error importing file. Please ensure it is a valid JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const shareCollection = async () => {
    try {
      const ownedIds = amiibos.filter((a) => a.owned).map((a) => `${a.head}${a.tail}`)

      if (ownedIds.length === 0) {
        alert("You don't have any owned amiibos to share!")
        return
      }

      const encoded = btoa(JSON.stringify(ownedIds))
      const shareUrl = `${window.location.origin}${window.location.pathname}?collection=${encoded}`

      await navigator.clipboard.writeText(shareUrl)
      alert("Share link copied to clipboard!")
    } catch (error) {
      console.error("Error creating share link:", error)
      alert("Failed to create share link")
    }
  }

  const uniqueSeries = useMemo(() => {
    const series = new Set(amiibos.map((a) => a.gameSeries))
    return Array.from(series).sort()
  }, [amiibos])

  const uniqueTypes = useMemo(() => {
    const types = new Set(amiibos.map((a) => a.type))
    return Array.from(types).sort()
  }, [amiibos])

  const filteredAmiibos = useMemo(() => {
    return amiibos.filter((amiibo) => {
      const matchesSearch =
        searchTerm === "" ||
        amiibo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        amiibo.character.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesOwned = filterOwned === null || amiibo.owned === filterOwned
      const matchesFavorite = !filterFavorite || amiibo.favorite
      const matchesSeries = selectedSeries === "" || amiibo.gameSeries === selectedSeries
      const matchesTypes = selectedTypes === "" || amiibo.type === selectedTypes

      return matchesSearch && matchesOwned && matchesFavorite && matchesSeries && matchesTypes
    })
  }, [amiibos, searchTerm, filterOwned, filterFavorite, selectedSeries, selectedTypes])

  const stats = useMemo(() => {
    return {
      total: amiibos.length,
      owned: amiibos.filter((a) => a.owned).length,
      favorites: amiibos.filter((a) => a.favorite).length,
    }
  }, [amiibos])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading Amiibo collection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          {shareMode ? (
            <>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Shared Amiibo Collection</h1>
              <p className="text-gray-600 text-lg">Viewing a shared collection</p>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Nintendo Amiibo Collection</h1>
              <p className="text-gray-600 text-lg">Track your complete Amiibo collection</p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-6 items-center bg-white rounded-lg shadow-sm p-4">
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.owned}</div>
                <div className="text-sm text-gray-600">Owned</div>
              </div>
              {!shareMode && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.favorites}</div>
                  <div className="text-sm text-gray-600">Favorites</div>
                </div>
              )}
            </div>

            {!shareMode && (
              <div className="ml-auto flex gap-3">
                <button
                  onClick={shareCollection}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  title="Share your collection"
                >
                  <Share2 size={18} />
                  Share
                </button>
                <button
                  onClick={exportCollection}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download size={18} />
                  Export
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                  <Upload size={18} />
                  Import
                  <input type="file" accept=".json" onChange={importCollection} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </header>

        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!shareMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ownership Status</label>
                <select
                  value={filterOwned === null ? "all" : filterOwned ? "owned" : "not-owned"}
                  onChange={(e) => {
                    const value = e.target.value
                    setFilterOwned(value === "all" ? null : value === "owned")
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="owned">Owned</option>
                  <option value="not-owned">Not Owned</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Game Series</label>
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Series</option>
                {uniqueSeries.map((series) => (
                  <option key={series} value={series}>
                    {series}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={selectedTypes}
                onChange={(e) => setSelectedTypes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {uniqueTypes.map((types) => (
                  <option key={types} value={types}>
                    {types}
                  </option>
                ))}
              </select>
            </div>

            {!shareMode && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterFavorite}
                    onChange={(e) => setFilterFavorite(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Favorites Only</span>
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredAmiibos.length} of {stats.total} amiibos
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAmiibos.map((amiibo, index) => {
            const originalIndex = amiibos.findIndex((a) => a.head === amiibo.head && a.tail === amiibo.tail)

            return (
              <div
                key={`${amiibo.head}${amiibo.tail}`}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-xl ${
                  amiibo.owned ? "ring-2 ring-green-500" : ""
                }`}
              >
                <div
                  className="relative aspect-square bg-gray-50 p-4 cursor-pointer"
                  onClick={() => setSelectedAmiibo(amiibo)}
                >
                  <img
                    src={amiibo.image || "/placeholder.svg"}
                    alt={amiibo.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  {!shareMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(originalIndex)
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                        amiibo.favorite ? "bg-yellow-400 text-white" : "bg-white/80 text-gray-400 hover:text-yellow-400"
                      }`}
                    >
                      <Star size={18} fill={amiibo.favorite ? "currentColor" : "none"} />
                    </button>
                  )}
                  {hasShoppingLinks(amiibo) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const shoppingData = getShoppingData(amiibo)
                        if (shoppingData) {
                          setSelectedShoppingAmiibo(shoppingData)
                        }
                      }}
                      className="absolute top-2 left-2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      title="View shopping links"
                    >
                      <ShoppingCart size={18} />
                    </button>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                    {amiibo.name}
                  </h3>

                  <div className="text-xs text-gray-600 mb-2 space-y-1">
                    <div className="line-clamp-1">{amiibo.type}</div>
                    <div className="line-clamp-1">{amiibo.amiiboSeries}</div>
                  </div>

                  <button
                    onClick={() => !shareMode && toggleOwned(originalIndex)}
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      amiibo.owned
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } ${shareMode ? "cursor-default" : ""}`}
                    disabled={shareMode}
                  >
                    {amiibo.owned ? "Owned" : "Not Owned"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAmiibos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No amiibos match your filters</p>
          </div>
        )}
      </div>

      {selectedAmiibo && (
        <AmiiboDetail
          amiibo={selectedAmiibo}
          onClose={() => setSelectedAmiibo(null)}
          shoppingData={getShoppingData(selectedAmiibo)}
        />
      )}

      {selectedShoppingAmiibo && (
        <ShoppingLinksModal shoppingData={selectedShoppingAmiibo} onClose={() => setSelectedShoppingAmiibo(null)} />
      )}
    </div>
  )
}

export default App
