"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { format } from "date-fns"
import { MapPin, Calendar, ShoppingBag, DollarSign } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "../../hooks/use-toast"
import 'leaflet/dist/leaflet.css'

interface MapData {
  id: string
  store_name: string
  date: string
  total_amount: number
  address: string
  location: {
    lat: number
    lon: number
    display_name: string
  }
  items: Array<{
    name: string
    price: string
    category: string
  }>
}

export default function ExpenseMap() {
  const [mapData, setMapData] = useState<MapData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMarker, setSelectedMarker] = useState<MapData | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchMapData()
  }, [])

  useEffect(() => {
    if (mapData.length > 0 && !mapLoaded && mapRef.current) {
      loadMap()
    }
  }, [mapData, mapLoaded])

  const fetchMapData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/map-data", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMapData(data)
      } else {
        throw new Error("Failed to fetch map data")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expense map data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMap = async () => {
    if (!mapRef.current || mapData.length === 0) return

    try {
      const L = await import("leaflet")

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      // Calculate center based on all markers
      const lats = mapData.map((item) => item.location.lat)
      const lons = mapData.map((item) => item.location.lon)
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length
      const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length

      // Initialize map with explicit options
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [centerLat, centerLon],
        zoom: 13,
        zoomControl: true,
        preferCanvas: true,
      })

      // Add tile layer with error handling
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        detectRetina: true,
      }).addTo(mapInstanceRef.current)

      tileLayer.on('tileerror', () => {
        console.warn('Failed to load map tiles')
      })

      // Add markers
      markersRef.current = mapData.map((item) => {
        const marker = L.marker([item.location.lat, item.location.lon], {
          title: item.store_name,
          alt: `Purchase at ${item.store_name}`,
          riseOnHover: true,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${item.store_name}</h3>
              <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.3;">${item.address}</p>
              <p style="margin: 4px 0 2px 0; font-weight: bold; color: #059669;">$${item.total_amount.toFixed(2)}</p>
              <p style="margin: 0; font-size: 12px; color: #666;">${new Date(item.date).toLocaleDateString()}</p>
            </div>
          `)
          .on("click", () => {
            setSelectedMarker(item)
          })

        return marker
      })

      // Fit map to show all markers with padding
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current)
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2))
      }

      // Handle window resize
      const handleResize = () => {
        mapInstanceRef.current.invalidateSize()
      }
      window.addEventListener('resize', handleResize)

      setMapLoaded(true)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    } catch (error) {
      console.error("Error loading map:", error)
      toast({
        title: "Error",
        description: "Failed to load map. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current = []
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading map data...</p>
        </div>
      </div>
    )
  }

  if (mapData.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Map</h1>
          <p className="text-gray-600 dark:text-gray-300">Visualize your expenses geographically</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <MapPin className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">No Map Data Available</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mt-2">
              Upload bills with valid addresses to see your expenses on the map.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Map</h1>
        <p className="text-gray-600 dark:text-gray-300">Visualize your expenses geographically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expense Locations</CardTitle>
            <CardDescription>Map of all your purchase locations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] w-full rounded-b-lg overflow-hidden relative">
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Loading map...</p>
                  </div>
                </div>
              )}
              <div 
                ref={mapRef} 
                className="h-full w-full z-0"
                style={{ minHeight: '500px' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
            <CardDescription>
              {selectedMarker ? "Selected purchase information" : "Click on a marker to see details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMarker ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium">{selectedMarker.store_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Store</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium">{format(new Date(selectedMarker.date), "PPP")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Date</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium">${selectedMarker.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-sm">{selectedMarker.address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                  </div>
                </div>

                <div className="pt-2 border-t dark:border-gray-700">
                  <p className="font-medium mb-2">Purchased Items</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {selectedMarker.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <Badge variant="outline" className="mt-1">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="font-bold">${item.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <MapPin className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select a location on the map to view purchase details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}