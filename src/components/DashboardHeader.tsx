
import React from 'react';
import { Card } from "@/components/ui/card";
import LogoutButton from "./LogoutButton";

interface DashboardHeaderProps {
  title: string;
  description?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, description }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <Card className="p-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#012970] mb-2">{title}</h1>
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
          {user.name && (
            <p className="text-sm text-gray-500 mt-2">
              Welcome back, <span className="font-semibold">{user.name}</span>
            </p>
          )}
        </div>
        <LogoutButton />
      </div>
    </Card>
  );
};

export default DashboardHeader;
