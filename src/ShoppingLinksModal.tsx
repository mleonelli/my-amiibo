"use client"

import { X, ExternalLink } from "lucide-react"

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

interface ShoppingLinksModalProps {
  shoppingData: ShoppingLink
  onClose: () => void
}

export default function ShoppingLinksModal({ shoppingData, onClose }: ShoppingLinksModalProps) {
  const regionNames: Record<string, string> = {
    us: "United States",
    uk: "United Kingdom",
    fr: "France",
    de: "Germany",
    it: "Italy",
    jp: "Japan",
  }

  const retailerNames: Record<string, string> = {
    amazon: "Amazon",
    ebay: "eBay",
    bestbuy: "Best Buy",
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Where to Buy</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <img
              src={shoppingData.image || "/placeholder.svg"}
              alt={shoppingData.name}
              className="w-20 h-20 object-contain bg-gray-50 rounded-lg p-2"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{shoppingData.name}</h3>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(shoppingData.links).map(([retailer, regions]) => (
              <div key={retailer} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {retailerNames[retailer] || retailer}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(regions).map(([region, url]) => (
                    <a
                      key={region}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-4 py-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-blue-700">
                        {regionNames[region] || region.toUpperCase()}
                      </span>
                      <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
