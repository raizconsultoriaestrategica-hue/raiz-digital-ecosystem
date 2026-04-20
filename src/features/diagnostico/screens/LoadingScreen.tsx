export function LoadingScreen() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8">
      <div className="mb-5 h-16 w-16 animate-spin rounded-full border-[3px] border-border border-t-verde-raiz" />
      <h3 className="font-body text-xl font-semibold text-quase-preto">Gerando diagnóstico…</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-quase-preto/60">
        Cruzando os 7 pilares com a dor relatada e a meta para montar o plano recomendado.
      </p>
    </div>
  );
}
