// Umami Analytics Helper Functions
(function (window) {
	'use strict';

	// Configuration
	const config = {
		debug: false,
		retryAttempts: 3,
		retryDelay: 1000,
		tracking: {
			forms: {
				enabled: true,
				eventName: 'form_submit',
			},
			typeform: {
				enabled: true,
				eventName: 'typeform_submit',
			},
			calendly: {
				enabled: true,
				eventName: 'calendly_submit',
			},
			hubspot: {
				enabled: true,
				eventName: 'hubspot_submit',
			},
			scroll: {
				enabled: false,
				thresholds: [25, 50, 75],
				eventName: 'scroll_depth',
			},
			outbound: {
				enabled: true,
				eventName: 'outbound_link',
			},
			contactLinks: {
				enabled: true,
				eventName: {
					phone: 'phone_link',
					email: 'email_link',
				},
			},
		},
	};

	// Main analytics wrapper
	class UmamiHelper {
		constructor(options = {}) {
			this.config = this.mergeConfig(config, options);
			this.initialized = false;
			this.eventQueue = [];
			this.logDebug('Initialized with config:', JSON.stringify(this.config.tracking, null, 2));
			this.init();
		}

		// Deep merge helper
		mergeConfig(default_config, user_config) {
			const merged = { ...default_config };
			for (const key in user_config) {
				if (typeof user_config[key] === 'object' && !Array.isArray(user_config[key])) {
					merged[key] = this.mergeConfig(default_config[key] || {}, user_config[key]);
				} else {
					merged[key] = user_config[key];
				}
			}
			return merged;
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
			const { tracking } = this.config;

			// Setup trackers
			if (tracking.forms.enabled) {
				this.logDebug('Initializing forms tracking');
				this.setupFormTracking();
			}

			if (tracking.typeform.enabled) {
				this.logDebug('Initializing typeform tracking');
				this.setupTypeformTracking();
			}

			if (tracking.calendly.enabled) {
				this.logDebug('Initializing calendly tracking');
				this.setupCalendlyTracking();
			}

			if (tracking.hubspot.enabled) {
				this.logDebug('Initializing hubspot tracking');
				this.setupHubspotTracking();
			}

			if (tracking.scroll.enabled) {
				this.logDebug('Initializing scroll tracking');
				this.setupScrollTracking();
			}

			if (tracking.outbound.enabled) {
				this.logDebug('Initializing outbound link tracking');
				this.setupOutboundLinkTracking();
			}

			if (tracking.contactLinks.enabled) {
				this.logDebug('Initializing contact link tracking');
				this.setupContactLinkTracking();
			}
		}

		// Form tracking setup
		setupFormTracking() {
			const forms = document.querySelectorAll('form');

			forms.forEach((form) => {
				const formWrapper = form.closest('[data-umami-event]');
				const eventName = this.getUmamiEvent(formWrapper, this.config.tracking.forms.eventName);

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
			const isTypeformEvent = (e) => {
				return e.origin === 'https://form.typeform.com' && e.data;
			};
			window.addEventListener('message', (e) => {
				if (isTypeformEvent(e)) {
					if (e.data.type === 'form-submit') {
						const typeform = document.querySelector(`[data-tf-widget="${e.data.formId}"]`);
						const typeformEmbed = typeform.closest('[data-tf-live]');
						const eventName = this.getUmamiEvent(typeformEmbed, this.config.tracking.typeform.eventName);
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
			const isCalendlyEvent = (e) => {
				return e.origin === 'https://calendly.com' && e.data.event && e.data.event.indexOf('calendly.') === 0;
			};
			const extractIdFromUrl = (url, pattern) => {
				const match = url.match(pattern);
				return match ? match[1] : null;
			};
			window.addEventListener('message', (e) => {
				if (isCalendlyEvent(e)) {
					if (e.data.event === 'calendly.event_scheduled') {
						const eventId = extractIdFromUrl(e.data.payload.event.uri, /scheduled_events\/([^/]+)/);
						const inviteeId = extractIdFromUrl(e.data.payload.invitee.uri, /invitees\/([^/]+)/);
						const calendlyEmbed = document.querySelector('[data-url*="https://calendly.com/"]');
						const eventName = this.getUmamiEvent(calendlyEmbed, this.config.tracking.calendly.eventName);

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
			const isHubspotEvent = (e) => {
				return e.origin.includes('.hubspot.com') && e.data;
			};
			window.addEventListener('message', (e) => {
				if (isHubspotEvent(e)) {
					if (e.data.meetingBookSucceeded) {
						const hubspotEmbed = document.querySelector('.meetings-iframe-container');
						const eventName = this.getUmamiEvent(hubspotEmbed, this.config.tracking.hubspot.eventName);
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

		// Scroll tracking setup
		setupScrollTracking() {
			const { thresholds, eventName } = this.config.tracking.scroll;
			const reached = new Set();

			const getScrollPercentage = () => {
				const windowHeight = document.documentElement.clientHeight;
				const documentHeight = document.documentElement.scrollHeight - windowHeight;
				const scrolled = window.scrollY;
				return (scrolled / documentHeight) * 100;
			};

			const handleScroll = () => {
				const percentage = Math.round(getScrollPercentage());
				thresholds.forEach((threshold) => {
					if (percentage >= threshold && !reached.has(threshold)) {
						reached.add(threshold);
						this.logEvent(eventName, {
							percentage: threshold,
							url: window.location.pathname,
						});
					}
				});
			};

			let scrollEventAttached = false;

			const attachScrollHandler = () => {
				if (!scrollEventAttached) {
					scrollEventAttached = true;
					window.addEventListener('scroll', handleScroll, { passive: true });
					handleScroll();
				}
			};

			setTimeout(() => {
				const initialPercentage = getScrollPercentage();
				if (initialPercentage < 25) {
					attachScrollHandler();
				}
			}, 1000);

			window.addEventListener('scroll', attachScrollHandler, { once: true, passive: true });
		}

		// Outbound links
		setupOutboundLinkTracking() {
			document.querySelectorAll('a').forEach((a) => {
				if (a.href.startsWith('tel:') || a.href.startsWith('mailto:')) {
					return;
				}

				const eventName = this.getUmamiEvent(a, this.config.tracking.outbound.eventName);
				if (a.host !== window.location.host) {
					a.setAttribute('data-umami-event', eventName);
					a.setAttribute('data-umami-event-url', a.href);
				}
			});
		}

		// Contact links
		setupContactLinkTracking() {
			document.querySelectorAll('a').forEach((a) => {
				if (a.href.startsWith('tel:')) {
					const phoneNumber = a.href.replace('tel:', '');
					const eventName = this.getUmamiEvent(a, this.config.tracking.contactLinks.eventName.phone);
					a.setAttribute('data-umami-event', eventName);
					a.setAttribute('data-umami-event-number', phoneNumber);
				}

				if (a.href.startsWith('mailto:')) {
					const emailAddress = a.href.replace('mailto:', '');
					const eventName = this.getUmamiEvent(a, this.config.tracking.contactLinks.eventName.email);
					a.setAttribute('data-umami-event', eventName);
					a.setAttribute('data-umami-event-email', emailAddress);
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
	window.UmamiHelper = {
		instance: null,
		initialized: false,
		init: (config) => {
			if (!window.UmamiHelper.initialized) {
				window.UmamiHelper.initialized = true;
				window.UmamiHelper.instance = new UmamiHelper(config);
				return window.UmamiHelper.instance;
			}
			return window.UmamiHelper.instance;
		},
	};

	// Wait for custom config
	setTimeout(() => {
		if (!window.UmamiHelper.initialized) {
			window.UmamiHelper.initialized = true;
			window.UmamiHelper.instance = new UmamiHelper();
		}
	}, 0);
})(window);
