import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientDocument {
  id: string; client_id: string; file_name: string; file_path: string;
  file_type: string | null; file_size: number | null; category: string | null;
  description: string | null; created_at: string;
}

interface Props { clientId: string; documents: ClientDocument[]; onChanged: () => void }

function formatSize(size?: number | null) {
  if (!size) return "—";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function ClientDocumentsPanel({ clientId, documents, onChanged }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Contrato");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadDocument() {
    if (!file) return;
    setUploading(true);
    const user = (await supabase.auth.getUser()).data.user;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${clientId}/${Date.now()}-${safeName}`;
    const storage = await supabase.storage.from("client-documents").upload(path, file, { upsert: false });
    if (storage.error) { setUploading(false); return toast.error(storage.error.message); }
    const { error } = await (supabase as any).from("client_documents").insert({
      client_id: clientId, file_name: file.name, file_path: path,
      file_type: file.type || null, file_size: file.size,
      category: category || "Documento", description: description || null,
      uploaded_by: user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    setFile(null); setCategory("Contrato"); setDescription("");
    toast.success("Documento anexado"); onChanged();
  }

  async function downloadDocument(doc: ClientDocument) {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(doc.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(doc: ClientDocument) {
    const row = await (supabase as any).from("client_documents").delete().eq("id", doc.id);
    if (row.error) return toast.error(row.error.message);
    await supabase.storage.from("client-documents").remove([doc.file_path]);
    toast.success("Documento excluído"); onChanged();
  }

  return (
    <Card className="p-4 sm:p-5 glass border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Documentos do cliente</h3>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">{documents.length}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2 mb-3">
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" className="text-sm" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do documento" className="text-sm" />
        <Button onClick={uploadDocument} disabled={!file || uploading} className="gradient-primary text-primary-foreground sm:w-auto w-full">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
          Anexar
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhum documento anexado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{doc.file_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {doc.category ?? "Documento"} · {formatSize(doc.file_size)} · {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
                {doc.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</div>}
              </div>
              <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => downloadDocument(doc)}><Download className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir documento?")) deleteDocument(doc); }}>
                  <Trash2 className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
