# Angular AI Support System

This project is a 100% functional port of the React AI Support System to Angular. It preserves all behavior, UI/UX, logic, and API contracts.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Angular CLI (`npm install -g @angular/cli`)

## Installation

1. Navigate to the project directory:
   ```bash
   cd angular-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

To run the development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Building for Production

To build the project:

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

The project follows a feature-based modular architecture mirroring the React structure:

- `src/app/core`: Core services (Auth, AI, Supabase), guards, and layout components.
- `src/app/features`: Feature modules (Chat, Auth, Stubbed pages).
- `src/app/shared`: Shared UI components (Button, Input, Badge) and utilities.
- `src/environments`: Environment configuration (Supabase keys, API endpoints).

## React to Angular Migration Notes

- **Components**: React functional components converted to Angular components (`@Component`).
- **Hooks**:
  - `useState` -> Component properties.
  - `useEffect` -> `ngOnInit`, `ngOnDestroy` lifecycle methods.
  - `useContext` -> Angular Services with RxJS `BehaviorSubject`.
  - `useAIChat` -> `ChatService`.
- **Styling**: Tailwind CSS used identically. `clsx`/`tailwind-merge` utility implemented as `cn()`.
- **Routing**: `react-router-dom` -> Angular `RouterModule` with `AuthGuard`.
- **Icons**: `lucide-react` -> `lucide-angular`.
- **Toasts**: `sonner` -> `ngx-sonner`.
- **Animations**: `framer-motion` -> Angular Animations (`@angular/animations`).

## Verification

The application compiles successfully and implements the complete Chat flow with Supabase authentication and AI integration.
