import React, { useState } from "react";
import { useListDecks, useCreateDeck, useDeleteDeck } from "@workspace/api-client-react";
import { Plus, BookOpen, Layers, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FlashcardsPage() {
  const { data: decks, isLoading } = useListDecks();
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", description: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeck.name) return;
    
    await createDeck.mutateAsync({
      data: {
        name: newDeck.name,
        description: newDeck.description
      }
    });
    setIsAddOpen(false);
    setNewDeck({ name: "", description: "" });
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Study Decks</h1>
          <p className="text-muted-foreground mt-1">Master knowledge with spaced repetition</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Deck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Study Deck</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Deck Name</Label>
                <Input 
                  id="name" 
                  value={newDeck.name} 
                  onChange={(e) => setNewDeck(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. React Interview Prep" 
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={newDeck.description} 
                  onChange={(e) => setNewDeck(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will you learn?" 
                  className="rounded-xl"
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={createDeck.isPending} className="rounded-xl px-6">
                  {createDeck.isPending ? "Creating..." : "Create Deck"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
         <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      ) : decks?.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border/50 rounded-3xl">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No decks yet</h3>
          <p className="text-muted-foreground mt-2">Create your first deck and start adding flashcards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {decks?.map((deck) => (
            <Card key={deck.id} className="group overflow-hidden rounded-2xl border-border/50 bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                
                <h3 className="font-display font-bold text-lg mb-2">{deck.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-6">
                  {deck.description || "No description provided."}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-sm font-medium text-muted-foreground">
                     Cards
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-8 px-3">
                      Edit <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" className="rounded-lg h-8 px-3 gap-1 shadow-md shadow-primary/20">
                      <PlayCircle className="w-3 h-3" /> Study
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
