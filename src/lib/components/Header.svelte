<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "$lib/components/ui/sheet";
    import { Menu } from "lucide-svelte";
    import { page } from '$app/stores';
  
    // Navigation items
    const navItems = [
      { href: '/', label: 'Dashboard' },
      { href: '/habits', label: 'Habits' },
      { href: '/character', label: 'Character' },
      { href: '/quests', label: 'Quests' },
      { href: '/profile', label: 'Profile' }
    ];
  
    $: path = $page.url.pathname;

    const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="h-8 w-8">
  <!-- Shield background -->
  <path d="M100 20 
           L160 50 
           C160 120, 140 160, 100 180
           C60 160, 40 120, 40 50 Z" 
        fill="#67917A"/>
  
  <!-- Inner shield decoration -->
  <path d="M100 30
           L150 55
           C150 115, 135 150, 100 170
           C65 150, 50 115, 50 55 Z"
        fill="none"
        stroke="#170409"
        stroke-width="2"/>
  
  <!-- Pixel-style creature -->
  <g transform="translate(65, 70)">
    <!-- Body blocks -->
    <rect x="15" y="0" width="40" height="40" fill="#B8AF03"/>
    <rect x="5" y="10" width="10" height="30" fill="#B8AF03"/>
    <rect x="55" y="10" width="10" height="30" fill="#B8AF03"/>
    <!-- Eyes -->
    <rect x="25" y="15" width="8" height="8" fill="#170409"/>
    <rect x="37" y="15" width="8" height="8" fill="#170409"/>
    <!-- Smile -->
    <rect x="25" y="30" width="20" height="5" fill="#170409"/>
  </g>
  
  <!-- Star burst effects -->
  <g fill="#E33258">
    <path d="M45 40 l5 -15 l5 15 l-15 -5 l15 5 Z"/>
    <path d="M145 40 l5 -15 l5 15 l-15 -5 l15 5 Z"/>
    <path d="M95 140 l5 -15 l5 15 l-15 -5 l15 5 Z"/>
  </g>
  
  <!-- Progress bars -->
  <g transform="translate(50, 120)">
    <!-- Background bars -->
    <rect x="0" y="0" width="100" height="8" rx="4" fill="#170409"/>
    <rect x="0" y="12" width="100" height="8" rx="4" fill="#170409"/>
    <!-- Progress indicators -->
    <rect x="0" y="0" width="75" height="8" rx="4" fill="#CCBF82"/>
    <rect x="0" y="12" width="60" height="8" rx="4" fill="#CCBF82"/>
  </g>
</svg>`;
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