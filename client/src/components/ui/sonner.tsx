import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster with project design tokens applied.
 * - Base: neutral-900 background (#18181B)
 * - Accent: emerald-500 (#10B981)
 * - Error: rose-500 (#F43F5E)
 * - Warning: amber-400 (#FBBF24)
 * - richColors is disabled to keep full control over colors via CSS variables.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      closeButton
      duration={4000}
      style={
        {
          // Base toast
          "--normal-bg": "#18181B",
          "--normal-text": "#FAFAFA",
          "--normal-border": "rgba(255, 255, 255, 0.08)",

          // Success toast — emerald accent
          "--success-bg": "#0D1F17",
          "--success-text": "#FAFAFA",
          "--success-border": "rgba(16, 185, 129, 0.25)",

          // Error toast — rose (not bright red)
          "--error-bg": "#1C0F12",
          "--error-text": "#FAFAFA",
          "--error-border": "rgba(244, 63, 94, 0.25)",

          // Warning toast — amber
          "--warning-bg": "#1C160A",
          "--warning-text": "#FAFAFA",
          "--warning-border": "rgba(251, 191, 36, 0.25)",

          // Info toast
          "--info-bg": "#0F1620",
          "--info-text": "#FAFAFA",
          "--info-border": "rgba(56, 189, 248, 0.25)",

          // Description text
          "--description-color": "#A1A1AA",

          // Close button
          "--close-button-bg": "rgba(255, 255, 255, 0.06)",
          "--close-button-border": "rgba(255, 255, 255, 0.08)",
          "--close-button-color": "#A1A1AA",

          // Font
          "--font-family": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !shadow-xl !text-sm !border",
          title: "!font-semibold",
          description: "!text-xs",
          success: "!border-emerald-500/25",
          error: "!border-rose-500/25",
          warning: "!border-amber-400/25",
          info: "!border-sky-400/25",
          closeButton: "!rounded-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
