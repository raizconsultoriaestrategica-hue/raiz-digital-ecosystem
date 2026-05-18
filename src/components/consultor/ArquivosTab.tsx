import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
  Image as ImageIcon,
  Video,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  useArquivosCliente,
  useUploadArquivo,
  useDeleteArquivo,
  gerarSignedUrl,
  type ArquivoCliente,
} from "@/hooks/useArquivosCliente";

const CATEGORIAS: { value: ArquivoCliente["categoria"]; label: string }[] = [
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "proposta", label: "Proposta" },
  { value: "ata", label: "Ata" },
  { value: "material_modulo", label: "Material de módulo" },
  { value: "relatorio", label: "Relatório" },
  { value: "outros", label: "Outros" },
];

function categoriaLabel(c: string): string {
  return CATEGORIAS.find((x) => x.value === c)?.label ?? c;
}

function fmtBytes(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function iconeArquivo(tipo: string | null) {
  switch (tipo) {
    case "pdf":
      return FileText;
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
      return ImageIcon;
    case "mp4":
    case "mov":
    case "webm":
      return Video;
    default:
      return File;
  }
}

export default function ArquivosTab({ clienteId }: { clienteId: string }) {
  const { data: arquivos = [], isLoading, error } = useArquivosCliente(clienteId);
  const uploadMut = useUploadArquivo(clienteId);
  const deleteMut = useDeleteArquivo(clienteId);

  const { data: modulos = [] } = useQuery({
    queryKey: ["modulos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos")
        .select("id, codigo, nome, pilar_nome")
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<ArquivoCliente["categoria"]>("outros");
  const [moduloId, setModuloId] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");

  const handleSelectFile = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (categoria === "material_modulo" && !moduloId) {
      toast.error("Selecione o módulo antes de enviar um material de módulo");
      return;
    }

    try {
      await uploadMut.mutateAsync({
        file,
        categoria,
        modulo_id: categoria === "material_modulo" ? moduloId : null,
      });
      toast.success(`${file.name} enviado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    }
  };

  const handleDownload = async (a: ArquivoCliente) => {
    const url = await gerarSignedUrl(a.storage_path);
    if (!url) {
      toast.error("Não foi possível gerar link de download");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (a: ArquivoCliente) => {
    if (!confirm(`Excluir "${a.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteMut.mutateAsync({ id: a.id, storage_path: a.storage_path });
      toast.success("Arquivo excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir");
    }
  };

  const arquivosFiltrados =
    filtroCategoria === "todos"
      ? arquivos
      : arquivos.filter((a) => a.categoria === filtroCategoria);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">
          Erro ao carregar arquivos: {error instanceof Error ? error.message : "desconhecido"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
            Enviar arquivo
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => {
                  setCategoria(v as ArquivoCliente["categoria"]);
                  if (v !== "material_modulo") setModuloId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {categoria === "material_modulo" && (
              <div>
                <Label>Módulo</Label>
                <Select value={moduloId ?? ""} onValueChange={setModuloId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {modulos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.codigo} · {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadMut.isPending}
            />
            <Button
              onClick={handleSelectFile}
              disabled={uploadMut.isPending}
              className="bg-verde-raiz hover:bg-verde-raiz/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMut.isPending ? "Enviando..." : "Escolher arquivo"}
            </Button>
            <span className="text-xs text-quase-preto/55">
              Limite recomendado: 25 MB por arquivo.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-quase-preto/60">
          {arquivosFiltrados.length} de {arquivos.length}{" "}
          {arquivos.length === 1 ? "arquivo" : "arquivos"}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-quase-preto/60">Filtrar:</Label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {arquivosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-quase-preto/60">
            <FolderOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
            {arquivos.length === 0
              ? "Nenhum arquivo enviado ainda."
              : "Nenhum arquivo nessa categoria."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {arquivosFiltrados.map((a) => {
              const Icon = iconeArquivo(a.tipo);
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-verde-raiz" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-quase-preto/85">
                      {a.nome}
                    </div>
                    <div className="text-xs text-quase-preto/55">
                      {categoriaLabel(a.categoria)} · {fmtData(a.created_at)}
                      {a.tamanho_bytes ? ` · ${fmtBytes(a.tamanho_bytes)}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(a)}
                    className="border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(a)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
