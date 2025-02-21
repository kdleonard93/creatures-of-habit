import posthog from 'posthog-js'
import 'dotenv/config';
import { browser } from '$app/environment';
import { beforeNavigate, afterNavigate } from '$app/navigation';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';
console.log('PostHog file loaded here!!!');
export const initPostHog = () => {
    try {
      if (browser) { 
        console.log('🔍 PostHog: Initializing with key:', PUBLIC_POSTHOG_KEY);
        
        posthog.init(PUBLIC_POSTHOG_KEY, {
          api_host: 'https://us.i.posthog.com',
          capture_pageview: true,  
          capture_pageleave: true,
          loaded: (posthog) => {
            console.log('🎉 PostHog: Loaded successfully');
            
            posthog.identify(
              'anonymous_user', 
              { 
                environment: import.meta.env.MODE,
                timestamp: new Date().toISOString()
              }
            );

            // Initial page load event
            posthog.capture('app_loaded', {
              path: window.location.pathname,
              environment: import.meta.env.MODE
            });

            if (import.meta.env.MODE === 'development') {
              posthog.debug();
            }
          },
          debug: import.meta.env.MODE === 'development'
        });

        beforeNavigate((navigation) => {
          try {
            console.log('🚪 PostHog: Page Leave', navigation);
            posthog.capture('$pageleave', {
              from: navigation.from?.route.id,
              to: navigation.to?.route.id
            });
          } catch (error) {
            console.error('❌ PostHog Error in beforeNavigate:', error);
          }
        });

        afterNavigate((navigation) => {
          try {
            console.log('🔍 PostHog: Page View', navigation);
            posthog.capture('$pageview', {
              path: window.location.pathname,
              route: navigation.to?.route.id
            });
          } catch (error) {
            console.error('❌ PostHog Error in afterNavigate:', error);
          }
        });

        // PostHog Health Check
        window.addEventListener('load', () => {
          setTimeout(() => {
            try {
              posthog.capture('health_check', {
                timestamp: new Date().toISOString()
              });
              console.log('✅ PostHog: Health check event sent');
            } catch (error) {
              console.error('❌ PostHog Health Check Failed:', error);
            }
          }, 5000);
        });
      } else {
        console.log('❌ PostHog not initialized - not in browser context');
      }
    } catch (error) {
      console.error('❌ Error initializing PostHog:', error);
    }
  };
  
export default posthog;