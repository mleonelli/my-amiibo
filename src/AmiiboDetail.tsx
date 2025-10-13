"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, Gamepad2, Loader2, ShoppingCart, ExternalLink } from "lucide-react"

interface AmiiboDetailProps {
  amiibo: {
    name: string
    image: string
    character: string
    gameSeries: string
    amiiboSeries: string
    type: string
  }
  onClose: () => void
  shoppingData?: {
    id: string
    name: string
    image: string
    links: {
      amazon?: Record<string, string>
      ebay?: Record<string, string>
      bestbuy?: Record<string, string>
    }
  } | null
}

interface ReleaseDate {
  au?: string
  eu?: string
  jp?: string
  na?: string
}

interface GameUsage {
  gameName: string
  amiiboUsage?: Array<{
    Usage: string
    write: boolean
  }>
}

interface AmiiboDetailData {
  release: ReleaseDate
  games3DS?: GameUsage[]
  gamesSwitch?: GameUsage[]
  gamesWiiU?: GameUsage[]
}

export default function AmiiboDetail({ amiibo, onClose, shoppingData }: AmiiboDetailProps) {
  const [detailData, setDetailData] = useState<AmiiboDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAmiiboDetails()
  }, [amiibo.name])

  const fetchAmiiboDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if we need to update the cache
      const shouldUpdate = await shouldUpdateDetailCache()
      const cacheKey = `amiibo_detail_${amiibo.name}`

      if (!shouldUpdate) {
        // Use cached data
        console.log("[v0] Loading amiibo from cache...")
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          setDetailData(parsed)
          setLoading(false)
          return
        }
      }

      // Fetch fresh data from API
      const response = await fetch(
        `https://www.amiiboapi.com/api/amiibo/?name=${encodeURIComponent(amiibo.name)}&showusage&showgames`,
      )
      const data = await response.json()

      if (data.amiibo && data.amiibo.length > 0) {
        const detailInfo = data.amiibo[0]
        setDetailData(detailInfo)

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(detailInfo))

        // Update the lastupdated timestamp
        try {
          const lastUpdatedResponse = await fetch("https://amiiboapi.com/api/lastupdated/")
          const lastUpdatedData = await lastUpdatedResponse.json()
          localStorage.setItem("amiibo_details_lastupdated", lastUpdatedData.lastUpdated)
        } catch (err) {
          console.error("Failed to update lastupdated timestamp:", err)
        }
      } else {
        setError("No details found for this Amiibo")
      }
    } catch (err) {
      // Network error fallback: try to use cached data
      const cacheKey = `amiibo_detail_${amiibo.name}`
      const cachedData = localStorage.getItem(cacheKey)

      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        setDetailData(parsed)
      } else {
        setError("Failed to load Amiibo details")
      }

      console.error("Error fetching amiibo details:", err)
    } finally {
      setLoading(false)
    }
  }

  const shouldUpdateDetailCache = async (): Promise<boolean> => {
    try {
      const response = await fetch("https://amiiboapi.com/api/lastupdated/")
      const data = await response.json()
      const apiLastUpdated = data.lastUpdated

      const localLastUpdated = localStorage.getItem("amiibo_details_lastupdated")

      // If no local timestamp or API has newer data, we should update
      if (!localLastUpdated || apiLastUpdated !== localLastUpdated) {
        return true
      }

      // Check if we have cached data for this specific amiibo
      const cacheKey = `amiibo_detail_${amiibo.name}`
      const cachedData = localStorage.getItem(cacheKey)

      // If no cached data for this amiibo, we should fetch it
      return !cachedData
    } catch (err) {
      // If we can't reach the API, check if we have cached data
      const cacheKey = `amiibo_detail_${amiibo.name}`
      const cachedData = localStorage.getItem(cacheKey)

      // Return false to use cache if available, true to try fetching if no cache
      return !cachedData
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not released"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const regionNames: Record<string, string> = {
    au: "Australia",
    eu: "Europe",
    jp: "Japan",
    na: "North America",
  }

  const retailerNames: Record<string, string> = {
    amazon: "Amazon",
    ebay: "eBay",
    bestbuy: "Best Buy",
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl z-10 px-4 md:px-6 py-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors active:scale-95"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Collection</span>
            </button>
          </div>

          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="bg-gray-50 rounded-lg p-6 md:p-8">
                  <img
                    src={amiibo.image || "/placeholder.svg"}
                    alt={amiibo.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain"
                  />
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{amiibo.name}</h1>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Character</span>
                    <p className="text-base text-gray-900">{amiibo.character}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Game Series</span>
                    <p className="text-base text-gray-900">{amiibo.gameSeries}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Amiibo Series</span>
                    <p className="text-base text-gray-900">{amiibo.amiiboSeries}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Type</span>
                    <p className="text-base text-gray-900">{amiibo.type}</p>
                  </div>
                </div>
              </div>
            </div>

            {shoppingData && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 md:p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="text-blue-600" size={24} />
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Where to Buy</h2>
                </div>

                <div className="space-y-4">
                  {Object.entries(shoppingData.links).map(([retailer, regions]) => (
                    <div key={retailer} className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        {retailerNames[retailer] || retailer}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(regions).map(([region, url]) => (
                          <a
                            key={region}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 rounded-lg transition-colors group"
                          >
                            <span className="text-sm font-medium text-blue-700">{region.toUpperCase()}</span>
                            <ExternalLink size={14} className="text-blue-500 group-hover:text-blue-700" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && detailData && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-red-600" size={20} />
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900">Release Dates</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(detailData.release || {}).map(([region, date]) => (
                      <div key={region} className="bg-white rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-500 mb-1">
                          {regionNames[region] || region.toUpperCase()}
                        </div>
                        <div className="text-base text-gray-900">{formatDate(date)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {(detailData.gamesSwitch || detailData.games3DS || detailData.gamesWiiU) && (
                  <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Gamepad2 className="text-blue-600" size={20} />
                      <h2 className="text-lg md:text-xl font-semibold text-gray-900">Compatible Games</h2>
                    </div>

                    <div className="space-y-6">
                      {detailData.gamesSwitch && detailData.gamesSwitch.length > 0 && (
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            Nintendo Switch
                            <span className="text-sm font-normal text-gray-500">
                              ({detailData.gamesSwitch.length} games)
                            </span>
                          </h3>
                          <div className="space-y-3">
                            {detailData.gamesSwitch.map((game, index) => (
                              <div key={index} className="bg-white rounded-lg p-4">
                                <div className="font-medium text-gray-900 mb-2">{game.gameName}</div>
                                {game.amiiboUsage && game.amiiboUsage.length > 0 && (
                                  <ul className="space-y-1">
                                    {game.amiiboUsage.map((usage, idx) => (
                                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>
                                          {usage.Usage}
                                          {usage.write && (
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                              Write
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.games3DS && detailData.games3DS.length > 0 && (
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            Nintendo 3DS
                            <span className="text-sm font-normal text-gray-500">
                              ({detailData.games3DS.length} games)
                            </span>
                          </h3>
                          <div className="space-y-3">
                            {detailData.games3DS.map((game, index) => (
                              <div key={index} className="bg-white rounded-lg p-4">
                                <div className="font-medium text-gray-900 mb-2">{game.gameName}</div>
                                {game.amiiboUsage && game.amiiboUsage.length > 0 && (
                                  <ul className="space-y-1">
                                    {game.amiiboUsage.map((usage, idx) => (
                                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>
                                          {usage.Usage}
                                          {usage.write && (
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                              Write
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.gamesWiiU && detailData.gamesWiiU.length > 0 && (
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            Wii U
                            <span className="text-sm font-normal text-gray-500">
                              ({detailData.gamesWiiU.length} games)
                            </span>
                          </h3>
                          <div className="space-y-3">
                            {detailData.gamesWiiU.map((game, index) => (
                              <div key={index} className="bg-white rounded-lg p-4">
                                <div className="font-medium text-gray-900 mb-2">{game.gameName}</div>
                                {game.amiiboUsage && game.amiiboUsage.length > 0 && (
                                  <ul className="space-y-1">
                                    {game.amiiboUsage.map((usage, idx) => (
                                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>
                                          {usage.Usage}
                                          {usage.write && (
                                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                              Write
                                            </span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!detailData.gamesSwitch && !detailData.games3DS && !detailData.gamesWiiU && (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-500">No game compatibility information available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
