<script lang="ts">
    const props = $props<{ password: string }>();
    
    interface Requirement {
        regex: RegExp;
        text: string;
    }

    const requirements: Requirement[] = [
        { regex: /.{6,}/, text: 'At least 6 characters long' },
        { regex: /[A-Z]/, text: 'Contains uppercase letter' },
        { regex: /[a-z]/, text: 'Contains lowercase letter' },
        { regex: /[0-9]/, text: 'Contains number' },
        { regex: /[^A-Za-z0-9]/, text: 'Contains special character' }
    ];

    type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';
    const strengthLevels: StrengthLevel[] = ['weak', 'fair', 'good', 'strong'];

    let passwordStrength = $state<StrengthLevel>('weak');

    $effect(() => {
        const passedRequirements = requirements.filter(req => 
            req.regex.test(props.password)
        ).length;

        passwordStrength = strengthLevels[Math.floor((passedRequirements / requirements.length) * 3)];
    });
</script>

<div class="mt-2 space-y-2">
    <div class="flex gap-1">
        {#each Array(4) as _, i}
            <div 
                class="h-1.5 flex-1 rounded-full transition-all duration-300"
                class:bg-red-500={passwordStrength === 'weak' && i === 0}
                class:bg-primary-500={passwordStrength === 'fair' && i <= 1}
                class:bg-blue-500={passwordStrength === 'good' && i <= 2}
                class:bg-green-500={passwordStrength === 'strong' && i <= 3}
                class:bg-gray-200={
                    (passwordStrength === 'weak' && i > 0) ||
                    (passwordStrength === 'fair' && i > 1) ||
                    (passwordStrength === 'good' && i > 2)
                }
            ></div>
        {/each}
    </div>
    <div class="text-xs space-y-1">
        {#each requirements as req}
            <div 
                class="flex items-center gap-1"
                class:text-green-600={req.regex.test(props.password)}
                class:text-gray-500={!req.regex.test(props.password)}
            >
                {#if req.regex.test(props.password)}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                {/if}
                {req.text}
            </div>
        {/each}
    </div>
</div>