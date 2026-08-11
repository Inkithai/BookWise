// src/app/page.tsx
import { redirect } from 'next/navigation';

// The marketing landing page is the entry point of the app.
export default function Home() {
  redirect('/landing');
}
