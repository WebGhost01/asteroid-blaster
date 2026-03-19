import React, { useState } from "react";
import { useListJobApplications, useCreateJobApplication, useUpdateJobApplication, useDeleteJobApplication } from "@workspace/api-client-react";
import { Plus, MoreVertical, MapPin, DollarSign, Building2, ExternalLink, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLUMNS = ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;

export default function JobsPage() {
  const { data: jobs, isLoading } = useListJobApplications();
  const createJob = useCreateJobApplication();
  const updateJob = useUpdateJobApplication();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newJob, setNewJob] = useState({ company: "", role: "", status: "Applied" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.company || !newJob.role) return;
    
    await createJob.mutateAsync({
      data: {
        company: newJob.company,
        role: newJob.role,
        status: newJob.status,
        appliedDate: new Date().toISOString()
      }
    });
    setIsAddOpen(false);
    setNewJob({ company: "", role: "", status: "Applied" });
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    updateJob.mutate({ id, data: { status: newStatus } });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Job Tracker</h1>
          <p className="text-muted-foreground mt-1">Manage your applications and interviews</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>New Job Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={newJob.company} 
                  onChange={(e) => setNewJob(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Acme Corp" 
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input 
                  id="role" 
                  value={newJob.role} 
                  onChange={(e) => setNewJob(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Frontend Engineer"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <select 
                  id="status"
                  value={newJob.status}
                  onChange={(e) => setNewJob(prev => ({ ...prev, status: e.target.value }))}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createJob.isPending} className="rounded-xl px-6">
                  {createJob.isPending ? "Adding..." : "Add Job"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max">
            {COLUMNS.map((column) => {
              const columnJobs = jobs?.filter((j) => j.status === column) || [];
              
              return (
                <div key={column} className="w-80 flex flex-col bg-secondary/30 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground/80">{column}</h3>
                    <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {columnJobs.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {columnJobs.map((job) => (
                      <Card key={job.id} className="rounded-xl border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-display font-bold text-base leading-tight line-clamp-1">{job.role}</h4>
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <Building2 className="w-3 h-3 mr-1" />
                                {job.company}
                              </div>
                            </div>
                            
                            <select 
                              className="text-xs border border-border rounded-md bg-secondary/50 text-foreground py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              value={job.status}
                              onChange={(e) => handleStatusChange(job.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                            >
                              {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          
                          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                            {job.location && (
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[80px]">{job.location}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <CalIcon className="w-3 h-3 mr-1" />
                              <span>{formatDate(job.appliedDate)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {columnJobs.length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl">
                        <p className="text-xs text-muted-foreground">No jobs</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
