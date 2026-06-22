import { useState } from "react";
import {
  useGetMyGuild, useCreateGuild, useJoinGuild, useLeaveGuild,
  type GuildDetail, type GuildMember as GuildMemberType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatGuildGrade } from "@/lib/ranks";
import { Users, Shield, Swords, Plus, LogIn, LogOut, Copy, Crown, Activity, ChevronRight } from "lucide-react";

const ACTIVITY_ICONS: Record<string, string> = {
  guild_created: "⚔️",
  member_join:   "🚪",
  member_leave:  "👋",
  workout:       "💪",
  level_up:      "⬆️",
  raid_clear:    "🐉",
  quest_complete:"📜",
};

const ROLE_STYLES: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  leader:  { label: "Leader",  color: "text-yellow-400",  icon: Crown },
  officer: { label: "Officer", color: "text-purple-400", icon: Shield },
  member:  { label: "Member",  color: "text-muted-foreground", icon: Users },
};

function MemberRow({ m }: { m: GuildMemberType }) {
  const r = ROLE_STYLES[m.role ?? "member"] ?? ROLE_STYLES.member;
  const Icon = r.icon;
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border/20 last:border-0">
      <div className="w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center text-sm font-bold text-primary">
        {(m.name ?? "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{m.name}</span>
          <span className={cn("text-[9px] font-mono uppercase", r.color)}>
            <Icon className="w-2.5 h-2.5 inline mr-0.5" />{r.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">Lv.{m.level} · {formatGuildGrade(m.rank)}</p>
      </div>
    </div>
  );
}

function GuildView({ guild, onLeave }: { guild: GuildDetail; onLeave: () => void }) {
  const [tab, setTab] = useState<"members" | "activity">("activity");
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(guild.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl">
              {guild.emblem}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif font-bold text-lg text-primary leading-tight truncate">{guild.name}</h2>
              {guild.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{guild.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                {guild.members?.length ?? 0}/{guild.maxMembers} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 bg-black/30 border border-border/30 rounded px-2 py-1.5 font-mono text-xs tracking-widest text-center text-muted-foreground">
              {guild.inviteCode}
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs border-border/50" onClick={copyCode}>
              <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              size="sm" variant="outline"
              className="h-8 gap-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={onLeave}
            >
              <LogOut className="w-3 h-3" /> Leave
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border/30">
        {(["activity", "members"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-xs font-mono uppercase tracking-wide transition-colors",
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
            )}
          >
            {t === "activity" ? <><Activity className="w-3 h-3 inline mr-1" />Activity</> : <><Users className="w-3 h-3 inline mr-1" />Members</>}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <Card className="border-border/30 bg-card/30">
          <CardContent className="p-3 divide-y divide-border/20">
            {(guild.members ?? []).map(m => <MemberRow key={m.id} m={m} />)}
          </CardContent>
        </Card>
      )}

      {tab === "activity" && (
        <div className="space-y-2">
          {(guild.activity ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No activity yet.</div>
          ) : (
            (guild.activity ?? []).map(a => (
              <div key={a.id} className="flex items-start gap-2.5 bg-card/30 border border-border/20 rounded p-2.5">
                <span className="text-base shrink-0 mt-0.5">{ACTIVITY_ICONS[a.activityType ?? ""] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-snug">{a.description}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                    {a.playerName} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CreateGuildForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emblem, setEmblem] = useState("⚔️");
  const create = useCreateGuild();
  const { toast } = useToast();

  const EMBLEMS = ["⚔️","🛡️","🐉","🌟","🔥","⚡","🌙","🗡️","🏔️","🦅","🐺","🌊"];

  const handleCreate = () => {
    if (!name.trim()) return;
    create.mutate({ data: { name: name.trim(), description: description.trim() || undefined, emblem } }, {
      onSuccess: () => {
        toast({ title: `Guild "${name}" Created!`, description: "Share your invite code with friends." });
        onSuccess();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Card className="border-border/30 bg-card/30">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-serif font-bold text-base">Found a Guild</h3>

        <div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1.5">Choose Emblem</p>
          <div className="flex flex-wrap gap-1.5">
            {EMBLEMS.map(e => (
              <button key={e} onClick={() => setEmblem(e)}
                className={cn("w-9 h-9 rounded-lg text-xl border transition-all", emblem === e ? "border-primary bg-primary/10" : "border-border/30 bg-black/20 hover:border-border")}
              >{e}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Guild Name</label>
          <Input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Iron Will Collective"
            className="bg-black/30 border-border/50 h-9 text-sm"
            maxLength={40}
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Description (optional)</label>
          <Input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What your guild is about..."
            className="bg-black/30 border-border/50 h-9 text-sm"
            maxLength={120}
          />
        </div>

        <Button className="w-full gap-2" onClick={handleCreate} disabled={!name.trim() || create.isPending}>
          <Plus className="w-4 h-4" /> Create Guild
        </Button>
      </CardContent>
    </Card>
  );
}

function JoinGuildForm({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const join = useJoinGuild();
  const { toast } = useToast();

  const handleJoin = () => {
    if (!code.trim()) return;
    join.mutate({ data: { inviteCode: code.trim().toUpperCase() } }, {
      onSuccess: (data) => {
        toast({ title: `Joined ${(data as any).guildName}!`, description: "Welcome to the guild." });
        onSuccess();
      },
      onError: (err: any) => toast({ title: "Invalid Code", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Card className="border-border/30 bg-card/30">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-serif font-bold text-base">Join a Guild</h3>
        <div>
          <label className="text-[10px] text-muted-foreground font-mono uppercase block mb-1">Invite Code</label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character code"
            className="bg-black/30 border-border/50 h-9 text-sm font-mono tracking-widest uppercase"
            maxLength={6}
          />
        </div>
        <Button className="w-full gap-2" variant="outline" onClick={handleJoin} disabled={code.length < 4 || join.isPending}>
          <LogIn className="w-4 h-4" /> Join Guild
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Guilds() {
  const { data: guild, isLoading } = useGetMyGuild();
  const leaveGuild = useLeaveGuild();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
    queryClient.invalidateQueries({ queryKey: ["/api/player"] });
  };

  const handleLeave = () => {
    leaveGuild.mutate(undefined, {
      onSuccess: (data) => {
        toast({ title: (data as any).guildDisbanded ? "Guild Disbanded" : "Left Guild" });
        invalidate();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Guild" />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : guild ? (
        <GuildView guild={guild} onLeave={handleLeave} />
      ) : (
        <div className="space-y-4">
          <div className="text-center py-6 border border-dashed border-border/30 rounded-xl">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm font-medium">You're not in a guild</p>
            <p className="text-xs text-muted-foreground mt-1">Found or join a guild to train together.</p>
          </div>
          <CreateGuildForm onSuccess={invalidate} />
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border/30" />
            <span className="mx-3 text-[10px] font-mono text-muted-foreground uppercase">or</span>
            <div className="flex-grow border-t border-border/30" />
          </div>
          <JoinGuildForm onSuccess={invalidate} />
        </div>
      )}
    </div>
  );
}
