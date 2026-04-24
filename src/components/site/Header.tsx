import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { label: "Home", href: "/#topo" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Serviços", href: "/#servicos" },
];

export default function Header() {
  const { session, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = (user?.email ?? "R")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-off-white/85 backdrop-blur supports-[backdrop-filter]:bg-off-white/70">
      <div className="container-editorial flex h-16 items-center justify-between">
        <Link to="/" className="inline-block">
          <BrandLogo className="h-8" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-body text-sm text-quase-preto/80 transition-colors hover:text-verde-raiz"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-bege-terroso/60">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-verde-raiz text-linho text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-body text-sm text-quase-preto">{user?.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-body">
                  {role === "admin" ? "Consultor (admin)" : "Cliente"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(role === "admin" ? "/ferramentas" : "/dashboard")}>
                  Ir para minha área
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              className="bg-verde-raiz text-linho hover:bg-verde-musgo"
            >
              <Link to="/login">Área do Cliente</Link>
            </Button>
          )}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-verde-raiz">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-off-white">
            <div className="mt-8 flex flex-col gap-6">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-display text-2xl text-verde-raiz"
                >
                  {l.label}
                </a>
              ))}
              {session ? (
                <Button onClick={handleSignOut} variant="outline" className="border-verde-raiz text-verde-raiz">
                  Sair
                </Button>
              ) : (
                <Button asChild className="bg-verde-raiz text-linho hover:bg-verde-musgo">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Área do Cliente
                  </Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
