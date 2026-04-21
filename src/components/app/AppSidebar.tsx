import { LayoutDashboard, Wrench, Stethoscope, Calculator, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();

  const dashboardLabel = role === "admin" ? "Gestão de Clientes" : "Dashboard";
  const clienteItems = [{ title: dashboardLabel, url: "/dashboard", icon: LayoutDashboard }];
  const adminItems = [
    { title: "Ferramentas", url: "/ferramentas", icon: Wrench, end: true },
    { title: "Diagnóstico 360°", url: "/ferramentas/diagnostico", icon: Stethoscope },
    { title: "Orçamentos", url: "/ferramentas/orcamentos", icon: Calculator },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="px-4 pt-6">
          <div className="font-display text-2xl text-linho">
            Raiz<span className="text-dourado">.</span>
          </div>
          {!collapsed && (
            <div className="mt-1 font-body text-[11px] uppercase tracking-widest text-linho/60">
              {role === "admin" ? "Painel do consultor" : "Área do cliente"}
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-linho/60">Cliente</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clienteItems.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={i.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-dourado"
                    >
                      <i.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{i.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-linho/60">Consultor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={i.url}
                        end={i.end}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-dourado"
                      >
                        <i.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{i.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
