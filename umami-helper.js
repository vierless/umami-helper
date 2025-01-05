// Umami Analytics Helper Functions
(function (window) {
	'use strict';

	// Configuration
	const config = {
		debug: true,
		retryAttempts: 3,
		retryDelay: 1000,
		defaultFormEvent: 'form_submit',
		defaultTypeformEvent: 'typeform_submit',
		defaultCalendlyEvent: 'calendly_submit',
		defaultHubspotEvent: 'hubspot_submit',
	};

	// Main analytics wrapper
	class UmamiHelper {
		constructor(options = {}) {
			this.config = { ...config, ...options };
			this.initialized = false;
			this.eventQueue = [];
			this.init();
		}

		// Initialize the helper
		init() {
			if (this.checkUmamiAvailable()) {
				this.initialized = true;
				this.processEventQueue();
				this.setupEventListeners();
			} else {
				this.waitForUmami();
			}
		}

		// Check if Umami is available
		checkUmamiAvailable() {
			return typeof window.umami !== 'undefined';
		}

		// Wait for Umami to become available
		waitForUmami() {
			const maxAttempts = this.config.retryAttempts;
			let attempts = 0;

			const checkInterval = setInterval(() => {
				attempts++;
				if (this.checkUmamiAvailable()) {
					clearInterval(checkInterval);
					this.initialized = true;
					this.processEventQueue();
					this.setupEventListeners();
				} else if (attempts >= maxAttempts) {
					clearInterval(checkInterval);
					this.logDebug('Failed to initialize Umami after ' + maxAttempts + ' attempts');
				}
			}, this.config.retryDelay);
		}

		// Process queued events
		processEventQueue() {
			while (this.eventQueue.length > 0) {
				const { event, properties } = this.eventQueue.shift();
				this.logEvent(event, properties);
			}
		}

		// Set up event listeners
		setupEventListeners() {
			this.setupFormTracking();
			this.setupTypeformTracking();
			this.setupCalendlyTracking();
			this.setupHubspotTracking();
			// Additional third-party integrations can be added here
		}

		// Form tracking setup
		setupFormTracking() {
			const forms = document.querySelectorAll('form');

			forms.forEach((form) => {
				const formWrapper = form.closest('[data-umami-event]');
				const eventName = this.getUmamiEvent(formWrapper, this.config.defaultFormEvent);

				form.addEventListener('submit', (e) => {
					this.logEvent(eventName, {
						form_name: form.getAttribute('name') || 'None',
						form_id: form.getAttribute('id') || 'None',
					});
				});
			});
		}

		// Typeform tracking setup
		setupTypeformTracking() {
			function isTypeformEvent(e) {
				return e.origin === 'https://form.typeform.com' && e.data;
			}
			window.addEventListener('message', (e) => {
				if (isTypeformEvent(e)) {
					if (e.data.type === 'form-submit') {
						const typeform = document.querySelector(`[data-tf-widget="${e.data.formId}"]`);
						const typeformEmbed = typeform.closest('[data-tf-live]');
						const eventName = this.getUmamiEvent(typeformEmbed, this.config.defaultTypeformEvent);
						const formName = typeform.querySelector('iframe')?.title;

						this.logEvent(eventName, {
							form_name: formName || 'None',
							form_id: e.data.formId || 'None',
							response_id: e.data.responseId || 'None',
						});
					}
				}
			});
		}

		// Calendly tracking setup
		setupCalendlyTracking() {
			function isCalendlyEvent(e) {
				return e.origin === 'https://calendly.com' && e.data.event && e.data.event.indexOf('calendly.') === 0;
			}
			function extractIdFromUrl(url, pattern) {
				const match = url.match(pattern);
				return match ? match[1] : null;
			}
			window.addEventListener('message', (e) => {
				if (isCalendlyEvent(e)) {
					if (e.data.event === 'calendly.event_scheduled') {
						const eventId = extractIdFromUrl(e.data.payload.event.uri, /scheduled_events\/([^/]+)/);
						const inviteeId = extractIdFromUrl(e.data.payload.invitee.uri, /invitees\/([^/]+)/);
						const calendlyEmbed = document.querySelector('[data-url*="https://calendly.com/"]');
						const eventName = this.getUmamiEvent(calendlyEmbed, this.config.defaultCalendlyEvent);

						this.logEvent(eventName, {
							form_url: calendlyEmbed.dataset.url,
							event_id: eventId || 'None',
							invitee_id: inviteeId || 'None',
						});
					}
				}
			});
		}

		// HubSpot tracking setup
		setupHubspotTracking() {
			function isHubspotEvent(e) {
				return e.origin.includes('.hubspot.com') && e.data;
			}
			window.addEventListener('message', (e) => {
				if (isHubspotEvent(e)) {
					if (e.data.meetingBookSucceeded) {
						const hubspotEmbed = document.querySelector('.meetings-iframe-container');
						const eventName = this.getUmamiEvent(hubspotEmbed, this.config.defaultHubspotEvent);
						const organizerName = e.data.meetingsPayload.bookingResponse.postResponse.organizer.name;
						const meetingDate = e.data.meetingsPayload.bookingResponse.event.dateString;
						const meetingStartTime = e.data.meetingsPayload.bookingResponse.postResponse.timerange.start;
						const meetingEndTime = e.data.meetingsPayload.bookingResponse.postResponse.timerange.end;
						const meetingDuration = e.data.meetingsPayload.bookingResponse.event.duration;

						this.logEvent(eventName, {
							organizer: organizerName || 'None',
							meeting_date: meetingDate || 'None',
							meeting_start: meetingStartTime || 'None',
							meeting_end: meetingEndTime || 'None',
							meeting_duration: meetingDuration || 'None',
						});
					}
				}
			});
		}

		// Custom event override
		getUmamiEvent = (element, defaultEvent) => {
			if (element?.dataset?.umamiEvent) {
				return element.dataset.umamiEvent;
			}
			return defaultEvent;
		};

		// Main event logging function
		logEvent(event, properties = {}) {
			if (!this.initialized) {
				this.eventQueue.push({ event, properties });
				return;
			}

			try {
				// Sanitize event name
				const sanitizedEvent = this.sanitizeEventName(event);

				// Enhance properties with additional context
				const enhancedProperties = {
					...properties,
					timestamp: new Date().toISOString(),
				};

				// Track the event
				window.umami.track(sanitizedEvent, enhancedProperties);
				this.logDebug('Event tracked:', sanitizedEvent, enhancedProperties);
			} catch (error) {
				this.logDebug('Failed to track event:', event, error);
			}
		}

		// Helper function to sanitize event names
		sanitizeEventName(event) {
			return event
				.toLowerCase()
				.replace(/[^a-z0-9_]/g, '_')
				.replace(/_+/g, '_')
				.trim();
		}

		// Debug logging
		logDebug(...args) {
			if (this.config.debug) {
				console.log('[UmamiHelper]', ...args);
			}
		}
	}

	// Create global instance
	window.UmamiHelper = new UmamiHelper();
})(window);
