import React, { useState } from "react";
import { useListBookmarks, useCreateBookmark, useDeleteBookmark } from "@workspace/api-client-react";
import { Plus, Search, ExternalLink, Trash2, Link as LinkIcon, FolderHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function LinksPage() {
  const { data: bookmarks, isLoading } = useListBookmarks();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLink, setNewLink] = useState({ title: "", url: "", description: "" });

  const filteredBookmarks = bookmarks?.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.url.toLowerCase().includes(search.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.url || !newLink.title) return;
    
    // add https if missing for valid url
    let safeUrl = newLink.url;
    if (!/^https?:\/\//i.test(safeUrl)) {
      safeUrl = 'https://' + safeUrl;
    }

    await createBookmark.mutateAsync({
      data: {
        title: newLink.title,
        url: safeUrl,
        description: newLink.description
      }
    });
    setIsAddOpen(false);
    setNewLink({ title: "", url: "", description: "" });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Collections */}
      <div className="w-64 border-r border-border/50 bg-card hidden lg:block p-4">
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Collections</h2>
        <div className="space-y-1">
          <Button variant="secondary" className="w-full justify-start rounded-xl bg-primary/10 text-primary hover:bg-primary/20">
            <FolderHeart className="w-4 h-4 mr-2" /> All Links
          </Button>
          {/* Real app would map collections here */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Link Vault</h1>
            <p className="text-muted-foreground mt-1">Your personal knowledge base</p>
          </div>
          
          <div className="flex w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search links..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-card border-border/50 shadow-sm"
              />
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg shadow-primary/20 whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" /> Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Save New Link</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input 
                      id="url" 
                      value={newLink.url} 
                      onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com" 
                      className="rounded-xl"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={newLink.title} 
                      onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Article Title"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input 
                      id="description" 
                      value={newLink.description} 
                      onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief note about this link"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={createBookmark.isPending} className="rounded-xl px-6">
                      {createBookmark.isPending ? "Saving..." : "Save Link"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredBookmarks?.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <LinkIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No links found</h3>
              <p className="text-muted-foreground mt-1">Try a different search or add a new link.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
              {filteredBookmarks?.map((bookmark) => (
                <Card key={bookmark.id} className="group rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/50 bg-card">
                  <CardContent className="p-0 flex flex-col h-full">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex-1 p-5 block relative">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4 text-primary" />
                      </div>
                      
                      <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center mb-4 text-primary">
                        {bookmark.favicon ? (
                          <img src={bookmark.favicon} alt="" className="w-5 h-5 rounded-sm" />
                        ) : (
                          <LinkIcon className="w-5 h-5" />
                        )}
                      </div>
                      
                      <h3 className="font-display font-bold text-base leading-tight mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                        {bookmark.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {bookmark.description || bookmark.url}
                      </p>
                      
                      <div className="mt-auto text-xs text-muted-foreground truncate opacity-70">
                        {new URL(bookmark.url).hostname}
                      </div>
                    </a>
                    
                    <div className="px-5 py-3 border-t border-border/30 bg-secondary/20 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        {/* Mock tags */}
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground font-medium">Resource</span>
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); deleteBookmark.mutate({ id: bookmark.id }); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Delete bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
