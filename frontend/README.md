# GeoMeasure — Frontend Dashboard

A modern, responsive geospatial analytics dashboard for the **Geospatial File Measurement API**, built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Features

- **Ingestion & Measurement Zone**: Drag-and-drop file upload for `.kml` and `.zip` Shapefiles with progress indicators and format validation.
- **Dynamic Projected CRS Metrics**: Displays calculated Polygon areas ($m^2$) and LineString lengths ($m$/$km$) projected to local UTM zones, never showing misleading degree-based metrics.
- **Detailed Results Inspector**: Feature filter (All, Polygon, LineString, Point, Unsupported), expandable property drawer, status badges, and raw JSON response viewer with one-click copy.
- **Nullable & Error Clarity**: Distinguishes between points (`Measurement not required`), valid measurements, and unsupported geometries with em dashes (`—`) instead of misleading zeroes.
- **Live Health Monitoring**: Real-time ping latency check and status badge against the backend `GET /health` endpoint.
- **Interactive API Documentation**: Clean guide with copyable cURL snippets and a direct link to the live Swagger documentation.
- **Session History**: Clear session-based log of uploaded files with direct links to view measurements.

---

## 🛠 Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Testing**: Vitest

---

## ⚡ Local Development

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Default configuration points to the live Render backend:
   ```env
   VITE_API_BASE_URL=https://geospatial-measurement-api-hxpu.onrender.com
   ```
   *(To test against a local backend, change to `http://127.0.0.1:8000`)*.

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at: `http://localhost:5173`.

---

## 🧪 Testing & Production Build

- **Run Automated Tests**:
  ```bash
  npm test
  ```

- **Build for Production**:
  ```bash
  npm run build
  ```
  The production build will be output to `frontend/dist/`.

---

## 🌐 Deploy to Render as a Static Site

1. In Render Dashboard, click **New +** $\rightarrow$ **Static Site**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `geomeasure-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://geospatial-measurement-api-hxpu.onrender.com`
5. Under **Redirects / Rewrites**:
   - **Type**: Rewrite
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.
