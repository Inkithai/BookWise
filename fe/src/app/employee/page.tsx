import  {EmployeeTable}  from "@/components/employee/EmployeeTable"
import Sidebar from '../../components/common/sidebar/Sidebar';
import { Footer } from '../../components/common/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4 sm:p-6">
            <EmployeeTable />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}