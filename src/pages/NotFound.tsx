import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Rota inexistente acessada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white px-6 py-20">
      <div className="text-center max-w-lg">
        <div className="font-display text-7xl text-verde-raiz md:text-9xl">404</div>
        <h1 className="mt-4 font-display text-3xl text-verde-raiz md:text-4xl">
          Página não encontrada
        </h1>
        <p className="mt-4 font-body font-light text-base leading-relaxed text-quase-preto/70">
          A página que você procura não existe ou foi movida. Volte para a home ou fale com a gente pelo WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-verde-raiz text-linho hover:bg-verde-musgo">
            <Link to="/">Voltar para o início</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5"
          >
            <a
              href="https://wa.me/5544999993334?text=Vim%20pelo%20site%20da%20Raiz%20e%20quero%20conversar"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
