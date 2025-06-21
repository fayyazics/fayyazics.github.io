// Portfolio Analytics - Custom Event Tracking
(function() {
    'use strict';

    // Wait for Amplitude to be ready
    function waitForAmplitude(callback) {
        if (window.amplitude) {
            callback();
        } else {
            setTimeout(function() {
                waitForAmplitude(callback);
            }, 100);
        }
    }

    // Helper function to track events
    function trackEvent(eventName, eventProperties) {
        waitForAmplitude(function() {
            if (window.amplitude && window.amplitude.track) {
                window.amplitude.track(eventName, eventProperties);
                console.log('Amplitude Event:', eventName, eventProperties);
            }
        });
    }

    // Page view tracking
    function trackPageView() {
        const pageName = document.title || 'Unknown Page';
        const currentPath = window.location.pathname;
        
        trackEvent('Page Viewed', {
            page_name: pageName,
            page_path: currentPath,
            page_url: window.location.href,
            referrer: document.referrer || 'direct',
            user_agent: navigator.userAgent,
            screen_resolution: screen.width + 'x' + screen.height,
            viewport_size: window.innerWidth + 'x' + window.innerHeight
        });
    }

    // Project click tracking
    function trackProjectClick(projectName, projectCategory) {
        trackEvent('Project Clicked', {
            project_name: projectName,
            project_category: projectCategory,
            source_page: document.title,
            click_position: 'project_grid'
        });
    }

    // Social media link tracking
    function trackSocialClick(platform) {
        trackEvent('Social Link Clicked', {
            platform: platform,
            source_page: document.title
        });
    }

    // Contact interaction tracking
    function trackContactInteraction(interactionType) {
        trackEvent('Contact Interaction', {
            interaction_type: interactionType,
            source_page: document.title
        });
    }

    // Navigation tracking
    function trackNavigation(destination) {
        trackEvent('Navigation Clicked', {
            destination: destination,
            source_page: document.title
        });
    }

    // Video interaction tracking
    function trackVideoInteraction(interactionType, videoName) {
        trackEvent('Video Interaction', {
            interaction_type: interactionType,
            video_name: videoName,
            source_page: document.title
        });
    }

    // Scroll depth tracking
    function trackScrollDepth() {
        let maxScroll = 0;
        let scrollTracked = false;

        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                // Track at 25%, 50%, 75%, and 100%
                if (!scrollTracked && maxScroll >= 25) {
                    trackEvent('Scroll Depth Reached', {
                        scroll_percentage: 25,
                        source_page: document.title
                    });
                    scrollTracked = true;
                } else if (scrollTracked && maxScroll >= 50) {
                    trackEvent('Scroll Depth Reached', {
                        scroll_percentage: 50,
                        source_page: document.title
                    });
                    scrollTracked = false;
                } else if (!scrollTracked && maxScroll >= 75) {
                    trackEvent('Scroll Depth Reached', {
                        scroll_percentage: 75,
                        source_page: document.title
                    });
                    scrollTracked = true;
                } else if (scrollTracked && maxScroll >= 100) {
                    trackEvent('Scroll Depth Reached', {
                        scroll_percentage: 100,
                        source_page: document.title
                    });
                    scrollTracked = false;
                }
            }
        });
    }

    // Time on page tracking
    function trackTimeOnPage() {
        const startTime = Date.now();
        
        window.addEventListener('beforeunload', function() {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000);
            trackEvent('Page Exit', {
                time_on_page_seconds: timeOnPage,
                source_page: document.title
            });
        });
    }

    // Initialize tracking when DOM is ready
    function initializeTracking() {
        // Track initial page view
        trackPageView();
        
        // Track scroll depth
        trackScrollDepth();
        
        // Track time on page
        trackTimeOnPage();

        // Project click tracking
        document.addEventListener('click', function(e) {
            const projectLink = e.target.closest('a[href*="/"]');
            if (projectLink) {
                const href = projectLink.getAttribute('href');
                const projectTitle = projectLink.querySelector('.project-title');
                
                if (projectTitle) {
                    const projectName = projectTitle.textContent.trim();
                    let projectCategory = 'Other';
                    
                    // Determine project category based on URL or content
                    if (href.includes('chorus')) {
                        projectCategory = 'Product Design';
                    } else if (href.includes('agrity')) {
                        projectCategory = 'Enterprise';
                    } else if (href.includes('quickpolls')) {
                        projectCategory = 'Internal Tools';
                    } else if (href.includes('bluebear')) {
                        projectCategory = 'iOS Design';
                    } else if (href.includes('mobileredesign')) {
                        projectCategory = 'Mobile Design';
                    }
                    
                    trackProjectClick(projectName, projectCategory);
                }
            }
        });

        // Social media link tracking
        document.addEventListener('click', function(e) {
            const socialLink = e.target.closest('a[href*="instagram"], a[href*="linkedin"], a[href*="twitter"]');
            if (socialLink) {
                const href = socialLink.getAttribute('href');
                let platform = 'other';
                
                if (href.includes('instagram')) platform = 'instagram';
                else if (href.includes('linkedin')) platform = 'linkedin';
                else if (href.includes('twitter')) platform = 'twitter';
                
                trackSocialClick(platform);
            }
        });

        // Contact interaction tracking
        document.addEventListener('click', function(e) {
            if (e.target.matches('a[href*="mailto:"]')) {
                trackContactInteraction('email_click');
            }
        });

        // Navigation tracking
        document.addEventListener('click', function(e) {
            const navLink = e.target.closest('nav a, .cd-logo a');
            if (navLink) {
                const href = navLink.getAttribute('href');
                let destination = 'other';
                
                if (href.includes('photography')) destination = 'photography';
                else if (href.includes('projects')) destination = 'projects';
                else if (href.includes('contact')) destination = 'contact';
                else if (href.includes('index.html') || href === '/') destination = 'home';
                
                trackNavigation(destination);
            }
        });

        // Video interaction tracking
        document.addEventListener('click', function(e) {
            const video = e.target.closest('video');
            if (video) {
                const videoSrc = video.querySelector('source')?.getAttribute('src') || 'unknown';
                const videoName = videoSrc.split('/').pop().replace('.mp4', '');
                
                if (video.paused) {
                    trackVideoInteraction('play', videoName);
                } else {
                    trackVideoInteraction('pause', videoName);
                }
            }
        });

        // Track video events
        document.addEventListener('play', function(e) {
            if (e.target.tagName === 'VIDEO') {
                const videoSrc = e.target.querySelector('source')?.getAttribute('src') || 'unknown';
                const videoName = videoSrc.split('/').pop().replace('.mp4', '');
                trackVideoInteraction('play', videoName);
            }
        }, true);

        document.addEventListener('pause', function(e) {
            if (e.target.tagName === 'VIDEO') {
                const videoSrc = e.target.querySelector('source')?.getAttribute('src') || 'unknown';
                const videoName = videoSrc.split('/').pop().replace('.mp4', '');
                trackVideoInteraction('pause', videoName);
            }
        }, true);

        document.addEventListener('ended', function(e) {
            if (e.target.tagName === 'VIDEO') {
                const videoSrc = e.target.querySelector('source')?.getAttribute('src') || 'unknown';
                const videoName = videoSrc.split('/').pop().replace('.mp4', '');
                trackVideoInteraction('ended', videoName);
            }
        }, true);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTracking);
    } else {
        initializeTracking();
    }

    // Expose tracking functions globally for manual tracking
    window.PortfolioAnalytics = {
        trackEvent: trackEvent,
        trackProjectClick: trackProjectClick,
        trackSocialClick: trackSocialClick,
        trackContactInteraction: trackContactInteraction,
        trackNavigation: trackNavigation,
        trackVideoInteraction: trackVideoInteraction
    };

})(); 