<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Label } from "$lib/components/ui/label";
    import { toast } from 'svelte-sonner';
    import type {ContactFormData} from "$lib/types";

    // Initialize form data with the proper type
    let formData = $state<ContactFormData>({name: '', email: '', message: ''});

    const { form } = $props<{ form?: { success?: boolean; error?: boolean; message?: string } }>();
    let isSubmitting = $state(false);

    $effect(() => {
        if (form?.success) {
            toast.success(form.message || 'Message sent successfully!');
        } else if (form?.error) {
            toast.error(form.message || 'Failed to send message.');
        }
    });

</script>

<div class="container mx-auto py-8 max-w-md">
    <Card>
        <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>Send us a message and we'll get back to you as soon as possible.</CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST"
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            const form = document.querySelector('form');
                            if (form) form.reset();
                        }
                    };
                }} class="space-y-4">
                <div class="space-y-2">
                    <Label for="name">Name</Label>
                    <Input type="text" id="name" name="name" bind:value={formData.name} required />
                </div>
                
                <div class="space-y-2">
                    <Label for="email">Email</Label>
                    <Input type="email" id="email" name="email" bind:value={formData.email} required />
                </div>

                <div class="space-y-2">
                    <Label for="message">Message</Label>
                    <textarea 
                        id="message" 
                        name="message" 
                        bind:value={formData.message}
                        required
                        class="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    ></textarea>
                </div>

                <Button type="submit" class="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
            </form>
        </CardContent>
    </Card>
</div>