# Umami Helper

A lightweight helper library for [Umami Analytics](https://umami.is) that provides advanced tracking capabilities with minimal configuration.

---

## Features

- 📊 **Form Submission Tracking**  
  Automatically tracks form submissions on your website.
- 📜 **Scroll Depth Tracking**  
  Monitors how far users scroll down your pages.
- 🔄 **Typeform Integration**  
  Tracks submission events from embedded Typeforms.
- 📅 **Calendly Event Tracking**  
  Tracks meetings scheduled through Calendly.
- 💼 **HubSpot Form Tracking**  
  Tracks HubSpot form submissions and meeting bookings.
- ⚡ **Lightweight and Performant**  
  Designed to have a minimal impact on your website's performance.
- 🎯 **Configurable Options**  
  Easily enable, disable, or customize specific trackers.

---

## Quick Start

1. Add the following scripts to your HTML:

```html
<!-- Core script -->
<script
	defer
	src="https://your-umami-script-src.js"></script>

<!-- umami-helper script -->
<script
	defer
	src="https://cdn.jsdelivr.net/gh/vierless/umami-helper@latest/umami-helper.js"></script>
```

2. That's it! All tracking features (except scroll) are enabled by default.

---

## Configuration

Most features are enabled by default. You can use a custom configuration with options to:

- Disable specific trackers
- Change default event names
- Modify tracking thresholds

Just call the script containing the custom config right after the umami-helper script.

### Example Configuration

```javascript
UmamiHelper.init({
	debug: true, // Enable debug logging
	tracking: {
		typeform: { enabled: false }, // Disable Typeform tracking
		hubspot: { enabled: false }, // Disable HubSpot tracking
		scroll: {
			enabled: true, // Enable Scroll-Depth tracking
			thresholds: [20, 50, 80], // Custom scroll depth thresholds
			eventName: 'custom_scroll_event', // Custom event name for scroll tracking
		},
	},
});
```

---

## Available Trackers

### Form Tracking

Automatically tracks form submissions on your website.

```javascript
tracking: {
  forms: {
    enabled: true,
    eventName: 'form_submit' // Default event name
  }
}
```

### Scroll Tracking

Tracks how far users scroll down your pages. We disabled this by default to prevent event spamming to Umami. If you want to use it, you need to use a custom config like explained above.

```javascript
tracking: {
  scroll: {
    enabled: true,
    thresholds: [25, 50, 75], // Default thresholds
    eventName: 'scroll_depth'
  }
}
```

### Typeform Integration

Tracks Typeform submission events.

```javascript
tracking: {
  typeform: {
    enabled: true,
    eventName: 'typeform_submit'
  }
}
```

### Calendly Integration

Tracks when users schedule meetings through Calendly.

```javascript
tracking: {
  calendly: {
    enabled: true,
    eventName: 'calendly_submit'
  }
}
```

### HubSpot Integration

Tracks HubSpot meeting bookings.

```javascript
tracking: {
  hubspot: {
    enabled: true,
    eventName: 'hubspot_submit'
  }
}
```

### Outbound Links

Tracks clicks on outbound links.

```javascript
tracking: {
  outbound: {
    enabled: true,
    eventName: 'outbound_link'
  }
}
```

### Contact Links

Tracks clicks on phone (tel:) and mail (mailto:) links.

```javascript
tracking: {
  contactLinks: {
    enabled: true,
    eventName: {
      phone: 'phone_link',
      email: 'email_link',
    },
  },
}
```

---

## Event Properties

Each tracker sends specific properties with its events:

### Form Events

- **`form_name`**: The `name` attribute of the form
- **`form_id`**: The `id` of the form
- **`timestamp`**: ISO timestamp of the event

### Scroll Events

- **`percentage`**: Scroll depth percentage
- **`url`**: Current page path
- **`timestamp`**: ISO timestamp

### Typeform Events

- **`form_name`**: Typeform `title`
- **`form_id`**: Typeform `id`
- **`response_id`**: Typeform response `id`
- **`timestamp`**: ISO timestamp

### Calendly Events

- **`form_url`**: The `link` to the related Calendly
- **`event_id`**: The `id` of the booked event
- **`invitee_id`**: The `id` of the invitee who booked the event
- **`timestamp`**: ISO timestamp

### HubSpot Events

- **`organizer`**: The `name` of the event organizer
- **`meeting_date`**: The `date` of the booked meeting
- **`meeting_start`**: ISO timestamp of meeting `start date`
- **`meeting_end`**: ISO timestamp of meeting `end date`
- **`meeting_duration`**: Meeting `duration` in milliseconds
- **`timestamp`**: ISO timestamp

### Outbound Link Events

- **`url`**: The `url` of the clicked link
- **`timestamp`**: ISO timestamp

### Contact Link Events

- **`number`**: The `number` of the clicked tel: link
- **`email`**: The `email` of the clicked mailto: link
- **`timestamp`**: ISO timestamp

---

## Contributing

Contributions are welcome! Feel free to fork the repository, make changes, and submit a pull request.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Links

- **Umami Analytics**: [umami.is](https://umami.is)
- **CDN Source**: [jsdelivr.net](https://www.jsdelivr.com/)
- **Author**: [VIERLESS GmbH](https://vierless.de/)
