import { Injectable, Renderer2, RendererFactory2 } from "@angular/core"

@Injectable({
    providedIn: "root",
})
export class NotificationService {
    private notificationTimeout = 5000 // 5 segundos por defecto
    private renderer: Renderer2

    constructor(rendererFactory: RendererFactory2) {
        // Usar Renderer2 para manipular el DOM de forma segura en Angular
        this.renderer = rendererFactory.createRenderer(null, null)
    }

    /**
     * Muestra una notificación de éxito
     */
    showSuccess(message: string, timeout: number = this.notificationTimeout): void {
        this.showNotification(message, "success", timeout)
    }

    /**
     * Muestra una notificación de error
     */
    showError(message: string, timeout: number = this.notificationTimeout): void {
        this.showNotification(message, "error", timeout)
    }

    /**
     * Muestra una notificación informativa
     */
    showInfo(message: string, timeout: number = this.notificationTimeout): void {
        this.showNotification(message, "info", timeout)
    }

    /**
     * Método principal para mostrar notificaciones
     */
    private showNotification(message: string, type: "success" | "error" | "info", timeout: number): void {
        // Asegurarse de que el contenedor existe, si no, crearlo
        let container = document.getElementById("notification-container")
        if (!container) {
            container = this.renderer.createElement("div")
            this.renderer.setAttribute(container, "id", "notification-container")
            this.renderer.addClass(container, "fixed")
            this.renderer.addClass(container, "top-4")
            this.renderer.addClass(container, "right-4")
            this.renderer.addClass(container, "z-50")
            this.renderer.addClass(container, "flex")
            this.renderer.addClass(container, "flex-col")
            this.renderer.addClass(container, "items-end")
            this.renderer.addClass(container, "space-y-2")
            this.renderer.appendChild(document.body, container)
        }

        // Crear el elemento de notificación
        const notification = this.renderer.createElement("div")
        this.renderer.addClass(notification, "notification")
        this.renderer.addClass(notification, `notification-${type}`)

        // Aplicar estilos directamente
        this.renderer.setStyle(notification, "padding", "12px 16px")
        this.renderer.setStyle(notification, "border-radius", "8px")
        this.renderer.setStyle(notification, "margin-bottom", "10px")
        this.renderer.setStyle(notification, "box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
        this.renderer.setStyle(notification, "display", "flex")
        this.renderer.setStyle(notification, "align-items", "center")
        this.renderer.setStyle(notification, "max-width", "300px")
        this.renderer.setStyle(notification, "animation", "slide-in 0.3s forwards")
        this.renderer.setStyle(notification, "transform", "translateX(100%)")
        this.renderer.setStyle(notification, "opacity", "0")

        // Crear animación de entrada
        const keyframes = `
            @keyframes slide-in {
                0% {
                    transform: translateX(100%);
                    opacity: 0;
                }
                100% {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slide-out {
                0% {
                    transform: translateX(0);
                    opacity: 1;
                }
                100% {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `

        // Agregar estilos al documento
        const style = document.createElement("style")
        style.innerHTML = keyframes
        document.head.appendChild(style)

        // Aplicar colores según el tipo
        switch (type) {
            case "success":
                this.renderer.setStyle(notification, "background-color", "#10b981")
                this.renderer.setStyle(notification, "color", "white")
                break
            case "error":
                this.renderer.setStyle(notification, "background-color", "#ef4444")
                this.renderer.setStyle(notification, "color", "white")
                break
            case "info":
                this.renderer.setStyle(notification, "background-color", "#3b82f6")
                this.renderer.setStyle(notification, "color", "white")
                break
        }

        // Icono según el tipo
        let icon = ""
        switch (type) {
            case "success":
                icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>`
                break
            case "error":
                icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>`
                break
            case "info":
                icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`
                break
        }

        // Crear los elementos internos
        const iconDiv = this.renderer.createElement("div")
        this.renderer.addClass(iconDiv, "notification-icon")
        this.renderer.setStyle(iconDiv, "margin-right", "12px")
        iconDiv.innerHTML = icon

        const messageDiv = this.renderer.createElement("div")
        this.renderer.addClass(messageDiv, "notification-message")
        this.renderer.setStyle(messageDiv, "flex", "1")
        messageDiv.textContent = message

        const closeDiv = this.renderer.createElement("div")
        this.renderer.addClass(closeDiv, "notification-close")
        this.renderer.setStyle(closeDiv, "cursor", "pointer")
        this.renderer.setStyle(closeDiv, "opacity", "0.7")
        this.renderer.setStyle(closeDiv, "margin-left", "12px")
        closeDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `

        // Añadir los elementos al contenedor
        this.renderer.appendChild(notification, iconDiv)
        this.renderer.appendChild(notification, messageDiv)
        this.renderer.appendChild(notification, closeDiv)
        this.renderer.appendChild(container, notification)

        // Aplicar animación de entrada
        this.renderer.setStyle(notification, "animation", "slide-in 0.3s forwards")

        // Configurar el botón de cierre
        closeDiv.addEventListener("click", () => {
            this.closeNotification(notification)
        })

        // Auto-cerrar después del timeout
        setTimeout(() => {
            if (notification.parentNode === container) {
                this.closeNotification(notification)
            }
        }, timeout)
    }

    /**
     * Cierra una notificación con animación
     */
    private closeNotification(notification: HTMLElement): void {
        this.renderer.setStyle(notification, "animation", "slide-out 0.3s forwards")

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification)
            }
        }, 300) // Duración de la animación
    }
}
