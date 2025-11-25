<!-- src/lib/components/Footer.svelte -->
<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Github, Cloud, Bot } from "@lucide/svelte";
  
    const currentYear = new Date().getFullYear();
  
    const footerLinks = {
      product: [
        { label: 'Features', href: '/features' },
        { label: 'How to Play', href: '/how-to-play' },
        { label: 'FAQ', href: '/faq' }
      ],
      support: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Contact', href: '/contact' }
      ],
      community: [
        { label: 'Discord', href: '#', icon: Bot },
        { label: 'GitHub', href: '#', icon: Github },
        { label: 'BlueSky', href: '#', icon: Cloud  }
      ]
    };
  </script>
  
  <footer class="border-t bg-background">
    <div class="container mx-auto px-4 py-8 md:py-12">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-4">
        <!-- Brand -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold">Creatures of Habit</h2>
          <p class="text-sm text-muted-foreground">
            Level up your life by turning your daily habits into a grind for experience and loot!
          </p>
          <div class="flex items-center space-x-4">
            {#each footerLinks.community as link}
              <a
                href={link.href}
                class="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svelte:component this={link.icon} class="h-5 w-5" />
                <span class="sr-only">{link.label}</span>
              </a>
            {/each}
          </div>
        </div>
  
        <!-- Product Links -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium">Product</h3>
          <ul class="space-y-2">
            {#each footerLinks.product as link}
              <li>
                <a
                  href={link.href}
                  class="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
  
        <!-- Support Links -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium">Support</h3>
          <ul class="space-y-2">
            {#each footerLinks.support as link}
              <li>
                <a
                  href={link.href}
                  class="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
  
        <!-- Newsletter - Hidden until feature is implemented -->
        <!-- <div class="space-y-4">
          <h3 class="text-sm font-medium">Stay Updated</h3>
          <p class="text-sm text-muted-foreground">
            Subscribe to stay up to date on progress and release notes.
          </p>
          <form class="flex flex-col gap-2" on:submit|preventDefault>
            <input
              type="email"
              placeholder="Enter your email"
              class="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
            <Button type="submit" class="w-full">Subscribe</Button>
          </form>
        </div> -->
      </div>
  
      <!-- Bottom Section -->
      <div class="mt-8 border-t pt-8">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p class="text-sm text-muted-foreground">
            © {currentYear} Creatures of Habit. All rights reserved.
          </p>
          <div class="flex items-center space-x-4">
            <a
              href="/privacy"
              class="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              class="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </a>
            <a
              href="/cookies"
              class="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>