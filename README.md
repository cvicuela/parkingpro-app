# ParkingPro App

React + Vite + Tailwind frontend for the ParkingPro parking management system.

## Features

- **Dashboard**: Real-time occupancy, KPIs, revenue charts
- **Control de Acceso**: Plate validation, entry/exit registration, live session tracking
- **Clientes**: CRUD for customers (personal and corporate)
- **Vehiculos**: Vehicle registry linked to customers
- **Planes**: View and manage parking plans (Diurno, Nocturno, 24h, Por Hora)
- **Suscripciones**: Subscription management with suspend/reactivate
- **Pagos**: Payment history with provider support (Cash, CardNet, Stripe)
- **Reportes**: Financial reports, occupancy analytics, overdue accounts
- **Configuracion**: System settings management
- **Offline Support**: IndexedDB queue for offline operations, service worker caching
- **Real-time**: Socket.IO + polling for live occupancy updates

## Setup

```bash
# Install dependencies
npm install

# Configure backend URL
cp .env.example .env
# Edit VITE_API_URL to point to your backend

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS 4
- React Router 7
- Axios for HTTP
- Socket.IO Client for real-time
- Lucide React for icons
- React Toastify for notifications

## Project Structure

```
src/
  components/   - Reusable UI components (Sidebar, Header)
  pages/        - Page components (Dashboard, Clientes, etc.)
  services/     - API client, socket, offline queue
  context/      - Auth context provider
  hooks/        - Custom React hooks
```

## Deployment

Build the project and serve the `dist/` folder from any static host, or copy it into the backend's `public/` directory for unified deployment.

```bash
npm run build
cp -r dist/* ../parkingpro-backend/public/
```
