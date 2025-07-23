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
		ArrowRight
	} from 'lucide-svelte';
</script>

<div class="container mx-auto py-8 space-y-8">
	<!-- Hero Section -->
	<div class="text-center space-y-4">
		<div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
			<Gamepad2 class="h-4 w-4" />
			Game Guide
		</div>
		<h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
			How to Play
		</h1>
		<p class="text-xl text-muted-foreground max-w-2xl mx-auto">
			Learn how to master the art of habit building and level up your life!
		</p>
	</div>

	<!-- Quick Start Section -->
	<Card class="border-primary/20 bg-gradient-to-br from-primary/20 to-secondary/20">
		<CardHeader>
			<div class="flex items-center gap-2">
				<Zap class="h-6 w-6 text-primary" />
				<CardTitle class="text-2xl">Quick Start Guide</CardTitle>
			</div>
			<CardDescription>
				<!-- Add your quick start description here -->
				Get started in just a few simple steps
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid md:grid-cols-3 gap-4">
				<div class="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
					<div class="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
						<span class="text-primary font-bold">1</span>
					</div>
					<h3 class="font-semibold mb-2">Create an Account & Creature</h3>
					<p class="text-sm text-muted-foreground">
                        Start your journey by creating an account and a creature.
					</p>
				</div>
				<div class="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
					<div class="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
						<span class="text-primary font-bold">2</span>
					</div>
					<h3 class="font-semibold mb-2">Create Your First Habit...Or Six</h3>
					<p class="text-sm text-muted-foreground">
						Create your first habit(s) and start earning XP.
					</p>
				</div>
				<div class="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
					<div class="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
						<span class="text-primary font-bold">3</span>
					</div>
					<h3 class="font-semibold mb-2">Explore the App and Complete Some Habits!</h3>
					<p class="text-sm text-muted-foreground">
						Check out your character stats, pick a quest,and start knocking out your habits!
					</p>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Core Mechanics Section -->
	<div class="grid md:grid-cols-2 gap-6">
		<!-- Habits & XP -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<Target class="h-5 w-5 text-icon" />
					<CardTitle>Habits & Experience</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<h4 class="font-semibold flex items-center gap-2">
						<CheckCircle class="h-4 w-4 text-primary" />
						Creating Habits
					</h4>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
				</div>
				<div class="space-y-2">
					<h4 class="font-semibold flex items-center gap-2">
						<Star class="h-4 w-4 text-primary" />
						Earning XP
					</h4>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
					<div class="bg-muted/50 p-3 rounded-lg">
						<div class="flex justify-between text-sm mb-1">
							<span>Example Progress</span>
							<span>75/100 XP</span>
						</div>
						<Progress value={75} class="h-2" />
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Levels & Progression -->
		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5 text-primary" />
					<CardTitle>Levels & Progression</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<h4 class="font-semibold flex items-center gap-2">
						<Crown class="h-4 w-4 text-primary" />
						Leveling Up
					</h4>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
				</div>
				<div class="space-y-2">
					<h4 class="font-semibold flex items-center gap-2">
						<Trophy class="h-4 w-4 text-primary" />
						Achievements
					</h4>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
				</div>
				<div class="flex items-center gap-2 bg-primary/10 p-3 rounded-lg">
					<Award class="h-5 w-5 text-primary" />
					<div>
						<p class="font-medium text-sm">Example Achievement</p>
						<p class="text-xs text-muted-foreground">Complete 7 habits in a row</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Character System -->
	<Card class="border-secondary/20">
		<CardHeader>
			<div class="flex items-center gap-2">
				<Sword class="h-6 w-6 text-secondary" />
				<CardTitle class="text-2xl">Character System</CardTitle>
			</div>
			<CardDescription>
				Customize your avatar and choose your path
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-4">
					<h3 class="font-semibold flex items-center gap-2">
						<Shield class="h-5 w-5 text-primary" />
						Races & Classes
					</h3>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
					<div class="grid grid-cols-2 gap-2">
						<div class="bg-muted/50 p-2 rounded text-center text-sm">Race Example</div>
						<div class="bg-muted/50 p-2 rounded text-center text-sm">Class Example</div>
					</div>
				</div>
				<div class="space-y-4">
					<h3 class="font-semibold flex items-center gap-2">
						<Sparkles class="h-5 w-5 text-secondary" />
						Customization
					</h3>
					<p class="text-sm text-muted-foreground">
						Content
					</p>
					<div class="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg border border-primary/20">
						<p class="text-sm font-medium">💡 Pro Tip</p>
						<p class="text-xs text-muted-foreground mt-1">
							Content
						</p>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Difficulty & Strategy -->
	<div class="grid md:grid-cols-3 gap-4">
		<Card class="border-success/20">
			<CardHeader class="pb-3">
				<CardTitle class="text-lg flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-success"></div>
					Easy Habits
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-3">
					Content
				</p>
				<div class="text-xs bg-success/10 text-success p-2 rounded">
					Reward: Low XP, High Success Rate
				</div>
			</CardContent>
		</Card>

		<Card class="border-primary/20">
			<CardHeader class="pb-3">
				<CardTitle class="text-lg flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-primary"></div>
					Medium Habits
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-3">
					Content
				</p>
				<div class="text-xs bg-primary/10 text-primary p-2 rounded">
					Reward: Medium XP, Balanced Challenge
				</div>
			</CardContent>
		</Card>

		<Card class="border-secondary/20">
			<CardHeader class="pb-3">
				<CardTitle class="text-lg flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-secondary"></div>
					Hard Habits
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-muted-foreground mb-3">
					Content
				</p>
				<div class="text-xs bg-secondary/10 text-secondary p-2 rounded">
					Reward: High XP, Maximum Challenge
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Tips & Strategies -->
	<Card>
		<CardHeader>
			<div class="flex items-center gap-2">
				<Sparkles class="h-6 w-6 text-primary" />
				<CardTitle class="text-2xl">Tips & Strategies</CardTitle>
			</div>
			<CardDescription>
				Master these techniques to maximize your progress
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-4">
					<h3 class="font-semibold">Building Momentum</h3>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-start gap-2">
							<CheckCircle class="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
							Content
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
							Content
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
							Content
						</li>
					</ul>
				</div>
				<div class="space-y-4">
					<h3 class="font-semibold">Advanced Strategies</h3>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-start gap-2">
							<Target class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
							Content
						</li>
						<li class="flex items-start gap-2">
							<Target class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
							Content
						</li>
						<li class="flex items-start gap-2">
							<Target class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
							Content
						</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Call to Action -->
	<Card class="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-primary/20">
		<CardContent class="text-center py-8">
			<h2 class="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
			<p class="text-muted-foreground mb-6 max-w-2xl mx-auto">
				Content
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<Button size="lg" href="/dashboard" class="flex items-center gap-2">
					<Calendar class="h-4 w-4" />
					Go to Dashboard
					<ArrowRight class="h-4 w-4" />
				</Button>
				<Button size="lg" variant="outline" href="/habits/create">
					Create Your First Habit
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
