// components/property/PropertyCreateButton.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export const PropertyCreateButton = () => {
  const router = useRouter()

  return (
    <Button onClick={() => router.push("/properties/create")}>
      <Plus className="mr-2 h-4 w-4" />
      Create Property
    </Button>
  )
}