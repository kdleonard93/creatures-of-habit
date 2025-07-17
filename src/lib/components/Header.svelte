<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "$lib/components/ui/sheet";
    import { Menu } from "lucide-svelte";
    import { page } from '$app/stores';
    import { svgLogo } from '$lib/assets/appLogo';
    import NotificationCenter from '$lib/components/notifications/NotificationCenter.svelte'
    
    // State for mobile menu
    let menuOpen = $state(false);
    
    // Function to close the mobile menu
    function closeMenu() {
        menuOpen = false;
    }
  
    type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | undefined;

    // Navigation items
    const navItems: Array<{href: string; label: string;}> = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/habits', label: 'Habits' },
      { href: '/character/details', label: 'Character' },
      { href: '/quests', label: 'Quests' }
    ];

    // Auth items for consistent usage
    const authItems: Array<{ href: string; label: string; variant: ButtonVariant }> = [
      { href: '/login', label: 'Log in', variant: 'secondary' },
      { href: '/signup', label: 'Sign up', variant: 'default' }
    ];
  
    const path = $derived($page.url.pathname);
</script>
  
<header class="border-b">
    <div class="container mx-auto px-2 sm:px-4 lg:px-6">
        <div class="flex h-16 items-center justify-between">
            <!-- Logo -->
            <div class="flex items-center">
                <a href="/" class="flex items-center gap-2 text-xl font-bold">
                    {@html svgLogo} 
                    <span>Creatures of Habit</span> 
                </a>
            </div>
  
            <!-- Desktop Navigation -->
            <nav class="hidden md:flex items-center gap-6">
                {#each navItems as item}
                    <a
                        href={item.href}
                        class="text-sm font-medium transition-colors hover:text-primary {path === item.href ? 'text-primary' : 'text-muted-foreground'}"
                    >
                        {item.label}
                    </a>
                {/each}
            </nav>
  
            <!-- User Menu (Desktop) -->
            <div class="hidden md:flex items-center gap-4">
                <NotificationCenter />
                {#each authItems as item}
                    <Button href={item.href} variant={item.variant} size="sm">
                        {item.label}
                    </Button>
                {/each}
            </div>

            
  
            <!-- Mobile Navigation -->
            <div class="md:hidden flex items-center gap-2">
                <NotificationCenter />
                <Sheet bind:open={menuOpen}>
                    <SheetTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            on:click={() => menuOpen = !menuOpen}
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                        >
                            <Menu class="h-5 w-5" />
                            <span class="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" class="w-[300px] sm:w-[400px]">
                        <SheetHeader class="mb-6">
                            <SheetTitle class="text-xl font-bold">Menu</SheetTitle>
                            <SheetDescription class="text-sm">
                                Navigate through your RPG journey
                            </SheetDescription>
                        </SheetHeader>
                        
                        <div class="space-y-6">
                            <!-- Navigation Links -->
                            <nav class="space-y-2">
                                {#each navItems as item}
                                    <a
                                        href={item.href}
                                        class="flex items-center px-4 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors {path === item.href ? 'bg-accent text-accent-foreground' : 'text-foreground'}"
                                        onclick={closeMenu}
                                    >
                                        {item.label}
                                    </a>
                                {/each}
                            </nav>
                            
                            <!-- Divider -->
                            <div class="border-t border-border"></div>
                            
                            <!-- Auth Buttons -->
                            <div class="space-y-2">
                                {#each authItems as item}
                                    <Button 
                                        href={item.href} 
                                        variant={item.variant} 
                                        class="w-full justify-start"
                                        onclick={closeMenu}
                                    >
                                        {item.label}
                                    </Button>
                                {/each}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    </div>
</header>