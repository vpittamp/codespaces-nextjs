"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// You'll need to implement this function to call the Microsoft Graph API
import { getExcelEmbedUrl } from '@/app/actions'

interface ExcelViewerProps {
  fileId: string
}

export function ExcelViewer() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEmbedUrl() {
      try {
        setIsLoading(true)
        const url = await getExcelEmbedUrl()
        setEmbedUrl(url)
        setError(null)
      } catch (err) {
        setError('Failed to load Excel file. Please try again.')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmbedUrl()
  }, [])

  return (
    <Card >
      <CardHeader>
        <CardTitle>Excel Viewer</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-[600px]" />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            width="100%"
            height="900"
            frameBorder="0"
            allowFullScreen
          />
        ) : (
          <div>No Excel file to display</div>
        )}
      </CardContent>
    </Card>
  )
}