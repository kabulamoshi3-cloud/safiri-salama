# Safiri Haraka Public Website

The public-facing website for Safiri Haraka, Tanzania's smart ride-hailing platform.

## Description

This is a modern, responsive React website built with TypeScript, Vite, and Tailwind CSS. It provides information about Safiri Haraka services, allows users to view live traffic data, register as drivers or passengers, and access help and safety resources.

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3002`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

- `VITE_API_URL` - The base URL for the Safiri Haraka API (default: `https://simon-daladala-api.vercel.app/api/v1`)

Example:
```
VITE_API_URL=https://simon-daladala-api.vercel.app/api/v1
```

## Available Pages

- **Home (/)** - Landing page with hero section, benefits, testimonials, and statistics
- **Services (/services)** - Information about ride types (Car, Bajaji, Boda Boda) and booking process
- **Traffic (/traffic)** - Live traffic insights with real-time road segment data
- **Become a Driver (/become-a-driver)** - Driver recruitment page with earnings calculator and FAQ
- **About (/about)** - Company mission, vision, story, and values
- **Help (/help)** - Help center with FAQ sections for passengers, drivers, safety, and payments
- **Login (/login)** - User authentication for passengers and drivers
- **Register (/register)** - User registration with role selection and vehicle details for drivers

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **React Icons** - Icon library

## Features

- Fully responsive design (mobile-first)
- Role-based authentication (passenger/driver)
- Real-time traffic data integration
- Interactive earnings calculator for drivers
- Collapsible FAQ sections
- Mobile menu with hamburger navigation
- Accessible form inputs with validation
- JWT token-based authentication

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Footer.tsx
│   ├── Input.tsx
│   └── Navbar.tsx
├── pages/           # Page components
│   ├── AboutPage.tsx
│   ├── BecomeDriverPage.tsx
│   ├── HelpPage.tsx
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ServicesPage.tsx
│   └── TrafficPage.tsx
├── services/        # API service layer
│   ├── api.ts
│   └── auth.ts
├── App.tsx          # Root component with routing
├── main.tsx         # Application entry point
└── index.css        # Global styles
```

## Color Scheme

- **Primary**: `#2196F3` (Blue) - Main brand color
- **Secondary**: `#FFC107` (Amber/Yellow) - Accent color

## License

Copyright © 2024 Safiri Haraka. All rights reserved.
