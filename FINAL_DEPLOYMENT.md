# Guía de Despliegue Final: Sistema MeGAs (MTEPS/AFCOOP)

Este documento detalla los pasos para realizar un despliegue limpio y profesional del sistema en un servidor de producción o intranet.

## 1. Preparación del Entorno
Antes de iniciar, asegúrese de que no haya procesos locales ocupando los puertos **80** (Web), **3000** (API) o **5435** (Base de Datos).

> [!IMPORTANT]
> Si tiene el backend ejecutándose en una terminal (fuera de Docker), deténgalo con `Ctrl + C` antes de proceder.

## 2. Limpieza de Contenedores Previos
Para asegurar una instalación limpia sin conflictos de versiones antiguas:

```bash
docker-compose down --remove-orphans
```

## 3. Despliegue con Docker Compose
Ejecute el siguiente comando para construir las imágenes de producción y levantar los servicios en segundo plano (`detached mode`):

```bash
docker-compose up --build -d
```

### ¿Qué hace este comando?
*   **DB:** Levanta PostgreSQL 15 en el puerto interno 5432 (mapeado al **5435** para acceso externo).
*   **Backend:** Instala dependencias y arranca el servidor Node.js en el puerto **3000**. Mantiene el reinicio automático si el servidor falla.
*   **Frontend:** Realiza un **Build de producción** optimizado (minificado) y lo sirve a través de **Nginx** en el puerto **80**.

## 4. Verificación de Acceso
Una vez levantado, el sistema será accesible desde cualquier computadora en la red intranet a través de la dirección IP del servidor:

*   **URL Principal:** `http://[IP-DEL-SERVIDOR]`
*   **API y Base de Datos:** Los servicios estarán conectados internamente a través de la red de Docker.

## 5. Mantenimiento y Logs
Para monitorear el estado de los servicios o revisar errores en tiempo real:

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend
```

---

> [!TIP]
> **Seguridad:** Para despliegues en servidores externos con internet, se recomienda habilitar HTTPS mediante un certificado SSL (Certbot) en el servidor Nginx.

---
**Kallpatech Solutions** | Sucre, Bolivia - 2026
