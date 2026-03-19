import React, { useState } from "react";
import { useListEvents, useCreateEvent, useDeleteEvent } from "@workspace/api-client-react";
import { Plus, Calendar as CalIcon, MapPin, Clock, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";

export default function EventsPage() {
  const { data: events, isLoading } = useListEvents();
  const createEvent = useCreateEvent();
  const deleteEvent = useDeleteEvent();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    time: "12:00",
    location: "",
    description: ""
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    
    await createEvent.mutateAsync({
      data: {
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time,
        location: newEvent.location,
        description: newEvent.description,
        type: "general"
      }
    });
    setIsAddOpen(false);
    setNewEvent({ title: "", date: format(new Date(), 'yyyy-MM-dd'), time: "12:00", location: "", description: "" });
  };

  // Sort events by date
  const sortedEvents = events ? [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Event Board</h1>
          <p className="text-muted-foreground mt-1">Plan and manage your schedule</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Schedule an Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input 
                  id="title" 
                  value={newEvent.title} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Q3 Planning Meeting" 
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={newEvent.date} 
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input 
                    id="time" 
                    type="time"
                    value={newEvent.time} 
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location / Link</Label>
                <Input 
                  id="location" 
                  value={newEvent.location} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Conference Room A or Zoom link" 
                  className="rounded-xl"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createEvent.isPending} className="rounded-xl px-6">
                  {createEvent.isPending ? "Creating..." : "Save Event"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
         <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      ) : sortedEvents.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border/50 rounded-3xl">
          <CalIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No upcoming events</h3>
          <p className="text-muted-foreground mt-2">Your calendar is clear. Time to relax or plan something new!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEvents.map((event) => {
            const eventDate = parseISO(event.date);
            const isPast = eventDate < new Date(new Date().setHours(0,0,0,0));
            
            return (
              <Card key={event.id} className={cn(
                "overflow-hidden rounded-2xl transition-all duration-300 border-border/50 group",
                isPast ? "opacity-60 bg-muted/30" : "bg-card hover:shadow-xl hover:-translate-y-1"
              )}>
                <div className={cn(
                  "h-2 w-full",
                  isPast ? "bg-muted" : "bg-gradient-to-r from-primary to-accent"
                )} />
                <CardContent className="p-6 relative">
                  <button 
                    onClick={() => deleteEvent.mutate({ id: event.id })}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex flex-col items-center justify-center bg-secondary w-14 h-14 rounded-xl border border-border/50 text-center shadow-sm">
                      <span className="text-xs font-bold uppercase text-primary leading-none">{format(eventDate, 'MMM')}</span>
                      <span className="text-xl font-display font-bold text-foreground leading-none mt-1">{format(eventDate, 'dd')}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight line-clamp-2">{event.title}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.time || "All Day"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-6 pt-4 border-t border-border/30 text-sm">
                    {event.location && (
                      <div className="flex items-start text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-foreground/50 shrink-0" />
                        <span className="line-clamp-2">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-2 text-foreground/50 shrink-0" />
                        <span>0 RSVPs</span>
                      </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
