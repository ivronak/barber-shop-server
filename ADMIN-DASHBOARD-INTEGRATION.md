# Admin Dashboard Integration Guide

This guide explains how to integrate the admin dashboard frontend with the new comprehensive dashboard API endpoint.

## Overview

The admin dashboard endpoint provides all necessary data for the dashboard in a single API call, eliminating the need for multiple requests. This improves performance and simplifies frontend code.

## API Endpoint

**URL**: `/api/dashboard/admin`

**Method**: `GET`

**Auth required**: Yes (Admin role)

**Query Parameters**:

| Parameter | Type   | Description                                           | Default  |
|-----------|--------|-------------------------------------------------------|----------|
| period    | string | Time period for data (daily, weekly, monthly, yearly) | 'weekly' |

## Frontend Integration Steps

### 1. Create API Service Module

Create a new service module for the dashboard API:

```typescript
// src/api/services/dashboardService.ts

import { get } from '../apiClient';

// Type definitions for dashboard data
export interface DashboardSummary {
  customerCount: number;
  appointmentCount: number;
  staffCount: number;
  serviceCount: number;
  totalRevenue: string;
  totalTips: string;
  totalDiscounts: string;
  avgTipPercentage: number;
  paidInvoices: number;
  pendingInvoices: number;
}

export interface AppointmentStat {
  date: string;
  count: number;
}

export interface RevenueStat {
  date: string;
  revenue: string;
  tips: string;
  discounts: string;
}

export interface TopService {
  service_id: string;
  service_name: string;
  bookings: number;
  revenue: string;
}

export interface TopStaff {
  staff_id: string;
  staff_name: string;
  appointments: number;
  revenue: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface AdminDashboardResponse {
  success: boolean;
  data: {
    appointmentStats: AppointmentStat[];
    revenueStats: RevenueStat[];
    summary: DashboardSummary;
    topServices: TopService[];
    topStaff: TopStaff[];
    upcomingAppointments: Appointment[];
    recentCustomers: Customer[];
    latestReviews: Review[];
    appointmentStatusDistribution: StatusDistribution[];
    recentActivity: ActivityLog[];
  };
}

// API function
export const getAdminDashboardData = async (
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly'
): Promise<AdminDashboardResponse> => {
  return get<AdminDashboardResponse>(`/dashboard/admin?period=${period}`);
};
```

### 2. Create Custom Hook

Create a custom hook to fetch the dashboard data:

```typescript
// src/hooks/useDashboard.ts

import { useState, useEffect } from 'react';
import { useApi } from './useApi';
import { getAdminDashboardData, AdminDashboardResponse } from '../api/services/dashboardService';

export const useDashboard = (period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly') => {
  const { data, loading, error, execute } = useApi(getAdminDashboardData);
  
  useEffect(() => {
    execute(period);
  }, [execute, period]);
  
  return {
    dashboardData: data?.data,
    isLoading: loading,
    error,
    refetch: () => execute(period)
  };
};
```

### 3. Implement in AdminDashboard Component

Use the hook in your AdminDashboard component:

```tsx
// src/pages/AdminDashboard.tsx

import { useState, useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

// Import your dashboard components
import DashboardSummary from '../components/dashboard/DashboardSummary';
import AppointmentChart from '../components/dashboard/AppointmentChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import TopServices from '../components/dashboard/TopServices';
import TopStaff from '../components/dashboard/TopStaff';
import UpcomingAppointments from '../components/dashboard/UpcomingAppointments';
import RecentCustomers from '../components/dashboard/RecentCustomers';
import LatestReviews from '../components/dashboard/LatestReviews';
import ActivityLog from '../components/dashboard/ActivityLog';

const AdminDashboard = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const { dashboardData, isLoading, error, refetch } = useDashboard(period);
  const { toast } = useToast();
  
  // Handle error
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: `Failed to load dashboard data: ${error.message}`,
        variant: 'destructive',
      });
    }
  }, [error, toast]);
  
  // Handle period change
  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setPeriod(newPeriod);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <select 
            value={period} 
            onChange={(e) => handlePeriodChange(e.target.value as any)}
            className="border rounded p-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button 
            onClick={() => refetch()} 
            className="bg-primary text-white px-4 py-2 rounded"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {dashboardData && (
        <>
          <DashboardSummary summary={dashboardData.summary} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <AppointmentChart data={dashboardData.appointmentStats} />
            <RevenueChart data={dashboardData.revenueStats} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <TopServices services={dashboardData.topServices} />
            <TopStaff staff={dashboardData.topStaff} />
          </div>
          
          <div className="mt-6">
            <UpcomingAppointments appointments={dashboardData.upcomingAppointments} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <RecentCustomers customers={dashboardData.recentCustomers} />
            <LatestReviews reviews={dashboardData.latestReviews} />
          </div>
          
          <div className="mt-6">
            <ActivityLog activities={dashboardData.recentActivity} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
```

### 4. Create Dashboard Components

Create the necessary components for displaying the dashboard data. Here's an example for the summary component:

```tsx
// src/components/dashboard/DashboardSummary.tsx

import { DashboardSummary as SummaryType } from '../../api/services/dashboardService';
import { Users, Calendar, Scissors, DollarSign } from 'lucide-react';

interface Props {
  summary: SummaryType;
}

const DashboardSummary = ({ summary }: Props) => {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(value));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="bg-blue-100 p-3 rounded-full">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm">Customers</p>
            <p className="text-2xl font-semibold">{summary.customerCount}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="bg-green-100 p-3 rounded-full">
            <Calendar className="h-6 w-6 text-green-500" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm">Appointments</p>
            <p className="text-2xl font-semibold">{summary.appointmentCount}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="bg-purple-100 p-3 rounded-full">
            <Scissors className="h-6 w-6 text-purple-500" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm">Services</p>
            <p className="text-2xl font-semibold">{summary.serviceCount}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="bg-yellow-100 p-3 rounded-full">
            <DollarSign className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="ml-4">
            <p className="text-gray-500 text-sm">Revenue</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalRevenue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;
```

## Benefits of Using the Comprehensive Endpoint

1. **Reduced API Calls**: Single request instead of multiple calls
2. **Improved Performance**: Faster page load and less network overhead
3. **Simplified State Management**: All data is fetched and updated together
4. **Consistent Data**: All dashboard data is from the same point in time
5. **Less Error Handling**: Only need to handle errors for one request

## Error Handling

Always implement proper error handling for API requests:

```typescript
useEffect(() => {
  if (error) {
    toast({
      title: 'Error',
      description: `Failed to load dashboard data: ${error.message}`,
      variant: 'destructive',
    });
  }
}, [error, toast]);
```

## Loading States

Show appropriate loading states while data is being fetched:

```tsx
if (isLoading) {
  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

## Data Refresh

Implement a refresh mechanism to update dashboard data:

```tsx
<button 
  onClick={() => refetch()} 
  className="bg-primary text-white px-4 py-2 rounded"
>
  Refresh
</button>
```

## Conclusion

By using the comprehensive admin dashboard endpoint, you can significantly simplify your frontend code while improving performance. The single API call provides all the necessary data for rendering the dashboard components, eliminating the need for multiple separate requests. 