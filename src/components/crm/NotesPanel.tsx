import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Loader2, Send, Trash2, User } from "lucide-react";
import { initials } from "@/lib/format";

interface Note {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  profiles?: { name?: string | null } | null;
}

interface Props {
  notes: Note[];
  clientId: string;
  onAdded: () => void;
}

export function NotesPanel({ notes, clientId, onAdded }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!content.trim()) return;
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("notes").insert({
      content: content.trim(),
      user_id: user?.id,
      client_id: clientId,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    setContent("");
    toast.success("Nota adicionada");
    onAdded();
  }

  async function remove(note: Note) {
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) return toast.error(error.message);
    toast.success("Nota excluída");
    onAdded();
  }

  return (
    <Card className="p-5 glass border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Anotações</h3>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">{notes.length}</span>
      </div>

      <div className="space-y-2 mb-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva uma anotação sobre o cliente, contexto, próximos passos..."
          rows={3}
          className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        <div className="flex justify-end">
          <Button onClick={add} disabled={!content.trim() || saving} size="sm" className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma anotação ainda.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                {n.profiles?.name ? initials(n.profiles.name) : <User className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-1.5">
                  <span>{n.profiles?.name ?? "—"} · {format(new Date(n.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Excluir nota?")) remove(n); }}>
                    <Trash2 className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
