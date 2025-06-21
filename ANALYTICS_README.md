# Portfolio Analytics Implementation

This document describes the custom Amplitude analytics implementation for Fayyaz Mukarram's portfolio website.

## Overview

The portfolio website now includes comprehensive custom event tracking using Amplitude Analytics. The implementation provides detailed insights into user behavior, engagement patterns, and content performance.

## Implementation Details

### Files Added/Modified

1. **`js/analytics.js`** - Main analytics implementation file
2. **All HTML pages** - Updated to include the analytics script
3. **`test-analytics.html`** - Test page for verifying analytics functionality

### Analytics Script Integration

The analytics script is loaded after Amplitude initialization on all pages:

```html
<script src="js/analytics.js"></script> <!-- Custom Analytics -->
```

## Tracked Events

### 1. Page Views
- **Event Name**: `Page Viewed`
- **Properties**:
  - `page_name`: Document title
  - `page_path`: URL path
  - `page_url`: Full URL
  - `referrer`: Referrer URL or 'direct'
  - `user_agent`: Browser user agent
  - `screen_resolution`: Screen dimensions
  - `viewport_size`: Viewport dimensions

### 2. Project Interactions
- **Event Name**: `Project Clicked`
- **Properties**:
  - `project_name`: Name of the project
  - `project_category`: Category (Product Design, Enterprise, iOS Design, etc.)
  - `source_page`: Page where click occurred
  - `click_position`: Position in project grid

### 3. Social Media Engagement
- **Event Name**: `Social Link Clicked`
- **Properties**:
  - `platform`: Social platform (instagram, linkedin, twitter)
  - `source_page`: Page where click occurred

### 4. Contact Interactions
- **Event Name**: `Contact Interaction`
- **Properties**:
  - `interaction_type`: Type of interaction (email_click)
  - `source_page`: Page where interaction occurred

### 5. Navigation
- **Event Name**: `Navigation Clicked`
- **Properties**:
  - `destination`: Navigation destination (home, photography, projects, contact)
  - `source_page`: Page where navigation occurred

### 6. Video Interactions
- **Event Name**: `Video Interaction`
- **Properties**:
  - `interaction_type`: Video action (play, pause, ended)
  - `video_name`: Name of the video file
  - `source_page`: Page where video is located

### 7. Scroll Depth
- **Event Name**: `Scroll Depth Reached`
- **Properties**:
  - `scroll_percentage`: Scroll percentage (25, 50, 75, 100)
  - `source_page`: Page where scroll occurred

### 8. Page Exit
- **Event Name**: `Page Exit`
- **Properties**:
  - `time_on_page_seconds`: Time spent on page
  - `source_page`: Page that was exited

## Project Categories

The analytics automatically categorizes projects based on URL patterns:

- **Product Design**: Chorus-related projects
- **Enterprise**: Agrity project
- **Internal Tools**: Quick Polls project
- **iOS Design**: Blue Bear project
- **Mobile Design**: Mobile redesign projects

## Manual Event Tracking

The analytics system exposes a global `PortfolioAnalytics` object for manual event tracking:

```javascript
// Track custom events
window.PortfolioAnalytics.trackEvent('Custom Event Name', {
    property1: 'value1',
    property2: 'value2'
});

// Track specific interactions
window.PortfolioAnalytics.trackProjectClick('Project Name', 'Category');
window.PortfolioAnalytics.trackSocialClick('platform');
window.PortfolioAnalytics.trackContactInteraction('interaction_type');
window.PortfolioAnalytics.trackNavigation('destination');
window.PortfolioAnalytics.trackVideoInteraction('interaction_type', 'video_name');
```

## Testing

### Test Page
Use `test-analytics.html` to verify all analytics functionality:

1. Open the test page in a browser
2. Open browser console (F12)
3. Interact with various elements
4. Check console for event logs
5. Verify events appear in Amplitude dashboard

### Manual Testing
```javascript
// Test manual event tracking
window.PortfolioAnalytics.trackEvent('Test Event', {
    test_property: 'test_value'
});
```

## Amplitude Dashboard Insights

With this implementation, you can now track:

### User Journey Analysis
- How users navigate through your portfolio
- Which projects receive the most attention
- Entry and exit points
- Time spent on different sections

### Content Performance
- Most viewed projects
- Video engagement rates
- Social media link performance
- Contact interaction rates

### User Behavior
- Scroll depth patterns
- Navigation preferences
- Device and browser usage
- Referrer sources

### Engagement Metrics
- Session duration
- Page view depth
- Interaction rates
- Conversion funnels

## Configuration

### Amplitude Setup
- **API Key**: `1ce437130da0f6268eb2efbf0375ee14`
- **Session Replay**: Enabled with 100% sample rate
- **Autocapture**: Enabled for element interactions
- **Experiment SDK**: Included for A/B testing capabilities

### Customization
To modify tracking behavior, edit `js/analytics.js`:

1. **Add new event types**: Create new tracking functions
2. **Modify properties**: Update event property collection
3. **Change thresholds**: Adjust scroll depth percentages
4. **Add new categories**: Update project categorization logic

## Best Practices

1. **Privacy**: No personally identifiable information is collected
2. **Performance**: Analytics script is loaded asynchronously
3. **Error Handling**: Graceful fallbacks if Amplitude fails to load
4. **Debugging**: Console logging for development
5. **Maintenance**: Modular code structure for easy updates

## Troubleshooting

### Common Issues

1. **Events not appearing in Amplitude**
   - Check browser console for errors
   - Verify API key is correct
   - Ensure Amplitude SDK loads before analytics script

2. **Duplicate events**
   - Check for multiple script inclusions
   - Verify event listener registration

3. **Missing properties**
   - Check DOM structure matches selectors
   - Verify element classes and IDs

### Debug Mode
Enable debug logging by checking browser console for:
- `Amplitude Event: [Event Name] [Properties]`
- `PortfolioAnalytics loaded successfully`

## Future Enhancements

Potential improvements for the analytics system:

1. **Conversion Tracking**: Track specific user goals
2. **A/B Testing**: Implement experiment tracking
3. **Advanced Segmentation**: User behavior cohorts
4. **Performance Monitoring**: Page load time tracking
5. **Error Tracking**: JavaScript error monitoring
6. **Heatmap Integration**: Visual user behavior analysis

## Support

For questions or issues with the analytics implementation:

1. Check the browser console for error messages
2. Verify Amplitude dashboard configuration
3. Test with the provided test page
4. Review this documentation for configuration details

---

*Last updated: [Current Date]*
*Analytics Implementation Version: 1.0* 