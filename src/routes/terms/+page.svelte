<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Handshake } from '@lucide/svelte';
	import { cn } from '$lib/utils';
</script>

<div class="container mx-auto py-8 space-y-8 max-w-4xl">
	<!-- Hero Section -->
	<div class="text-center space-y-4 mb-12">
        <div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
			<Handshake class="h-4 w-4" />
			<span>Legal</span>
		</div>
		<h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
			Terms of Service
		</h1>
		<p class="text-lg text-muted-foreground max-w-2xl mx-auto">
			Last Updated: August 5, 2025
		</p>
	</div>

	<div class="grid gap-6">
		<Card class="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
			<CardHeader class="pb-4 border-b">
				<CardTitle class="text-2xl font-bold flex items-center gap-2">
					<span class="bg-primary/10 p-2 rounded-lg">
						<Handshake class="h-5 w-5 text-primary" />
					</span>
					<span>Our Terms</span>
				</CardTitle>
				<CardDescription>
					Please read these terms carefully before using our service
				</CardDescription>
			</CardHeader>
			<CardContent class="pt-6">
				<div class="space-y-8">
					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							1. Acceptance of Terms
						</h2>
						<p class="text-muted-foreground">Welcome to Creatures of Habit ("Application," "we," "us," or "our"). By accessing or using our habit tracking application, you agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree with any part of these Terms, you must not access or use the Application.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							2. Description of Service
						</h2>
						<p class="text-muted-foreground mb-3">Creatures of Habit is a gamified habit tracking application that helps users build consistent routines by turning daily habits into a fun, RPG-like experience. The Application allows users to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Create and track daily habits</li>
							<li>Monitor progress through visual indicators and streak tracking</li>
							<li>Earn experience points and level up virtual creatures</li>
							<li>Organize habits by categories and difficulty levels</li>
							<li>Receive notifications and reminders for habit completion</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							3. Eligibility
						</h2>
						<p class="text-muted-foreground">To use the Application, you must be at least 13 years old. If you are under 18, you represent that you have obtained permission from a parent or guardian to use the Application. By using the Application, you represent and warrant that you meet these eligibility requirements.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							4. Account Registration
						</h2>
						<p class="text-muted-foreground mb-3">To access certain features of the Application, you may be required to create an account. You agree to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Provide accurate, current, and complete information during registration</li>
							<li>Maintain and update your information as needed</li>
							<li>Maintain the security of your account credentials</li>
							<li>Notify us immediately of any unauthorized use of your account</li>
						</ul>
						<p class="text-muted-foreground mt-3">You are solely responsible for all activities that occur under your account.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							5. User Data and Privacy
						</h2>
						<p class="text-muted-foreground mb-3">We collect and process personal information as described in our Privacy Policy, which is incorporated by reference into these Terms. By using the Application, you consent to our collection, use, and disclosure of your information as described in our Privacy Policy.</p>
						<p class="text-muted-foreground mb-3">The information we collect includes but is not limited to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Account information (username, email address, age)</li>
							<li>Habit tracking data (habit titles, descriptions, completion dates)</li>
							<li>User preferences and settings</li>
							<li>Usage statistics and analytics</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							6. User Content
						</h2>
						<p class="text-muted-foreground mb-3">You retain ownership of any content you submit, post, or display on or through the Application ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, adapt, publish, translate, and distribute your User Content in connection with the Application.</p>
						<p class="text-muted-foreground mb-3">You represent and warrant that:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>You own or have the necessary rights to your User Content</li>
							<li>Your User Content does not violate any third-party rights</li>
							<li>Your User Content complies with these Terms</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							7. Prohibited Activities
						</h2>
						<p class="text-muted-foreground mb-3">You agree not to engage in any of the following prohibited activities:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Using the Application for any illegal purpose</li>
							<li>Interfering with or disrupting the Application or servers</li>
							<li>Attempting to gain unauthorized access to the Application</li>
							<li>Using automated scripts or bots to access the Application</li>
							<li>Harvesting or collecting information from the Application</li>
							<li>Impersonating any person or entity</li>
							<li>Uploading or transmitting viruses or other malicious code</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							8. Intellectual Property
						</h2>
						<p class="text-muted-foreground">The Application and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. These Terms do not grant you any rights to use our trademarks, logos, or other brand features.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							9. Termination
						</h2>
						<p class="text-muted-foreground mb-3">We may terminate or suspend your account and access to the Application immediately, without prior notice, for any reason, including but not limited to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Breach of these Terms</li>
							<li>Violation of applicable laws</li>
							<li>At our sole discretion</li>
						</ul>
						<p class="text-muted-foreground mt-3">Upon termination, your right to use the Application will immediately cease.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							10. Disclaimer of Warranties
						</h2>
						<p class="text-muted-foreground mb-3">The Application is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, including but not limited to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Warranties of merchantability or fitness for a particular purpose</li>
							<li>That the Application will be uninterrupted, secure, or error-free</li>
							<li>That defects will be corrected</li>
							<li>That the Application is free of viruses or other harmful components</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							11. Limitation of Liability
						</h2>
						<p class="text-muted-foreground mb-3">To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Loss of profits, data, or business opportunities</li>
							<li>Interruption of business</li>
							<li>Personal injury or property damage</li>
							<li>Any other losses arising from your use of the Application</li>
						</ul>
						<p class="text-muted-foreground mt-3">Our total liability for any claims arising out of or related to these Terms or the Application shall not exceed the amount you have paid to us in the past twelve months.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							12. Indemnification
						</h2>
						<p class="text-muted-foreground mb-3">You agree to indemnify, defend, and hold harmless us and our affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with:</p>
						<ul class="list-disc list-inside space-y-2 text-muted-foreground ml-4">
							<li>Your access to or use of the Application</li>
							<li>Your violation of these Terms</li>
							<li>Your User Content</li>
							<li>Your violation of any rights of another</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							13. Changes to Terms
						</h2>
						<p class="text-muted-foreground">We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Application after such changes constitutes your acceptance of the new Terms.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							14. Governing Law
						</h2>
						<p class="text-muted-foreground">These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the federal or state courts located in Illinois, and you hereby consent to the personal jurisdiction and venue therein.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							15. Contact Information
						</h2>
						<p class="text-muted-foreground mb-3">If you have any questions about these Terms, please contact us at:</p>
						<div class="bg-muted/50 p-4 rounded-lg">
							<p class="font-medium">Email: <span class="text-primary">support@creaturesofhabit.com</span></p>
						</div>
					</section>
				</div>
			</CardContent>
		</Card>

		<div class="text-center text-sm text-muted-foreground mt-8">
			<p>By using Creatures of Habit, you acknowledge that you have read and understood these Terms of Service.</p>
		</div>
	</div>
</div>