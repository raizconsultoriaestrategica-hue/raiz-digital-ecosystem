import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] erro de render capturado:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-off-white px-4">
        <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-8 shadow-soft">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <h1 className="font-display text-xl text-verde-raiz">Algo deu errado</h1>
          </div>
          <p className="text-sm text-quase-preto/70">
            A página encontrou um erro inesperado. Você pode tentar novamente ou recarregar a página.
          </p>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs text-quase-preto/80">
            {this.state.error.message || String(this.state.error)}
          </pre>
          <div className="flex gap-2">
            <Button onClick={this.reset} variant="outline" className="flex-1">
              Tentar novamente
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 bg-verde-raiz text-linho hover:bg-verde-raiz/90"
            >
              Recarregar página
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
