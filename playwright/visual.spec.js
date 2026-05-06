const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const FIXED_NOW = '2026-03-15T10:00:00.000Z';

const baseEvents = {
  'calendar.family': [
    { summary: 'Coffee', start: '2026-03-15T09:00:00Z', end: '2026-03-15T09:30:00Z', location: 'Kitchen' },
    { summary: 'All Day Holiday', start: '2026-03-16', end: '2026-03-17' },
    { summary: 'Conference', start: '2026-03-17', end: '2026-03-20' },
    { summary: 'Night Shift', start: '2026-03-15T23:30:00Z', end: '2026-03-16T06:30:00Z' }
  ],
  'calendar.work': [
    { summary: 'Standup', start: '2026-03-15T14:00:00Z', end: '2026-03-15T14:15:00Z', location: 'Zoom' },
    { summary: 'Planning', start: '2026-03-18T18:00:00Z', end: '2026-03-18T19:00:00Z' }
  ]
};

const hostileEvents = {
  'calendar.family': [
    { summary: '', start: '2026-03-15T00:00:00Z', end: '2026-03-15T00:05:00Z' },
    { summary: 'X'.repeat(180), start: '2026-03-15T12:00:00Z', end: '2026-03-15T13:00:00Z', location: 'https://very-long-url.example.com/path/to/resource' },
    { summary: 'Overlap A', start: '2026-03-15T15:00:00Z', end: '2026-03-15T17:30:00Z' },
    { summary: 'Overlap B', start: '2026-03-15T15:15:00Z', end: '2026-03-15T16:00:00Z' },
    { summary: 'Midnight <24', start: '2026-03-15T23:55:00Z', end: '2026-03-16T00:20:00Z' }
  ],
  'calendar.work': [
    { summary: 'All Day Zero End', start: '2026-03-16', end: '2026-03-16' },
    { summary: 'Emoji 🧪 / Symbols <> &', start: '2026-03-17T18:00:00Z', end: '2026-03-17T19:00:00Z' }
  ]
};

const cases = [
  { name: 'month-basic-light', config: { default_view: 'month', color_scheme: 'light' }, darkMode: false, events: baseEvents, viewLabel: 'Month' },
  { name: 'month-basic-dark', config: { default_view: 'month', color_scheme: 'dark' }, darkMode: true, events: baseEvents, viewLabel: 'Month' },
  { name: 'week-basic-light', config: { default_view: 'week', color_scheme: 'light' }, darkMode: false, events: baseEvents, viewLabel: 'Week' },
  { name: 'week-basic-dark', config: { default_view: 'week', color_scheme: 'dark' }, darkMode: true, events: baseEvents, viewLabel: 'Week' },
  { name: 'schedule-basic-light', config: { default_view: 'schedule', color_scheme: 'light' }, darkMode: false, events: baseEvents, viewLabel: 'Schedule' },
  { name: 'schedule-basic-dark', config: { default_view: 'schedule', color_scheme: 'dark' }, darkMode: true, events: baseEvents, viewLabel: 'Schedule' },
  { name: 'agenda-basic-light', config: { default_view: 'agenda', color_scheme: 'light' }, darkMode: false, events: baseEvents, viewLabel: 'Agenda' },
  { name: 'agenda-basic-dark', config: { default_view: 'agenda', color_scheme: 'dark' }, darkMode: true, events: baseEvents, viewLabel: 'Agenda' },
  { name: 'multi-combined', config: { default_view: 'week', combine_calendars: true, combine_style: 'zebra', combine_background: '#d7ebff' }, darkMode: false, events: baseEvents, viewLabel: 'Week' },
  { name: 'multi-split', config: { default_view: 'week', combine_calendars: false }, darkMode: false, events: baseEvents, viewLabel: 'Week' },
  { name: 'event-left-neutral-week', config: { default_view: 'week', event_color_mode: 'left-neutral', event_neutral_background: '#F8F3E9', event_color_bar_width: 18, colors: { 'calendar.family': '#ff5f66', 'calendar.work': '#14c8bd' } }, darkMode: false, events: baseEvents, viewLabel: 'Week' },
  { name: 'event-left-tint-schedule', config: { default_view: 'schedule', event_color_mode: 'left-tint', event_tint_opacity: 100, event_color_bar_width: 18, colors: { 'calendar.family': '#ff5f66', 'calendar.work': '#14c8bd' } }, darkMode: false, events: baseEvents, viewLabel: 'Schedule' },
  { name: 'virtual-calendars', config: { default_view: 'schedule', virtual_calendars: [{ name: 'home+work', icon: 'mdi:calendar', entities: ['calendar.family', 'calendar.work'] }] }, darkMode: false, events: baseEvents, viewLabel: 'Schedule' },
  { name: 'styled-events-days', config: { default_view: 'month', event_styles: [{ when: { title_contains: 'Standup' }, style: { background: '#f8d7da', color: '#721c24' } }], day_styles: [{ when: { day_of_week: [0] }, style: { background: '#f4f7ff' } }] }, darkMode: false, events: baseEvents, viewLabel: 'Month' },
  { name: 'hostile-dataset', config: { default_view: 'agenda', combine_calendars: true }, darkMode: false, events: hostileEvents, viewLabel: 'Agenda' },
  { name: 'configure-all-options', config: {
      default_view: 'agenda',
      combine_calendars: true,
      combine_style: 'zebra',
      combine_background: '#e3f2fd',
      show_all_events_month: true,
      show_all_details_month: true,
      event_calendar_friendly_name: true,
      event_title_prefix: 'icon',
      show_event_location: true,
      use_short_location: false,
      show_current_time_bar: true,
      virtual_calendars: [{ name: 'all', icon: 'mdi:calendar-multiple', entities: ['calendar.family', 'calendar.work'] }],
      event_styles: [{ when: { title_contains: 'Night' }, style: { border: '2px solid #673ab7' } }],
      day_styles: [{ when: { day_of_week: [1, 2, 3, 4, 5] }, style: { background: '#fafafa' } }],
      colors: { 'calendar.family': '#2196f3', 'calendar.work': '#4caf50' },
      color_scheme: 'dark'
    },
    darkMode: true,
    events: baseEvents,
    viewLabel: 'Agenda'
  }
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((now) => {
    const OriginalDate = Date;
    class MockDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) return new OriginalDate(now);
        return new OriginalDate(...args);
      }
      static now() { return new OriginalDate(now).getTime(); }
    }
    window.Date = MockDate;
  }, FIXED_NOW);
});

for (const scenario of cases) {
  test(`visual: ${scenario.name}`, async ({ page }, testInfo) => {
    const fixtureUrl = `file://${path.join(process.cwd(), 'playwright', 'ha-fixture.html')}`;
    await page.goto(fixtureUrl);
    await page.evaluate((params) => window.renderCalendarCard(params), {
      config: { entities: ['calendar.family', 'calendar.work'], title: 'Visual Test Calendar', ...scenario.config },
      events: scenario.events,
      darkMode: scenario.darkMode
    });

    const card = page.locator('skylight-calendar-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Visual Test Calendar');
    await expect(card).toContainText(scenario.viewLabel);

    const eventSelectorByView = {
      month: '.event, .all-day-event',
      week: '.week-compact-event, .week-standard-event, .all-day-event',
      schedule: '.week-standard-event, .all-day-event',
      agenda: '.agenda-event'
    };
    const view = scenario.config.default_view || 'month';
    const eventSelector = eventSelectorByView[view] || '.event';
    expect(await card.locator(eventSelector).count()).toBeGreaterThan(0);

    const snapshotName = `${scenario.name}.png`;
    const snapshotPath = testInfo.snapshotPath(snapshotName);
    if (fs.existsSync(snapshotPath)) {
      await expect(card).toHaveScreenshot(snapshotName, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.01
      });
    } else {
      await card.screenshot({
        path: testInfo.outputPath(`${scenario.name}-actual.png`),
        animations: 'disabled'
      });
      testInfo.annotations.push({
        type: 'warning',
        description: `Snapshot missing for ${scenario.name}; captured actual screenshot for bootstrap.`
      });
    }
  });
}
