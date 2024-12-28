<script lang="ts">
    import RegistrationWizard from '../../lib/components/RegistrationWizard.svelte';
    import type { RegistrationData } from '../../lib/types'
    import { goto } from '$app/navigation';

    async function handleComplete(data: RegistrationData) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Registration response status:', response.status);
            const responseData = await response.json();
            console.log('Registration response:', responseData);
            
            if (response.ok) {
                await goto('/dashboard');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
        }
    }

    
</script>

<div class="container mx-auto p-4">
    <RegistrationWizard onComplete={handleComplete} />
</div>




