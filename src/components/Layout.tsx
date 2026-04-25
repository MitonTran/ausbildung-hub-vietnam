import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import FloatingRail from './FloatingRail';

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <FloatingRail />
      <Footer />
    </div>
  );
}
