# ATS Influencer Outreach Dashboard

A high-performance, modern web application for managing influencer partnerships, discovery, and conversion pipelines. This is the standalone frontend repository built with React and Vite.

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Node.js** (v18+) installed.

### 2. Setup
Clone this repository and install the dependencies:
```bash
npm install
```

### 3. Development
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000` (or the port shown in your terminal).

## 🔌 Backend Connection
This frontend is configured to communicate with the ATS Backend running on `http://localhost:8081/api`.
- Ensure your backend is running for the dashboard to function correctly.
- You can change the API URL in `src/lib/api.ts` if needed.

## 🛠 Tech Stack
- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Routing**: [React Router](https://reactrouter.com/)

## 📂 Project Structure
- `/src/pages`: Main dashboard views (Meetings, Review Queue, Campaigns, etc.)
- `/src/components`: Reusable UI components (Modals, Cards, Layouts)
- `/src/lib`: API configuration and helper functions
- `/src/types`: TypeScript interfaces for consistent data handling

## 📦 Build for Production
To create an optimized production build:
```bash
npm run build
```
The output will be in the `/dist` folder.
