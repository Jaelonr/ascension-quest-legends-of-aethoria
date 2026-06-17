import { useState } from "react";
import { useGetEquipment, useUpdateEquipment, useAddEquipment } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  rack: "Rack",
  machine: "Machine",
  barbell: "Barbell",
  free_weights: "Free Weights",
  striking: "Striking",
  mat: "Mat / Grappling",
  bench: "Bench",
  cable: "Cable",
  cardio: "Cardio",
  bands: "Bands",
  other: "Other",
};

const CATEGORY_OPTIONS = [
  "barbell", "free_weights", "rack", "machine", "bench", "cable",
  "striking", "mat", "cardio", "bands", "other",
];

const defaultForm = () => ({ name: "", category: "other" });

export default function Equipment() {
  const { data: equipment, isLoading } = useGetEquipment();
  const updateEquipment = useUpdateEquipment();
  const addEquipment = useAddEquipment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [toggling, setToggling] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });

  const handleToggle = (id: number, currentlyAvailable: boolean) => {
    setToggling(id);
    updateEquipment.mutate(
      { id, data: { available: !currentlyAvailable } as any },
      {
        onSuccess: () => { invalidate(); setToggling(null); },
        onError: () => { toast({ title: "Failed to update", variant: "destructive" }); setToggling(null); },
      }
    );
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ title: "Enter an equipment name", variant: "destructive" });
      return;
    }
    addEquipment.mutate(
      { data: { name: form.name.trim(), category: form.category, available: true, owned: true } as any },
      {
        onSuccess: () => {
          setForm(defaultForm());
          setShowAdd(false);
          invalidate();
          toast({ title: `${form.name} added to armory!` });
        },
        onError: () => toast({ title: "Failed to add equipment", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Armory" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const available = equipment?.filter(e => e.available) ?? [];
  const unavailable = equipment?.filter(e => !e.available) ?? [];

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Armory" subtitle="Manage your available weapons" />

      {/* Add Equipment toggle */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-sm text-primary flex-1 text-left">Add Equipment</span>
        {showAdd
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Add form */}
      {showAdd && (
        <Card className="border-primary/30 bg-card/50 animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-serif">New Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Name</div>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kettlebell, Pull-up Bar..."
                className="bg-black/30 border-border/50 h-9 text-sm"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Category</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                      form.category === cat
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleAdd} disabled={addEquipment.isPending}>
              {addEquipment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Armory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available */}
      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-green-400 mb-2 px-1">
          Equipped ({available.length})
        </h3>
        <div className="space-y-2">
          {available.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border/30 rounded-xl">
              No equipment equipped
            </p>
          )}
          {available.map(item => (
            <Card key={item.id} className="border-green-900/40 bg-card/50">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{item.name}</h3>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(item.id, true)}
                  disabled={toggling === item.id}
                  className="flex items-center gap-1.5 text-xs text-green-400 border border-green-900/50 bg-green-900/20 px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/40 transition-all group"
                >
                  {toggling === item.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <>
                        <Check className="w-3 h-3 group-hover:hidden" />
                        <X className="w-3 h-3 hidden group-hover:block" />
                      </>}
                  <span className="group-hover:hidden">Equipped</span>
                  <span className="hidden group-hover:inline">Remove</span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Unavailable */}
      {unavailable.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Not Available ({unavailable.length})
          </h3>
          <div className="space-y-2">
            {unavailable.map(item => (
              <Card key={item.id} className="border-border/30 bg-black/30 opacity-60">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-muted-foreground">{item.name}</h3>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground/60">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(item.id, false)}
                    disabled={toggling === item.id}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 px-2.5 py-1.5 rounded-lg hover:text-green-400 hover:border-green-900/40 hover:bg-green-900/10 transition-all"
                  >
                    {toggling === item.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />}
                    Equip
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
