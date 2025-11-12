<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { 
		Trophy,
		Target, 
		Zap, 
		Award, 
		TrendingUp, 
		CheckCircle,
		Sword,
		Sparkles,
		Crown,
		ArrowRight,
		Users,
		Bell,
		BarChart3,
		Settings,
		Smartphone,
		Lock,
		Palette,
		Clock
	} from '@lucide/svelte';
</script>

<div class="container mx-auto py-8 space-y-8">
	<!-- Hero Section -->
	<div class="text-center space-y-4">
		<div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
			<Sparkles class="h-4 w-4" />
			App Features
		</div>
		<h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
			Powerful Features
		</h1>
		<p class="text-xl text-muted-foreground max-w-2xl mx-auto">
			Discover all the tools and features that make Creatures of Habit the ultimate gamified habit tracker
		</p>
	</div>

	<!-- Core Features Grid -->
	<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- Habit Tracking -->
		<Card class="border-primary/20 hover:border-primary/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Target class="h-6 w-6 text-primary" />
					<CardTitle class="text-lg">Smart Habit Tracking</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Create and track habits with flexible scheduling and difficulty levels.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-easy"></div>
						<span>Easy, Medium, Hard difficulties</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Daily, weekly & custom frequency</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>Real-time progress tracking</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Character System -->
		<Card class="border-secondary/20 hover:border-secondary/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Sword class="h-6 w-6 text-secondary" />
					<CardTitle class="text-lg">Character Creation</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Create your unique creature companion with 4 races, 8 classes, and customizable stats.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>4 races: Human, Orc, Elf, Dwarf</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>8 classes with unique abilities</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-secondary"></div>
						<span>6 customizable stats</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- XP & Leveling -->
		<Card class="border-success/20 hover:border-success/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<TrendingUp class="h-6 w-6 text-success" />
					<CardTitle class="text-lg">XP & Progression</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Earn experience points and level up your character as you complete habits.
				</p>
				<div class="bg-muted/50 p-3 rounded-lg">
					<div class="flex justify-between text-sm mb-1">
						<span>Level Progress</span>
						<span>1,250/2,000 XP</span>
					</div>
					<Progress value={62.5} class="h-2" />
				</div>
			</CardContent>
		</Card>

		<!-- Quest System -->
		<Card class="border-accent/20 hover:border-accent/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Trophy class="h-6 w-6 text-accent" />
					<CardTitle class="text-lg">Epic Quests</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Complete story-driven quests to earn bonus XP and stat boost points.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-success"></div>
						<span>5-question narrative adventures</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>50-150 XP per quest</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Earn stat boost points</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Streak System -->
		<Card class="border-medium/20 hover:border-medium/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Zap class="h-6 w-6 text-medium" />
					<CardTitle class="text-lg">Streak System</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Build consistency with streak tracking and earn bonus XP rewards.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Track current & longest streaks</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>Up to 50% bonus XP</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Cross-Platform -->
		<Card class="border-hard/20 hover:border-hard/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Smartphone class="h-6 w-6 text-hard" />
					<CardTitle class="text-lg">Multi-Platform Access</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Access your habits anywhere with web and desktop applications.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-success"></div>
						<span>Responsive web app</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Native desktop app (Tauri)</span>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Advanced Features Section -->
	<Card class="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
		<CardHeader>
			<div class="flex items-center gap-2">
				<Crown class="h-6 w-6 text-primary" />
				<CardTitle class="text-2xl">Advanced Features</CardTitle>
			</div>
			<CardDescription>
				Powerful tools for serious habit builders
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-4">
					<h3 class="font-semibold flex items-center gap-2">
						<Settings class="h-5 w-5 text-accent" />
						Customization & Flexibility
					</h3>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Three difficulty levels (Easy, Medium, Hard)
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Daily, weekly, and custom scheduling
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Stat allocation and character progression
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Email notification preferences
						</li>
					</ul>
				</div>
				<div class="space-y-4">
					<h3 class="font-semibold flex items-center gap-2">
						<Lock class="h-5 w-5 text-secondary" />
						Security & Privacy
					</h3>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Secure data encryption
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Privacy-first approach
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Local data backup options
						</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Upcoming Features -->
	<Card class="border-accent/20">
		<CardHeader>
			<div class="flex items-center gap-2">
				<Clock class="h-6 w-6 text-accent" />
				<CardTitle class="text-2xl">Coming Soon</CardTitle>
			</div>
			<CardDescription>
				Exciting features in development
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid md:grid-cols-3 gap-4">
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Smartphone class="h-5 w-5 text-primary" />
						<h4 class="font-semibold">Mobile Apps</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Native iOS and Android apps for habit tracking on the go.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Users class="h-5 w-5 text-secondary" />
						<h4 class="font-semibold">Social Features</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Connect with friends, join challenges, and share achievements.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<BarChart3 class="h-5 w-5 text-accent" />
						<h4 class="font-semibold">Advanced Analytics</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Habit strength analysis, predictions, and personalized insights.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Award class="h-5 w-5 text-primary" />
						<h4 class="font-semibold">Achievement System</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Unlock badges and achievements for completing milestones.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Palette class="h-5 w-5 text-secondary" />
						<h4 class="font-semibold">Dark Mode</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Customize your experience with light and dark themes.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Bell class="h-5 w-5 text-accent" />
						<h4 class="font-semibold">Push Notifications</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Browser and mobile push notifications for habit reminders.
					</p>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Call to Action -->
	<Card class="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-primary/20">
		<CardContent class="text-center py-8">
			<h2 class="text-2xl font-bold mb-4">Ready to Experience These Features?</h2>
			<p class="text-muted-foreground mb-6 max-w-2xl mx-auto">
				Start your journey today and transform your daily routine into an epic RPG adventure. Build lasting habits, level up your creature, and become the hero of your own story!
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<Button size="lg" href="/signup" class="flex items-center gap-2">
					<Zap class="h-4 w-4" />
					Get Started Free
					<ArrowRight class="h-4 w-4" />
				</Button>
				<Button size="lg" variant="outline" href="/how-to-play">
					Learn How It Works
				</Button>
			</div>
		</CardContent>
	</Card>
</div>