import React, { useState } from "react";
import { useListHabits, useCreateHabit, useDeleteHabit, useToggleHabitCompletion, useListHabitCompletions } from "@workspace/api-client-react";
import { Plus, Flame, CheckCircle2, Circle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const { data: habits, isLoading } = useListHabits();
  const { data: completions } = useListHabitCompletions();
  
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleCompletion = useToggleHabitCompletion();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", frequency: "daily" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.name) return;
    
    await createHabit.mutateAsync({
      data: {
        name: newHabit.name,
        frequency: newHabit.frequency,
        targetCount: 1
      }
    });
    setIsAddOpen(false);
    setNewHabit({ name: "", frequency: "daily" });
  };

  const handleToggle = (habitId: number, dateStr: string) => {
    toggleCompletion.mutate({
      data: {
        habitId,
        completedAt: dateStr
      }
    });
  };

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return {
      date: d,
      dateStr: format(d, "yyyy-MM-dd"),
      dayName: format(d, "EEE"),
      dayNum: format(d, "d")
    };
  }).reverse();

  const isCompleted = (habitId: number, dateStr: string) => {
    if (!completions) return false;
    return completions.some(c => c.habitId === habitId && c.completedAt.startsWith(dateStr));
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            Habit Chain <Activity className="w-8 h-8 text-primary" />
          </h1>
          <p className="text-muted-foreground mt-2">Build consistency, one day at a time.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create a Habit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Habit Name</Label>
                <Input 
                  id="name" 
                  value={newHabit.name} 
                  onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Read 30 pages" 
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createHabit.isPending} className="rounded-xl px-6">
                  {createHabit.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden">
        {/* Header Row for Dates */}
        <div className="flex mb-6 border-b border-border/50 pb-4">
          <div className="w-1/3 min-w-[150px]">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Habit</span>
          </div>
          <div className="w-2/3 flex justify-between pr-4">
            {last7Days.map((day, i) => (
              <div key={day.dateStr} className="flex flex-col items-center justify-center w-10">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider mb-1",
                  i === 6 ? "text-primary" : "text-muted-foreground"
                )}>{day.dayName}</span>
                <span className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  i === 6 ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>{day.dayNum}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Habit Rows */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : habits?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No habits tracked yet. Create one to get started!
            </div>
          ) : (
            habits?.map((habit) => (
              <div key={habit.id} className="flex items-center group bg-secondary/20 hover:bg-secondary/40 p-3 rounded-2xl transition-colors">
                <div className="w-1/3 min-w-[150px] pr-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground truncate">{habit.name}</h3>
                    {/* Placeholder for streak logic */}
                    <div className="hidden sm:flex items-center text-xs font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      <Flame className="w-3 h-3 mr-1" /> 3
                    </div>
                  </div>
                </div>
                
                <div className="w-2/3 flex justify-between pr-4 relative">
                  {/* Connecting line behind circles */}
                  <div className="absolute top-1/2 left-5 right-5 h-0.5 bg-border/40 -translate-y-1/2 z-0"></div>
                  
                  {last7Days.map((day) => {
                    const completed = isCompleted(habit.id, day.dateStr);
                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => handleToggle(habit.id, day.dateStr)}
                        disabled={toggleCompletion.isPending}
                        className="relative z-10 w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform focus:outline-none"
                      >
                        {completed ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-background">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors ring-4 ring-background">
                            <Circle className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
