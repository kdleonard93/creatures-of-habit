<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Progress } from "$lib/components/ui/progress";
    import { svgLogo } from '$lib/assets/appLogo';
    import { ArrowRight, Award, Calendar, CheckCircle, Clock, Dumbbell, Sparkles, Target, Trophy, Users } from "lucide-svelte";
</script>

<!-- Hero Section -->
<section class="py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
  <div class="container px-4 md:px-6">
    <div class="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
      <div class="flex flex-col justify-center space-y-4">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
            Level Up Your Life with <span class="text-primary">Creatures of Habit</span>
          </h1>
          <p class="max-w-[600px] text-muted-foreground md:text-xl">
            Transform your daily habits into an epic RPG adventure. Build routines, earn XP, and watch your character grow as you achieve your real-life goals.
          </p>
        </div>
        <div class="flex flex-col gap-2 min-[400px]:flex-row">
          <Button size="lg" href="/signup">Get Started Free</Button>
          <Button size="lg" variant="outline" href="/how-to-play">
            How It Works
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div class="flex items-center space-x-4 text-sm">
          <div class="flex items-center">
            <CheckCircle className="mr-1 h-4 w-4 text-primary" />
            <span>Free to start</span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-center">
        <div class="relative w-full max-w-[500px]">
          <!-- Hero image - stylized character card -->
          <div class="relative overflow-hidden rounded-lg border bg-background p-6 shadow-xl">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-16 w-16 overflow-hidden rounded-full border-2 border-primary">
                {@html svgLogo}
              </div>
              <div>
                <h3 class="text-xl font-bold">Pixel Warrior</h3>
                <div class="flex items-center text-sm text-muted-foreground">
                  <Trophy class="mr-1 h-4 w-4 text-yellow-500" />
                  <span>Level 15 Habit Master</span>
                </div>
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <div class="flex items-center justify-between text-sm">
                  <span>XP Progress</span>
                  <span>450/500</span>
                </div>
                <Progress value={90} class="h-2 mt-1" />
              </div>
              <div>
                <div class="flex items-center justify-between text-sm">
                  <span>Daily Streak</span>
                  <span>24 days</span>
                </div>
                <Progress value={80} class="h-2 mt-1" />
              </div>
              <div>
                <div class="flex items-center justify-between text-sm">
                  <span>Habits Completed</span>
                  <span>12/15</span>
                </div>
                <Progress value={75} class="h-2 mt-1" />
              </div>
            </div>
            <div class="mt-6 grid grid-cols-3 gap-2">
              <div class="flex flex-col items-center rounded-md border p-2">
                <Award class="h-6 w-6 text-primary" />
                <span class="mt-1 text-xs">20 Badges</span>
              </div>
              <div class="flex flex-col items-center rounded-md border p-2">
                <Calendar class="h-6 w-6 text-primary" />
                <span class="mt-1 text-xs">3 Quests</span>
              </div>
              <div class="flex flex-col items-center rounded-md border p-2">
                <Sparkles class="h-6 w-6 text-primary" />
                <span class="mt-1 text-xs">5 Rewards</span>
              </div>
            </div>
          </div>
          <!-- Decorative elements -->
          <div class="absolute -top-4 -right-4 h-24 w-24 rotate-12 rounded-lg bg-primary/20 blur-xl"></div>
          <div class="absolute -bottom-4 -left-4 h-24 w-24 -rotate-12 rounded-lg bg-primary/20 blur-xl"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section class="py-12 md:py-24 bg-background">
  <div class="container px-4 md:px-6">
    <div class="flex flex-col items-center justify-center space-y-4 text-center">
      <div class="space-y-2">
        <div class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
          Key Features
        </div>
        <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
          Turn Habits into Adventures
        </h2>
        <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Creatures of Habit transforms your daily routines into an engaging RPG experience
        </p>
      </div>
    </div>
    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
      <Card>
        <CardHeader>
          <Target class="h-10 w-10 text-primary mb-2" />
          <CardTitle>Habit Tracking</CardTitle>
          <CardDescription>
            Create and track daily, weekly, and one-time habits with customizable difficulty levels
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Trophy class="h-10 w-10 text-primary mb-2" />
          <CardTitle>XP & Leveling</CardTitle>
          <CardDescription>
            Earn experience points and level up your character as you complete habits
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Dumbbell class="h-10 w-10 text-primary mb-2" />
          <CardTitle>Streak System</CardTitle>
          <CardDescription>
            Build momentum with streaks that reward consistency and regular habit completion
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Award class="h-10 w-10 text-primary mb-2" />
          <CardTitle>Achievements</CardTitle>
          <CardDescription>
            Unlock badges and achievements as you reach milestones in your habit journey
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Clock class="h-10 w-10 text-primary mb-2" />
          <CardTitle>Quest System</CardTitle>
          <CardDescription>
            Complete special quests and challenges to earn bonus rewards and items
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Users class="h-10 w-10 text-primary mb-2" />
          <CardTitle>Community</CardTitle>
          <CardDescription>
            Join a community of habit builders and share your progress and achievements
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  </div>
</section>

<!-- How It Works Section -->
<section class="py-12 md:py-24 bg-muted/30">
  <div class="container px-4 md:px-6">
    <div class="flex flex-col items-center justify-center space-y-4 text-center">
      <div class="space-y-2">
        <div class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
          Simple Process
        </div>
        <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
          How Creatures of Habit Works
        </h2>
        <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Get started in minutes and begin your journey to better habits
        </p>
      </div>
    </div>
    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-8">
      <div class="flex flex-col items-center space-y-2 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          1
        </div>
        <h3 class="text-xl font-bold">Create Habits</h3>
        <p class="text-muted-foreground">
          Set up your daily, weekly, or one-time habits with custom difficulty levels
        </p>
      </div>
      <div class="flex flex-col items-center space-y-2 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          2
        </div>
        <h3 class="text-xl font-bold">Complete Tasks</h3>
        <p class="text-muted-foreground">
          Check off your habits as you complete them in real life to earn XP
        </p>
      </div>
      <div class="flex flex-col items-center space-y-2 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
          3
        </div>
        <h3 class="text-xl font-bold">Level Up</h3>
        <p class="text-muted-foreground">
          Watch your character grow stronger as you build consistent habits
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section class="py-12 md:py-24 bg-background">
  <div class="container px-4 md:px-6">
    <div class="flex flex-col items-center justify-center space-y-4 text-center">
      <div class="space-y-2">
        <div class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
          Testimonials
        </div>
        <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
          What Our Users Say
        </h2>
        <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Join thousands of users who have transformed their habits with our app
        </p>
      </div>
    </div>
    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 mt-8">
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span class="text-xl font-bold text-primary">S</span>
            </div>
            <div>
              <CardTitle>Sarah K.</CardTitle>
              <CardDescription>Level 22 Habit Master</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground">
            "I've tried many habit trackers, but the RPG elements in Creatures of Habit make it so much more engaging. I've maintained my exercise routine for 3 months now!"
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span class="text-xl font-bold text-primary">M</span>
            </div>
            <div>
              <CardTitle>Michael T.</CardTitle>
              <CardDescription>Level 18 Quest Seeker</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground">
            "The streak system has been a game-changer for me. I'm now on a 45-day meditation streak, and I can feel the difference in my daily life."
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span class="text-xl font-bold text-primary">J</span>
            </div>
            <div>
              <CardTitle>Jamie L.</CardTitle>
              <CardDescription>Level 25 Achievement Hunter</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground">
            "I love how the app turns mundane tasks into fun challenges. The XP system makes me excited to complete my habits each day!"
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="py-12 md:py-24 bg-primary/5">
  <div class="container px-4 md:px-6">
    <div class="flex flex-col items-center justify-center space-y-4 text-center">
      <div class="space-y-2">
        <h2 class="text-3xl font-bold tracking-tighter md:text-4xl/tight">
          Ready to Transform Your Habits?
        </h2>
        <p class="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Join thousands of users who are leveling up their lives with Creatures of Habit
        </p>
      </div>
      <div class="flex flex-col gap-2 min-[400px]:flex-row">
        <Button size="lg" href="/signup">
          Start Your Journey
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" href="/login">
          Log In
        </Button>
      </div>
    </div>
  </div>
</section>