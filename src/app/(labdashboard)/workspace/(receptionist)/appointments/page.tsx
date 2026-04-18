
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Plus, Check, X, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch appointments
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
  });

  // Update appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated');
    },
    onError: () => toast.error('Failed to update appointment'),
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      CONFIRMED: 'bg-green-100 text-green-700',
      IN_PROGRESS: 'bg-orange-100 text-orange-700',
      COMPLETED: 'bg-gray-100 text-gray-700',
      CANCELLED: 'bg-red-100 text-red-700',
      NO_SHOW: 'bg-yellow-100 text-yellow-700',
    };

    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage patient appointments</p>
        </div>
        <Link href="/receptionist/appointments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </Link>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Timeline */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Time Slots - {formatDate(new Date(selectedDate))}</CardTitle>
              <CardDescription>{data?.appointments?.length || 0} appointments scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const appointment = data?.appointments?.find((apt: any) => 
                    apt.appointmentTime === time
                  );

                  return (
                    <div
                      key={time}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        appointment ? 'bg-primary/5 border-primary' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{time}</span>
                      </div>

                      {appointment ? (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">{appointment.patient?.name}</p>
                            <p className="text-xs text-muted-foreground">{appointment.purpose}</p>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Available</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.appointments?.map((appointment: any) => (
                    <Card key={appointment.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {appointment.patient?.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{appointment.patient?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.patient?.phone}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(appointment.status)}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Time</p>
                              <p className="font-medium">{appointment.appointmentTime}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Purpose</p>
                              <p className="font-medium">{appointment.purpose}</p>
                            </div>
                          </div>

                          {appointment.notes && (
                            <div className="rounded-md bg-muted/50 p-2 text-sm">
                              <p className="text-muted-foreground">Notes:</p>
                              <p>{appointment.notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2 border-t">
                            {appointment.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({
                                  id: appointment.id,
                                  status: 'CONFIRMED'
                                })}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Confirm
                              </Button>
                            )}
                            {appointment.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({
                                  id: appointment.id,
                                  status: 'IN_PROGRESS'
                                })}
                              >
                                <User className="mr-1 h-3 w-3" />
                                Check In
                              </Button>
                            )}
                            {['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatusMutation.mutate({
                                  id: appointment.id,
                                  status: 'CANCELLED'
                                })}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {data?.appointments?.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      No appointments scheduled for this date
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
