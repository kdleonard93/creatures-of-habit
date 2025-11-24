<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Mail, RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';
	
	let { data } = $props();
	let resending = $state(false);
	let message = $state('');
	let checkingVerification = $state(false);
	
	async function resendEmail() {
		resending = true;
		message = '';
		
		try {
			const response = await fetch('/api/resend-verification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: data.user.email })
			});
			
			const result = await response.json();
			
			if (result.success) {
				message = 'Verification email sent! Check your inbox.';
			} else {
				message = 'Failed to send email. Please try again later.';
			}
		} catch (error) {
			message = 'An error occurred. Please try again.';
		} finally {
			resending = false;
		}
	}
	
	async function checkVerification() {
		checkingVerification = true;
		try {
			// Refresh the page to check verification status
			window.location.reload();
		} catch (error) {
			checkingVerification = false;
		}
	}
	
	// Auto-check verification status every 5 seconds
	onMount(() => {
		const interval = setInterval(async () => {
			const response = await fetch('/api/check-verification-status');
			const result = await response.json();
			
			if (result.verified) {
				window.location.href = '/dashboard';
			}
		}, 5000);
		
		return () => clearInterval(interval);
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-background p-4">
	<div class="max-w-md w-full bg-card rounded-lg border border-border shadow-lg p-8">
		<!-- Icon -->
		<div class="flex justify-center mb-6">
			<div class="bg-primary rounded-full p-4">
				<Mail class="w-12 h-12 text-primary-foreground" />
			</div>
		</div>
		
		<!-- Title -->
		<h1 class="text-3xl font-bold text-center mb-4 text-foreground">
			Verify Your Email
		</h1>
		
		<!-- Message -->
		<div class="text-center space-y-4 mb-8">
			<p class="text-muted-foreground">
				Welcome, <span class="font-semibold text-primary">{data.user.username}</span>!
			</p>
			<p class="text-muted-foreground">
				We've sent a verification email to:
			</p>
			<p class="font-semibold text-foreground">
				{data.user.email}
			</p>
			<p class="text-sm text-muted-foreground">
				Click the link in the email to activate your account and start your journey!
			</p>
		</div>
		
		<!-- Info Box -->
		<div class="bg-muted border border-border rounded-lg p-4 mb-6">
			<p class="text-sm text-foreground">
				<strong>📬 Check your inbox</strong><br/>
				The verification link expires in 24 hours. Don't forget to check your spam folder!
			</p>
		</div>
		
		<!-- Status Message -->
		{#if message}
			<div class="mb-4 p-3 rounded-lg {message.includes('sent') ? 'bg-success/10 text-success border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}">
				<p class="text-sm">{message}</p>
			</div>
		{/if}
		
		<!-- Actions -->
		<div class="space-y-3">
			<Button 
				onclick={checkVerification}
				disabled={checkingVerification}
				class="w-full"
			>
				{#if checkingVerification}
					<RefreshCw class="w-4 h-4 mr-2 animate-spin" />
					Checking...
				{:else}
					<RefreshCw class="w-4 h-4 mr-2" />
					I've Verified My Email
				{/if}
			</Button>
			
			<Button 
				onclick={resendEmail}
				disabled={resending}
				variant="outline"
				class="w-full"
			>
				{#if resending}
					<RefreshCw class="w-4 h-4 mr-2 animate-spin" />
					Sending...
				{:else}
					<Mail class="w-4 h-4 mr-2" />
					Resend Verification Email
				{/if}
			</Button>
		</div>
		
		<!-- Footer -->
		<div class="mt-8 pt-6 border-t border-border text-center">
			<p class="text-sm text-muted-foreground">
				Need help? <a href="/contact" class="text-primary hover:text-primary/80 font-medium">Contact Support</a>
			</p>
		</div>
	</div>
</div>
