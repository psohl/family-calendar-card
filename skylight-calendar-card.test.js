const { test, after } = require('node:test');
const assert = require('node:assert/strict');

class HTMLElementMock {
  attachShadow() {
    this.shadowRoot = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
    return this.shadowRoot;
  }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  dispatchEvent() { return true; }
}

global.HTMLElement = HTMLElementMock;
global.customElements = {
  registry: new Map(),
  define(name, ctor) { this.registry.set(name, ctor); },
  get(name) { return this.registry.get(name); }
};
global.window = { localStorage: { getItem: () => null, setItem: () => {} }, getComputedStyle: () => ({ color: 'rgb(0, 0, 0)' }) };
global.document = { createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {} }), body: { appendChild: () => {} } };
global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
    this.bubbles = !!init.bubbles;
    this.composed = !!init.composed;
  }
};

after(() => {
  delete global.HTMLElement;
  delete global.customElements;
  delete global.window;
  delete global.document;
  delete global.CustomEvent;
});

require('./skylight-calendar-card.js');

const Card = customElements.get('skylight-calendar-card');
const originalCardRender = Card.prototype.render;
Card.prototype.render = function() {};
Card.prototype.renderPreservingAgendaScroll = function() {};
Card.prototype.ensureEventsForCurrentRange = function() {};

function makeCard(config = { entities: ['calendar.family'] }) {
  const card = new Card();
  card.setConfig(config);
  return card;
}

function recurrenceCases() {
  return [
    { name: 'single event', rrule: null },
    { name: 'recurring no end date', rrule: 'FREQ=WEEKLY' },
    { name: 'recurring until date', rrule: 'FREQ=WEEKLY;UNTIL=20261231T235959Z' },
    { name: 'recurring n times', rrule: 'FREQ=WEEKLY;COUNT=5' }
  ];
}

test('getStubConfig includes key configuration defaults', () => {
  const stub = Card.getStubConfig();
  const requiredKeys = [
    'default_view', 'week_days', 'week_start_hour', 'week_end_hour',
    'lock_schedule_hours', 'show_all_events_month', 'show_all_details_month',
    'hide_empty_days', 'agenda_compact_events', 'compact_width',
    'show_current_time_bar', 'show_event_location', 'use_short_location',
    'event_calendar_friendly_name', 'event_title_prefix', 'event_color_mode',
    'event_neutral_background', 'event_tint_opacity', 'event_color_bar_width', 'combine_style',
    'combine_background', 'hide_calendars', 'hide_year', 'hide_controls',
    'hide_dark_mode_toggle', 'show_dashboard_nav_button', 'header_dashboard_path',
    'header_weather_sensor', 'color_scheme', 'enable_event_management'
  ];
  for (const key of requiredKeys) assert.ok(key in stub, `${key} should exist`);
});

test('setConfig applies visual layout and styling options', () => {
  const card = makeCard({
    entities: ['calendar.family'],
    default_view: 'week',
    compact_height: true,
    compact_width: true,
    compact_header: true,
    hide_year: true,
    hide_calendars: true,
    hide_calendar_names: true,
    hide_controls: true,
    hide_dark_mode_toggle: true,
    show_dashboard_nav_button: true,
    header_dashboard_path: 'lovelace-mobile',
    hide_event_calendar_bubble: true,
    show_event_location: true,
    use_short_location: true,
    event_font_size: 14,
    event_time_font_size: 12,
    event_location_font_size: 10,
    event_calendar_friendly_name: true,
    event_title_prefix: 'icon',
    show_current_time_bar: true,
    header_color: '#123456',
    header_text_color: '#ffffff',
    header_background_opacity: 55,
    background_opacity: 35,
    background_image_url: 'https://example.com/bg.png',
    background_image_size: 'contain',
    background_image_position: 'top left',
    background_image_repeat: 'repeat-x',
    combine_calendars: true,
    combine_style: 'zebra',
    combine_background: '#abcdef',
    combine_calendars_width: 26,
    event_color_mode: 'left-tint',
    event_neutral_background: '#F8F3E9',
    event_tint_opacity: 25,
    event_color_bar_width: 12,
    color_scheme: 'dark',
    calendar_badge_icons: { 'calendar.family': 'mdi:home' },
    colors: { 'calendar.family': '#f00' },
    event_font_colors: { 'calendar.family': '#0f0' },
    hide_badge_calendars: ['calendar.family'],
    virtual_calendars: [{ name: 'home', icon: 'mdi:house', entities: ['calendar.family'] }],
    day_styles: [{ when: { day_of_week: [1] }, style: { background: '#111' } }],
    event_styles: [{ when: { title_contains: 'Meeting' }, style: { color: '#222' } }]
  });

  assert.equal(card._config.default_view, 'week-compact');
  assert.equal(card._config.compact_height, true);
  assert.equal(card._config.compact_width, true);
  assert.equal(card._config.compact_header, true);
  assert.equal(card._config.hide_year, true);
  assert.equal(card._config.hide_calendars, true);
  assert.equal(card._config.hide_calendar_names, true);
  assert.equal(card._config.hide_controls, true);
  assert.equal(card._config.hide_dark_mode_toggle, true);
  assert.equal(card._config.show_dashboard_nav_button, true);
  assert.equal(card._config.header_dashboard_path, '/lovelace-mobile');
  assert.equal(card._config.hide_event_calendar_bubble, true);
  assert.equal(card._config.show_event_location, true);
  assert.equal(card._config.use_short_location, true);
  assert.equal(card._config.event_font_size, 14);
  assert.equal(card._config.event_time_font_size, 12);
  assert.equal(card._config.event_location_font_size, 10);
  assert.equal(card._config.event_calendar_friendly_name, true);
  assert.equal(card._config.event_title_prefix, 'badge_icon');
  assert.equal(card._config.show_current_time_bar, true);
  assert.equal(card._config.header_color, '#123456');
  assert.equal(card._config.header_text_color, '#ffffff');
  assert.equal(card._config.header_background_opacity, 55);
  assert.equal(card._config.background_opacity, 35);
  assert.equal(card._config.background_image_url, 'https://example.com/bg.png');
  assert.equal(card._config.background_image_size, 'contain');
  assert.equal(card._config.background_image_position, 'top left');
  assert.equal(card._config.background_image_repeat, 'repeat-x');
  assert.equal(card._config.combine_calendars, true);
  assert.equal(card._config.combine_style, 'zebra');
  assert.equal(card._config.combine_background, '#abcdef');
  assert.equal(card._config.combine_calendars_width, 26);
  assert.equal(card._config.event_color_mode, 'left-tint');
  assert.equal(card._config.event_neutral_background, '#F8F3E9');
  assert.equal(card._config.event_tint_opacity, 25);
  assert.equal(card._config.event_color_bar_width, 12);
  assert.equal(card._config.color_scheme, 'dark');
  assert.equal(card._config.calendar_badge_icons['calendar.family'], 'mdi:home');
  assert.equal(card._config.colors['calendar.family'], '#f00');
  assert.equal(card._config.event_font_colors['calendar.family'], '#0f0');
  assert.deepEqual(card._config.hide_badge_calendars, ['calendar.family']);
  assert.equal(card._config.virtual_calendars[0].name, 'home');
});

test('setConfig normalizes fallback values and aliases', () => {
  const card = makeCard({
    entities: ['calendar.family'],
    default_view: 'schedule',
    background_transparent: true,
    header_background_transparent: true,
    event_title_prefix: 'bad-value',
    color_scheme: 'invalid'
  });

  assert.equal(card._config.default_view, 'week-standard');
  assert.equal(card._config.background_opacity, 100);
  assert.equal(card._config.header_background_opacity, 100);
  assert.equal(card._config.event_title_prefix, 'none');
  assert.equal(card._config.color_scheme, 'auto');
});


test('event color modes normalize widths and tint opacity endpoints', () => {
  const event = { entityId: 'calendar.family', color: '#ff0000', summary: 'Test', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } };

  const opaqueTint = makeCard({ entities: ['calendar.family'], event_color_mode: 'left-tint', event_tint_opacity: 0, event_color_bar_width: 14 });
  assert.equal(opaqueTint.getEventTintBackgroundColor('#ff0000'), 'rgb(255, 0, 0)');
  assert.equal(opaqueTint.getEventBackgroundColor(event), 'rgb(255, 0, 0)');
  assert.match(opaqueTint.getEventStyle(event), /--combine-left-offset: 14px/);
  assert.match(opaqueTint.getEventStyle(event), /background-color: rgb\(255, 0, 0\)/);

  const transparentTint = makeCard({ entities: ['calendar.family'], event_color_mode: 'left-tint', event_tint_opacity: 100 });
  assert.equal(transparentTint.getEventTintBackgroundColor('#ff0000'), 'rgb(255, 255, 255)');
  assert.equal(transparentTint.getEventBackgroundColor(event), 'rgb(255, 255, 255)');

  const darkTransparentTint = makeCard({ entities: ['calendar.family'], color_scheme: 'dark', event_color_mode: 'left-tint', event_tint_opacity: 100 });
  assert.equal(darkTransparentTint.getEventTintBackgroundColor('#ff0000'), 'rgb(42, 47, 54)');

  const clampedTint = makeCard({ entities: ['calendar.family'], event_color_mode: 'left-tint', event_tint_opacity: 150 });
  assert.equal(clampedTint._config.event_tint_opacity, 100);
  assert.equal(clampedTint.getEventTintBackgroundColor('#ff0000'), 'rgb(255, 255, 255)');

  const widthFallback = makeCard({ entities: ['calendar.family'], event_color_mode: 'left-neutral', combine_calendars_width: 22 });
  assert.equal(widthFallback._config.event_color_bar_width, 22);
  assert.match(widthFallback.getEventStyle(event), /--combine-left-offset: 22px/);
});

test('checkAllCalendarCapabilities marks google, caldav, and local capabilities correctly', async () => {
  const card = makeCard({
    entities: ['calendar.google_home', 'calendar.caldav_work', 'calendar.local_family'],
    readonly_calendars: ['calendar.caldav_work']
  });
  card._hass = { states: {
    'calendar.google_home': { attributes: { integration: 'google', supported_features: 0 } },
    'calendar.caldav_work': { attributes: { supported_features: 2 } },
    'calendar.local_family': { attributes: { supported_features: 6 } }
  } };

  await card.checkAllCalendarCapabilities();

  assert.equal(card._calendarCapabilities['calendar.google_home'].isGoogleCalendar, true);
  assert.equal(card._calendarCapabilities['calendar.google_home'].canUpdate, false);
  assert.equal(card._calendarCapabilities['calendar.caldav_work'].isReadonly, true);
  assert.equal(card._calendarCapabilities['calendar.local_family'].canUpdate, true);
  assert.equal(card._calendarCapabilities['calendar.local_family'].canDelete, true);
});



test('calendar render includes header controls and modal container', () => {
  const card = new Card();
  card._hass = { states: {}, locale: { language: 'en' }, language: 'en', themes: { darkMode: false } };
  card.setConfig({ entities: ['calendar.family'], enable_event_management: true, show_dashboard_nav_button: true, header_dashboard_path: 'lovelace' });
  // run real render for markup validation
  originalCardRender.call(card);
  const html = card._root.innerHTML;
  assert.match(html, /id="prev-period"/);
  assert.match(html, /id="next-period"/);
  assert.match(html, /id="today"/);
  assert.match(html, /id="event-modal"/);
});

test('header button listeners invoke expected actions', () => {
  const card = makeCard({ entities: ['calendar.family'] });
  const handlers = {};
  const mkEl = (id) => ({ id, addEventListener: (evt, cb) => { handlers[id + ':' + evt] = cb; } });
  const elements = {
    'prev-period': mkEl('prev-period'),
    'next-period': mkEl('next-period'),
    'today': mkEl('today'),
    'add-event-btn': mkEl('add-event-btn'),
    'theme-toggle': mkEl('theme-toggle'),
    'header-dashboard-btn': mkEl('header-dashboard-btn'),
    'event-modal': mkEl('event-modal'),
    'agenda-container': mkEl('agenda-container'),
    'view-mode-select': { value: 'month', addEventListener: (evt, cb) => { handlers['view-mode-select:'+evt] = cb; } }
  };
  card.getRootElementById = (id) => elements[id] || null;
  card._root = { querySelector: () => null, querySelectorAll: () => [] };
  let prev=0,next=0,add=0,nav=0;
  card.observeModalVisibility = () => {};
  card.navigateToPreviousPeriod = () => { prev++; };
  card.navigateToNextPeriod = () => { next++; };
  card.showCreateEventModal = () => { add++; };
  card.navigateToConfiguredDashboard = () => { nav++; };
  card.applyThemeMode = () => {};
  card.persistPreferences = () => {};
  card.render = () => {};
  card.ensureEventsForCurrentRange = () => {};
  card.attachEventListeners();
  handlers['prev-period:click']();
  handlers['next-period:click']();
  handlers['add-event-btn:click']();
  handlers['header-dashboard-btn:click']();
  assert.equal(prev,1);assert.equal(next,1);assert.equal(add,1);assert.equal(nav,1);
});

test('editor renders key controls and updates config on change', () => {
  const Editor = customElements.get('skylight-calendar-card-editor');
  const editor = new Editor();
  editor._hass = { states: { 'calendar.family': { entity_id: 'calendar.family', attributes: { friendly_name: 'Family' } } } };
  editor.setConfig({ entities: ['calendar.family'], show_event_location: false });
  assert.doesNotThrow(() => editor.render());
  editor._config = { entities: ['calendar.family'], show_event_location: false };
  editor._fireConfigChanged = () => {};
  editor.handleChange({ target: { dataset: { field: 'show_event_location' }, type: 'checkbox', checked: true } });
  assert.equal(editor._config.show_event_location, true);
});



test('combine_calendars merges exact duplicates and keeps distinct events', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = [
    { entityId: 'calendar.a', color: '#f00', summary: 'Meeting', location: 'Room', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Meeting', location: 'Room', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.a', color: '#f00', summary: 'Different', location: 'Room', start: { dateTime: '2026-05-01T12:00:00Z' }, end: { dateTime: '2026-05-01T13:00:00Z' } }
  ];
  const combined = card.combineDuplicateCalendarEvents(events);
  assert.equal(combined.length, 2);
  const merged = combined.find((event) => event.isCombinedCalendarEvent);
  assert.ok(merged);
  assert.deepEqual(merged.sourceEntityIds.sort(), ['calendar.a', 'calendar.b']);
});



test('HTML attribute escaping protects quoted event prefill values', () => {
  const card = makeCard({ entities: ['calendar.a'] });

  assert.equal(
    card.escapeHtmlAttribute("Team \"sync\" & <review> 'plan'"),
    'Team &quot;sync&quot; &amp; &lt;review&gt; &#39;plan&#39;'
  );
});

test('forward event detects calendars that already contain matching event', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b', 'calendar.c'] });
  const event = {
    entityId: 'calendar.a',
    sourceEntityIds: ['calendar.a'],
    sourceEvents: [{ entityId: 'calendar.a' }],
    summary: 'Team sync',
    location: 'Room A',
    start: { dateTime: '2026-05-01T10:00:00Z' },
    end: { dateTime: '2026-05-01T11:00:00Z' }
  };
  card._events = [
    { entityId: 'calendar.b', summary: 'Team sync', location: 'Room A', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.c', summary: 'Different', location: 'Room A', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } }
  ];

  assert.deepEqual([...card.getForwardExistingCalendarIds(event)].sort(), ['calendar.a', 'calendar.b']);
});

test('event_styles apply rule priority and match logic', () => {
  const card = makeCard({
    entities: ['calendar.a'],
    event_styles: [
      { match: { title: 'meeting' }, priority: 1, style: { background_color: '#112233', event_font_color: '#ffffff' } },
      { match: { all_day: true }, priority: 5, style: { background_color: '#445566' } }
    ]
  });
  const event = { entityId: 'calendar.a', color: '#f00', summary: 'Team meeting', start: { date: '2026-05-01' }, end: { date: '2026-05-02' } };
  const overrides = card.getEventStyleOverrides(event);
  assert.equal(overrides.background_color, '#445566');
  assert.equal(overrides.event_font_color, '#ffffff');
  assert.equal(card.eventMatchesRule(event, { title: 'meeting', not: { title: 'holiday' } }), true);
});

test('day_styles evaluate today/weekend/has_event rules and auto background', () => {
  const card = makeCard({
    entities: ['calendar.a'],
    day_styles: [
      { condition: 'today', opacity: 0.7 },
      { condition: 'has_event', calendar: 'calendar.a', title_match: 'sync', background: 'auto', border_color: '#111111', border_width: 2 }
    ]
  });
  const date = new Date();
  const dayEvents = [{ entityId: 'calendar.a', color: '#224466', summary: 'Daily sync', start: { dateTime: '2026-05-01T09:00:00Z' }, end: { dateTime: '2026-05-01T09:30:00Z' } }];
  const style = card.getDayStyleConfig(date, dayEvents, true);
  assert.equal(style.opacity, 0.7);
  assert.equal(style.background, '#224466');
  assert.equal(style.border_color, '#111111');
  assert.equal(style.border_width, '2px');
});

test('virtual_calendars normalize and affect calendar token matching', () => {
  const card = makeCard({
    entities: ['calendar.a', 'calendar.b'],
    virtual_calendars: [{ id: 'family', name: 'Family', entities: ['calendar.a', 'calendar.b'], color: '#778899' }]
  });
  const virtual = card.getVirtualBadgeById('family');
  assert.ok(virtual);
  assert.equal(virtual.color, '#778899');
  const event = { entityId: 'calendar.a', color: '#f00', summary: 'Trip', start: { dateTime: '2026-05-01T09:00:00Z' }, end: { dateTime: '2026-05-01T10:00:00Z' } };
  const tokens = card.getEventCalendarMatchTokens(event);
  assert.ok(tokens.includes('virtual:family'));
  assert.equal(card.eventFieldMatches(event, 'calendar', 'virtual:family'), true);
});



test('feature order: combine then virtual then event styles influences visible colors/style', () => {
  const card = makeCard({
    entities: ['calendar.a', 'calendar.b'],
    combine_calendars: true,
    combine_style: 'bars',
    combine_background: 'primary',
    virtual_calendars: [{ id: 'family', name: 'Family', entities: ['calendar.a'], color: '#123123' }],
    event_styles: [
      { match: { calendar: 'virtual:family' }, priority: 5, style: { background_color: '#999999' } },
      { match: { calendar: 'calendar.b' }, priority: 1, style: { background_color: '#555555' } }
    ]
  });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#ff0000', summary: 'Dup', location: '', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#00ff00', summary: 'Dup', location: '', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } }
  ]);
  const combinedEvent = events.find((e) => e.isCombinedCalendarEvent);
  const style = card.getEventStyle(combinedEvent);
  assert.match(style, /background-color: #999999/);
  assert.match(style, /background-image: linear-gradient\(to bottom, #555555 0% 100%\)/);
});

test('all features together: combine + virtual + event_styles + day_styles', () => {
  const card = makeCard({
    entities: ['calendar.a', 'calendar.b'],
    combine_calendars: true,
    combine_style: 'zebra',
    combine_background: 'neutral',
    virtual_calendars: [{ id: 'family', name: 'Family', entities: ['calendar.a', 'calendar.b'], color: '#abcdef' }],
    event_styles: [{ match: { title: 'sync' }, priority: 10, style: { event_font_color: '#ffffff', background_color: '#222222' } }],
    day_styles: [{ condition: 'has_event', calendar: 'virtual:family', title_match: 'sync', background: 'auto', border_color: '#111111', border_width: 2 }]
  });
  const combined = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#ff0000', summary: 'Daily sync', start: { dateTime: '2026-05-01T09:00:00Z' }, end: { dateTime: '2026-05-01T09:30:00Z' } },
    { entityId: 'calendar.b', color: '#00ff00', summary: 'Daily sync', start: { dateTime: '2026-05-01T09:00:00Z' }, end: { dateTime: '2026-05-01T09:30:00Z' } }
  ])[0];
  const eventStyle = card.getEventStyleOverrides(combined);
  const dayStyle = card.getDayStyleConfig(new Date('2026-05-01T00:00:00Z'), [combined], false);
  assert.equal(combined.isCombinedCalendarEvent, true);
  assert.equal(card.eventFieldMatches(combined, 'calendar', 'virtual:family'), true);
  assert.equal(eventStyle.event_font_color, '#ffffff');
  assert.deepEqual(eventStyle.backgroundColors, ['#222222', '#222222']);
  assert.equal(eventStyle.hasDuplicateBackgroundColors, true);
  assert.equal(dayStyle.background, '#ff0000');
  assert.equal(dayStyle.border_color, '#111111');
});

test('must not happen: no combine when disabled and hidden calendars do not contribute visible colors', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: false });
  card._hiddenCalendars = new Set(['calendar.b']);
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#ff0000', summary: 'Dup', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#00ff00', summary: 'Dup', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } }
  ]);
  assert.equal(events.length, 2);
  assert.equal(events.some((event) => event.isCombinedCalendarEvent), false);
  const visibleColors = card.getVisibleCalendarColorsForEvent(events[1]);
  assert.deepEqual(visibleColors, []);
});

test('must not happen: day_styles has_event without match should not style day', () => {
  const card = makeCard({
    entities: ['calendar.a'],
    day_styles: [{ condition: 'has_event', calendar: 'calendar.a', title_match: 'nonexistent', background: 'auto' }]
  });
  const dayEvents = [{ entityId: 'calendar.a', color: '#123456', summary: 'Daily sync', start: { dateTime: '2026-05-01T09:00:00Z' }, end: { dateTime: '2026-05-01T09:30:00Z' } }];
  const style = card.getDayStyleConfig(new Date(), dayEvents, false);
  assert.equal(style, null);
});



test('combine_calendars does not combine same title with different location', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#f00', summary: 'Meeting', location: 'Room A', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Meeting', location: 'Room B', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } }
  ]);
  assert.equal(events.length, 2);
  assert.equal(events.some((event) => event.isCombinedCalendarEvent), false);
});

test('combine_calendars does not combine events shifted by one minute', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#f00', summary: 'Meeting', location: 'Room', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Meeting', location: 'Room', start: { dateTime: '2026-05-01T10:01:00Z' }, end: { dateTime: '2026-05-01T11:01:00Z' } }
  ]);
  assert.equal(events.length, 2);
});

test('combine_calendars combines when one location is missing and one is empty', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#f00', summary: 'Meeting', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Meeting', location: '', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } }
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].isCombinedCalendarEvent, true);
});

test('combine_calendars does not combine all-day and timed events', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#f00', summary: 'Day Event', location: 'Home', start: { date: '2026-05-01' }, end: { date: '2026-05-02' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Day Event', location: 'Home', start: { dateTime: '2026-05-01T00:00:00Z' }, end: { dateTime: '2026-05-01T23:59:00Z' } }
  ]);
  assert.equal(events.length, 2);
});

test('combine_calendars does not combine partial overlapping events', () => {
  const card = makeCard({ entities: ['calendar.a', 'calendar.b'], combine_calendars: true });
  const events = card.combineDuplicateCalendarEvents([
    { entityId: 'calendar.a', color: '#f00', summary: 'Overlap', location: 'Room', start: { dateTime: '2026-05-01T10:00:00Z' }, end: { dateTime: '2026-05-01T11:00:00Z' } },
    { entityId: 'calendar.b', color: '#0f0', summary: 'Overlap', location: 'Room', start: { dateTime: '2026-05-01T10:30:00Z' }, end: { dateTime: '2026-05-01T11:30:00Z' } }
  ]);
  assert.equal(events.length, 2);
});

for (const calendarType of [
  { id: 'calendar.google_home', integration: 'google' },
  { id: 'calendar.caldav_work', integration: 'caldav' },
  { id: 'calendar.local_family', integration: 'local' }
]) {
  for (const recurrence of recurrenceCases()) {
    test(`createEvent ${calendarType.integration} - ${recurrence.name}`, async () => {
      const card = makeCard();
      const sent = [];
      const calls = [];
      card._hass = {
        connection: { sendMessagePromise: async (payload) => sent.push(payload) },
        callService: async (...args) => calls.push(args)
      };

      const eventData = {
        summary: 'Event',
        start: recurrence.rrule ? { dateTime: '2026-05-01T10:00:00Z' } : { date: '2026-05-01' },
        end: recurrence.rrule ? { dateTime: '2026-05-01T11:00:00Z' } : { date: '2026-05-02' },
        ...(recurrence.rrule ? { rrule: recurrence.rrule } : {})
      };

      await card.createEvent(calendarType.id, eventData);

      if (recurrence.rrule) {
        assert.equal(sent.length, 1);
        assert.equal(sent[0].type, 'calendar/event/create');
        assert.equal(sent[0].entity_id, calendarType.id);
        assert.equal(sent[0].event.rrule, recurrence.rrule);
      } else {
        assert.equal(calls.length, 1);
        assert.equal(calls[0][1], 'create_event');
        assert.equal(calls[0][2].entity_id, calendarType.id);
      }
    });

    test(`updateEvent ${calendarType.integration} - ${recurrence.name}`, async () => {
      const card = makeCard();
      const sent = [];
      const calls = [];
      card._calendarCapabilities[calendarType.id] = { canUpdate: true };
      card._hass = {
        connection: { sendMessagePromise: async (payload) => sent.push(payload) },
        services: { calendar: { update_event: {} } },
        callService: async (...args) => calls.push(args)
      };

      const originalEvent = {
        entityId: calendarType.id,
        uid: 'uid-1',
        recurrence_id: '20260501T100000Z',
        ...(recurrence.rrule ? { rrule: recurrence.rrule } : {})
      };
      const eventData = {
        summary: 'Updated',
        start: recurrence.rrule ? { dateTime: '2026-05-01T12:00:00Z' } : { date: '2026-05-01' },
        end: recurrence.rrule ? { dateTime: '2026-05-01T13:00:00Z' } : { date: '2026-05-02' },
        ...(recurrence.rrule ? { rrule: recurrence.rrule } : {})
      };

      await card.updateEvent(originalEvent, calendarType.id, eventData, 'future');

      if (recurrence.rrule) {
        assert.equal(sent.length, 1);
        assert.equal(sent[0].type, 'calendar/event/update');
        assert.equal(sent[0].entity_id, calendarType.id);
        assert.equal(sent[0].event.rrule, recurrence.rrule);
        assert.equal(sent[0].recurrence_range, 'THISANDFUTURE');
      } else {
        assert.equal(calls.length, 1);
        assert.equal(calls[0][1], 'update_event');
        assert.equal(calls[0][2].entity_id, calendarType.id);
      }
    });

    test(`deleteEvent ${calendarType.integration} - ${recurrence.name}`, async () => {
      const card = makeCard();
      const sent = [];
      const originalConsoleLog = console.log;
      console.log = () => {};
      card._hass = {
        connection: { sendMessagePromise: async (payload) => sent.push(payload) },
        callService: async () => {}
      };

      try {
        await card.deleteEvent(
          calendarType.id,
          'uid-1',
          recurrence.rrule ? '20260501T100000Z' : null,
          recurrence.rrule ? 'THISANDFUTURE' : null
        );
      } finally {
        console.log = originalConsoleLog;
      }

      assert.equal(sent.length, 1);
      assert.equal(sent[0].type, 'calendar/event/delete');
      assert.equal(sent[0].entity_id, calendarType.id);
      if (recurrence.rrule) {
        assert.equal(sent[0].recurrence_id, '20260501T100000Z');
        assert.equal(sent[0].recurrence_range, 'THISANDFUTURE');
      }
    });
  }
}
