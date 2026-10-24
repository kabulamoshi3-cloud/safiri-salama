import React from 'react';
import { Outlet } from 'react-router-dom';
import OperatorSidebar from './OperatorSidebar';

export default function OperatorLayout() {
  return (
    <div className="flex">
      <OperatorSidebar />
      <main className="ml-64 flex-1 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
