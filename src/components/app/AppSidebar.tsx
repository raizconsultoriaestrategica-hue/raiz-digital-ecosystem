import {
  LayoutDashboard,
  Wrench,
  Stethoscope,
  Calculator,
  Folder,
  LogOut,
  BookOpen,
  Users,
  UserPlus,
  DollarSign,
  PieChart,
  FileText,
  CreditCard,
  Receipt,
  TrendingUp,
  Sparkles,
  ChevronDown,
  HeartPulse,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/brand/BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

interface SubItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}
interface Group {
  title: string;
  icon: typeof LayoutDashboard;
  items: SubItem[];
}

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const dashboardLabel = role === "admin" ? "Gestão de Clientes" : "Dashboard";

  const adminGroups: Group[] = [
    {
      title: "Clientes",
      icon: Users,
      items: [
        { title: "Gestão de Clientes", url: "/dashboard", icon: Users, end: true },
        { title: "Novo Cliente", url: "/dashboard?novo=1", icon: UserPlus },
      ],
    },
    {
      title: "Ferramentas",
      icon: Wrench,
      items: [
        { title: "Diagnóstico 360°", url: "/ferramentas/diagnostico", icon: Stethoscope },
        { title: "Diagnóstico Financeiro", url: "/ferramentas/diagnostico-financeiro", icon: TrendingUp },
        { title: "Simulador de Precificação", url: "/ferramentas/precificacao", icon: Calculator },
        { title: "Máquina de Orçamento", url: "/ferramentas/orcamentos", icon: FileText },
      ],
    },
    {
      title: "Financeiro Raiz",
      icon: DollarSign,
      items: [
        { title: "Visão Geral", url: "/financeiro-raiz", icon: PieChart, end: true },
        { title: "Contratos & Clientes", url: "/financeiro-raiz/contratos", icon: FileText },
        { title: "Pagamentos", url: "/financeiro-raiz/pagamentos", icon: CreditCard },
        { title: "Contas a Pagar", url: "/financeiro-raiz/contas-pagar", icon: Receipt },
      ],
    },
    {
      title: "Biblioteca",
      icon: BookOpen,
      items: [
        { title: "Módulos", url: "/biblioteca?tab=modulos", icon: BookOpen },
        { title: "Consultor IA", url: "/biblioteca?tab=consultor-ia", icon: Sparkles },
        { title: "KPIs", url: "/biblioteca?tab=kpis", icon: TrendingUp },
        { title: "Glossário", url: "/biblioteca?tab=glossario", icon: BookOpen },
        { title: "Planos", url: "/biblioteca?tab=planos", icon: FileText },
      ],
    },
  ];

  const isGroupActive = (g: Group) => g.items.some((i) => pathname.startsWith(i.url.split("?")[0]) && (i.url.split("?")[0] !== "/" || pathname === "/"));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="px-4 pt-6">
          <div className={collapsed ? "flex justify-center" : ""}>
            <BrandLogo onDark className={collapsed ? "h-6" : "h-7"} />
          </div>
          {!collapsed && (
            <div className="mt-1 font-body text-[11px] uppercase tracking-widest text-linho/60">
              {role === "admin" ? "Painel do consultor" : "Área do cliente"}
            </div>
          )}
        </div>

        {/* Dashboard sempre visível */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard"
                    end
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-dourado"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!collapsed && <span>{dashboardLabel}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pasta do Cliente: item de navegação rápida para o cliente */}
        {role === "cliente" && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/pasta-do-cliente"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-dourado"
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Pasta do Cliente</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Saúde da plataforma: visão executiva do admin, acesso rápido */}
        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/saude-plataforma"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-dourado"
                    >
                      <HeartPulse className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Saúde da plataforma</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-linho/60">Consultor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminGroups.map((g) => {
                  const open = isGroupActive(g);
                  return (
                    <Collapsible key={g.title} defaultOpen={open} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="hover:bg-sidebar-accent">
                            <g.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left">{g.title}</span>
                                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {g.items.map((i) => (
                                <SidebarMenuSubItem key={i.url}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={i.url}
                                      end={i.end}
                                      className="hover:bg-sidebar-accent"
                                      activeClassName="bg-sidebar-accent text-dourado"
                                    >
                                      <i.icon className="mr-2 h-3.5 w-3.5" />
                                      <span>{i.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="bg-sidebar text-sidebar-foreground">
        {!collapsed && user?.email && (
          <div className="px-3 pb-2 font-body text-xs text-linho/60 truncate">{user.email}</div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="hover:bg-sidebar-accent">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
