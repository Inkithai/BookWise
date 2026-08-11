'use client';

import { useState } from 'react';
import { CancellationTable } from './CancellationTable';
import { cancellationData,CancellationRequest } from './data';

export default function BookingCancellationPage() {
  const [cancellations, setCancellations] = useState(cancellationData);

  const handleDelete = (cancellationRef: string) => {
    setCancellations(cancellations.filter(item => item.cancellationRef !== cancellationRef));
  };

  const handleUpdate = (updatedCancellation: CancellationRequest) => {
    setCancellations(cancellations.map(item => 
      item.cancellationRef === updatedCancellation.cancellationRef 
        ? updatedCancellation 
        : item
    ));
  };

  return (
    <div className="container mx-auto">
      <CancellationTable 
        cancellations={cancellations} 
        onDelete={handleDelete} 
        onUpdate={handleUpdate} 
      />
    </div>
  );
}