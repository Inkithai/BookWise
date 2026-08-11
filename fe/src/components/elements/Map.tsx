// components/common/Map.tsx
"use client"

import { useEffect, useRef } from "react"

interface MapProps {
  lat: number
  lng: number
  readonly?: boolean
  className?: string
}

export const Map = ({ lat, lng, className = "" }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current) {
      const iframe = document.createElement("iframe")
      iframe.src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
      iframe.width = "100%"
      iframe.height = "100%"
      iframe.style.border = "0"
      iframe.allowFullscreen = true // Fixed property name
      iframe.setAttribute("aria-hidden", "false")
      iframe.setAttribute("aria-label", "Property location")
      
      mapRef.current.innerHTML = ""
      mapRef.current.appendChild(iframe)
    }
  }, [lat, lng])

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full rounded-lg overflow-hidden ${className}`}
    />
  )
}