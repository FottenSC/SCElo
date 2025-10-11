import * as React from "react"
import { Toast, ToastContainer, ToastProps } from "@/components/ui/toast"
import { createRoot } from "react-dom/client"

type ToastOptions = Omit<ToastProps, "id" | "onClose">

let toastCounter = 0
let toastRoot: ReturnType<typeof createRoot> | null = null
let toastContainer: HTMLElement | null = null

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.id = "toast-container"
    document.body.appendChild(toastContainer)
    toastRoot = createRoot(toastContainer)
  }
  return { container: toastContainer, root: toastRoot! }
}

const toasts = new Map<string, ToastOptions>()
let rerenderToasts: (() => void) | null = null

function ToastProvider() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  React.useEffect(() => {
    rerenderToasts = forceUpdate
    return () => {
      rerenderToasts = null
    }
  }, [])

  const removeToast = (id: string) => {
    toasts.delete(id)
    forceUpdate()
  }

  return (
    <ToastContainer>
      {Array.from(toasts.entries()).map(([id, toast]) => (
        <Toast key={id} id={id} {...toast} onClose={() => removeToast(id)} />
      ))}
    </ToastContainer>
  )
}

export function toast(options: ToastOptions) {
  const id = `toast-${++toastCounter}`
  toasts.set(id, options)

  const { root } = getToastContainer()
  root.render(<ToastProvider />)

  return {
    id,
    dismiss: () => {
      toasts.delete(id)
      if (rerenderToasts) rerenderToasts()
    },
  }
}

export function useToast() {
  return { toast }
}
