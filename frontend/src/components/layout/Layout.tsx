import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          PixelSprite Editor &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
