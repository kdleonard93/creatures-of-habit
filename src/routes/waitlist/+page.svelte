<script lang="ts">
    import WaitlistLanding from '$lib/components/WaitlistLanding.svelte';
    import type { WaitlistData } from '$lib/types';

    export let data: WaitlistData
</script>

<WaitlistLanding data={data}/>
