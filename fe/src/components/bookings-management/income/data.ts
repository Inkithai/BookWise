import { Income } from "./types";

export function generateIncomes(): Income[] {
  const properties = ["Beach Villa", "Mountain Cabin", "City Apartment", "Lake House"];
  const users = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams"];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `INC-${i.toString().padStart(3, '0')}`,
    amount: 100 + (i * 23) % 900,
    recordedAt: new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000).toISOString(),
    property: properties[i % properties.length],
    description: `Income for ${properties[i % properties.length]} - ${i % 4 + 1} beds`,
    recordedBy: users[i % users.length],
    attachment: i % 3 === 0 ? `document_${i}.pdf` : null,
  }));
}