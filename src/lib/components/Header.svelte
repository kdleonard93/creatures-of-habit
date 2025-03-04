<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "$lib/components/ui/sheet";
    import { Menu } from "lucide-svelte";
    import { page } from '$app/stores';
    import { svgLogo } from '$lib/assets/appLogo';
    import NotificationCenter from '$lib/components/notifications/NotificationCenter.svelte'
  
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
  
    $: path = $page.url.pathname;
</script>
  
<header class="border-b">
    <div class="container mx-auto px-2 sm:px-4 lg:px-6">
        <div class="flex h-16 items-center justify-between">
            <!-- Logo -->
            <div class="flex items-center">
                <a href="/" class="flex items-center gap-2 text-xl font-bold">
                    {@html svgLogo} 
                    <span>Creatures of Habit</span> 
                    {@html svgLogo}
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
            <Sheet>
                <SheetTrigger asChild class="md:hidden">
                    <Button variant="ghost" size="icon">
                        <Menu class="h-5 w-5" />
                        <span class="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                        <SheetDescription>
                            Navigate through your RPG journey
                        </SheetDescription>
                    </SheetHeader>
                    <nav class="flex flex-col gap-4 mt-4">
                        {#each navItems as item}
                            <a
                                href={item.href}
                                class="text-sm font-medium transition-colors hover:text-primary {path === item.href ? 'text-primary' : 'text-muted-foreground'}"
                            >
                                {item.label}
                            </a>
                        {/each}
                        <div class="flex flex-col gap-2 mt-4">
                            {#each authItems as item}
                                <Button href={item.href} variant={item.variant}>
                                    {item.label}
                                </Button>
                            {/each}
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    </div>
</header>