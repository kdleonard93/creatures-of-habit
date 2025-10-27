<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { 
		Trophy, 
		Target, 
		Star, 
		Zap, 
		Award, 
		TrendingUp, 
		Calendar, 
		CheckCircle,
		Gamepad2,
		Sword,
		Shield,
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
					Create and track habits with flexible scheduling, difficulty levels, and smart reminders.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-easy"></div>
						<span>Easy, Medium, Hard difficulty levels</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Custom scheduling & frequency</span>
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
					Create your unique character with races, classes, and customizable stats.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>Multiple races & classes</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Customizable stat allocation</span>
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

		<!-- Analytics -->
		<Card class="border-accent/20 hover:border-accent/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<BarChart3 class="h-6 w-6 text-accent" />
					<CardTitle class="text-lg">Progress Analytics</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Track your progress with detailed analytics and visual insights.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-success"></div>
						<span>Daily completion rates</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>Streak tracking & insights</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Notifications -->
		<Card class="border-medium/20 hover:border-medium/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Bell class="h-6 w-6 text-medium" />
					<CardTitle class="text-lg">Smart Reminders</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Never miss a habit with intelligent notifications and reminders.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Email notifications</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-primary"></div>
						<span>Customizable timing</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Cross-Platform -->
		<Card class="border-hard/20 hover:border-hard/40 transition-colors">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Smartphone class="h-6 w-6 text-hard" />
					<CardTitle class="text-lg">Cross-Platform</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-4">
					Access your habits anywhere with web, desktop, and mobile apps.
				</p>
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-success"></div>
						<span>Web & desktop apps</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<div class="h-2 w-2 rounded-full bg-accent"></div>
						<span>Sync across all devices</span>
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
							Custom habit categories and tags
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Flexible scheduling options
						</li>
						<li class="flex items-center gap-2">
							<CheckCircle class="h-4 w-4 text-success" />
							Personalized difficulty scaling
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
						<Users class="h-5 w-5 text-primary" />
						<h4 class="font-semibold">Social Features</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Connect with friends, join challenges, and share achievements.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Award class="h-5 w-5 text-secondary" />
						<h4 class="font-semibold">Achievements</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Unlock badges and achievements for completing milestones.
					</p>
				</div>
				<div class="p-4 rounded-lg bg-muted/30 border border-muted">
					<div class="flex items-center gap-2 mb-2">
						<Palette class="h-5 w-5 text-accent" />
						<h4 class="font-semibold">Themes</h4>
					</div>
					<p class="text-sm text-muted-foreground">
						Customize your experience with multiple color themes.
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
				Join thousands of users who are already transforming their lives with gamified habit building.
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