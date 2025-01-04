<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "$lib/components/ui/sheet";
    import { Menu } from "lucide-svelte";
    import { page } from '$app/stores';
    import { svgLogo } from '$lib/assets/appLogo';
  
    // Navigation items
    const navItems = [
      { href: '/', label: 'Dashboard' },
      { href: '/habits', label: 'Habits' },
      { href: '/character', label: 'Character' },
      { href: '/quests', label: 'Quests' },
      { href: '/profile', label: 'Profile' }
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
          <Button href="/login" variant="ghost" size="sm">Log in</Button>
          <Button href="/signup" size="sm">Sign up</Button>
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
                <Button variant="ghost">Sign in</Button>
                <Button>Sign up</Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>