import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { clearAuth, getUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Home, LogOut, Menu, MessageSquare, X } from 'lucide-react';

const navItems = [
  {
    label: 'Rooms',
    to: '/rooms',
    icon: Home,
  },
  {
    label: 'Chat',
    to: '/chat',
    icon: MessageSquare,
  },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);
  const closeTimerRef = useRef<number | null>(null);
  const desktopLabelClass = cn(
    'block whitespace-nowrap transition-all duration-300',
    desktopMenuOpen ? 'opacity-100 translate-x-0' : 'w-0 -translate-x-2 overflow-hidden opacity-0'
  );

  const onSignOut = () => {
    clearAuth();
    navigate('/login');
  };

  const openMenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuMounted(true);
    requestAnimationFrame(() => setMenuOpen(true));
  };

  const closeMenu = () => {
    setMenuOpen(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMenuMounted(false);
      closeTimerRef.current = null;
    }, 240);
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const toggleDesktopMenu = () => {
    setDesktopMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!menuMounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuMounted]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <aside
          id="desktop-nav"
          className={cn(
            'hidden flex-col border-r border-white/5 bg-background/70 backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:overflow-hidden md:transition-[width] md:duration-300 md:ease-out',
            desktopMenuOpen ? 'md:w-64' : 'md:w-20'
          )}
        >
          <div className="px-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground',
                desktopMenuOpen ? 'justify-start gap-3' : 'justify-center gap-0'
              )}
              aria-label={desktopMenuOpen ? 'Collapse menu' : 'Expand menu'}
              aria-expanded={desktopMenuOpen}
              aria-controls="desktop-nav"
              onClick={toggleDesktopMenu}
            >
              {desktopMenuOpen ? (
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span className={desktopLabelClass}>Menu</span>
            </Button>
          </div>
          <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground',
                      desktopMenuOpen ? 'gap-3 justify-start' : 'gap-0 justify-center',
                      isActive && 'bg-white/10 text-foreground'
                    )
                  }
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  <span className={desktopLabelClass}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-white/5 px-3 pb-4 pt-3">
            <NavLink
              to="/profile"
              aria-label="Profile settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground',
                  desktopMenuOpen ? 'gap-3 justify-start' : 'justify-center gap-0',
                  isActive && 'bg-white/10 text-foreground'
                )
              }
            >
              <Avatar className="h-8 w-8">
                {user?.profile_pic ? <AvatarImage src={user.profile_pic} /> : null}
                <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className={desktopLabelClass}>{user?.name || 'Turista'}</span>
            </NavLink>
            <Button
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground',
                desktopMenuOpen ? 'justify-start gap-3' : 'justify-center gap-0'
              )}
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className={desktopLabelClass}>Sign out</span>
            </Button>
          </div>
        </aside>

        <div
          className={cn(
            'flex min-h-screen flex-1 flex-col md:transition-[padding] md:duration-300 md:ease-out',
            desktopMenuOpen ? 'md:pl-64' : 'md:pl-20'
          )}
        >
          <header className="sticky top-0 z-20 border-b border-white/5 bg-background/70 backdrop-blur-xl md:hidden">
            <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={toggleMenu}
              >
                {menuOpen ? (
                  <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                )}
              </Button>
            </div>
          </header>

          {menuMounted ? (
            <div
              className={cn(
                'fixed inset-0 z-30 transition-opacity duration-300 md:hidden',
                menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                aria-label="Close menu"
                onClick={closeMenu}
              />
              <aside
                id="mobile-nav"
                className={cn(
                  'absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-background/95 px-4 py-5 shadow-xl transition-transform duration-300 ease-out',
                  menuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <nav className="mt-1 flex flex-1 flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={closeMenu}
                        aria-label={item.label}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground',
                            isActive && 'bg-white/10 text-foreground'
                          )
                        }
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
                <div className="border-t border-white/10 pt-3">
                  <Button
                    className="w-full rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      closeMenu();
                      onSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    <span>Sign out</span>
                  </Button>
                </div>
              </aside>
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
