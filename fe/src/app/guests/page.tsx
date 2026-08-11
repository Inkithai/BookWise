
import { GuestHubTable } from "@/components/guests/GuestHubTable"
import Sidebar from '../../components/common/sidebar/Sidebar';
import { Footer } from '../../components/common/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Guests</h1>
            </div>
              <GuestHubTable />
           
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}