"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      duration={4000}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-lg !border !shadow-lg !font-sans !text-sm",
          title: "!font-medium",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
