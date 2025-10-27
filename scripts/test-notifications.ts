/**
 * Manual test script for notification API endpoint
 * Tests against a RUNNING development server
 *
 * Usage:
 * pnpm test:notifications <session-cookie>
 * OR
 * npx tsx scripts/test-notifications.ts <session-cookie>
 *
 * To get your session cookie:
 * 1. Start dev server: pnpm dev
 * 2. Log in at http://localhost:5175
 * 3. Open DevTools (F12) > Application > Cookies
 * 4. Copy the 'auth-session' cookie value
 */

const BASE_URL = 'http://localhost:5175';

async function testNotification(sessionCookie: string, type: string, subject: string, message: string) {
    console.log(`\nTesting ${type} notification...`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-session=${sessionCookie}`
            },
            body: JSON.stringify({ type, subject, message })
        });

        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        if (response.ok) {
            console.log('   Success:', data);
        } else {
            console.log('   Failed:', data);
        }
        
        return { status: response.status, data };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error:', errorMessage);
        return null;
    }
}

async function runTests() {
    const sessionCookie = process.argv[2];
    
    if (!sessionCookie) {
        console.error('\nError: Session cookie required\n');
        console.log('Usage:');
        console.log(' pnpm test:notifications <session-cookie>');
        console.log(' OR');
        console.log(' npx tsx scripts/test-notifications.ts <session-cookie>\n');
        console.log('To get your session cookie:');
        console.log('  1. Start dev server: pnpm dev');
        console.log('  2. Log in at http://localhost:5175');
        console.log('  3. Open DevTools (F12) > Application > Cookies');
        console.log('  4. Copy the "auth-session" cookie value\n');
        process.exit(1);
    }

    console.log('\nStarting notification API tests...');
    console.log('Base URL:', BASE_URL);
    console.log('Session:', sessionCookie.substring(0, 20) + '...\n');
    
    console.log('═'.repeat(60));
    console.log('Test 1: Email Notification');
    console.log('Expected: Success if email notifications enabled in settings');
    await testNotification(
        sessionCookie,
        'email',
        'Test Email from Creatures of Habit',
        '<h1>Hello!</h1><p>This is a test email notification.</p><p>If you receive this, your notification system is working!</p>'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('Test 2: Reminder Notification');
    console.log('Expected: Success (reminders default to enabled)');
    await testNotification(
        sessionCookie,
        'reminder',
        'Habit Reminder',
        '<h2>Don\'t forget!</h2><p>Complete your daily habits to keep your streak alive.</p>'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('Test 3: Push Notification');
    console.log('Expected: Fail with "not yet implemented" message');
    await testNotification(
        sessionCookie,
        'push',
        'Test Push',
        'This should fail gracefully'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('Test 4: Invalid Notification Type');
    console.log('Expected: 400 error with validation message');
    await testNotification(
        sessionCookie,
        'invalid-type',
        'Test Invalid',
        'This should fail validation'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('Test 5: Missing Required Fields');
    console.log('Expected: 400 error for missing fields');
    
    try {
        const response = await fetch(`${BASE_URL}/api/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-session=${sessionCookie}`
            },
            body: JSON.stringify({ type: 'email' })
        });
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log('   Failed:', data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error:', errorMessage);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('All tests complete!\n');
    console.log('Tips:');
    console.log('  - Check /settings to toggle email notifications');
    console.log('  - Check your email if Resend is configured');
    console.log('  - Check server logs for detailed output\n');
}

runTests();