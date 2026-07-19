import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  Briefcase, 
  BarChart3, 
  Settings, 
  Bell, 
  Activity, 
  ShieldAlert,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  
  const role = profile?.role || 'employee';

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['admin', 'management', 'department_head', 'employee'] },
    { name: "Departments", href: "/departments", icon: Building2, roles: ['admin', 'management'] },
    { name: "Employees", href: "/employees", icon: Users, roles: ['admin', 'management', 'department_head'] },
    { name: "Reports", href: "/reports", icon: FileText, roles: ['admin', 'management', 'department_head', 'employee'] },
    { name: "Management", href: "/management", icon: Briefcase, roles: ['admin', 'management'] },
    { name: "Analytics", href: "/analytics", icon: BarChart3, roles: ['admin', 'management'] },
    { name: "Notifications", href: "/notifications", icon: Bell, roles: ['admin', 'management', 'department_head', 'employee'] },
    { name: "Activity Logs", href: "/activity-logs", icon: Activity, roles: ['admin', 'management'] },
    { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 font-bold text-lg tracking-tight border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs">
            EO
          </div>
          <span>OpsHub</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Link href="/profile" className="flex items-center gap-3 mb-4 p-2 rounded-md hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-medium">{profile?.name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate text-sidebar-foreground">{profile?.name}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate capitalize">{role.replace('_', ' ')}</span>
          </div>
        </Link>

        <div className="space-y-1">
          {role === 'admin' && (
            <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}