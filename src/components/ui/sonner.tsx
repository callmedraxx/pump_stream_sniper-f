"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
      // Provide an error variable consumers can use in CSS
      "--error-bg": "var(--destructive)",
      "--error-text": "#fff",
        } as React.CSSProperties
      }
    // place toasts in top-right
    position="top-right"
      {...props}
    />
  )
}

export { Toaster }
