<script lang="ts">
    import RegistrationWizard from '../../lib/components/RegistrationWizard.svelte';
    import type { RegistrationData } from '../../lib/types'

    function handleComplete(data: RegistrationData): void {
        console.log('Registration complete:', data);
    }

    
</script>

<RegistrationWizard onComplete={handleComplete}/>