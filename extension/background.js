// background.js — MV3 service worker. Top-level alarm listener is REQUIRED (DevDoc §7).
// Sleeping service workers lose state — keep anything persistent in chrome.storage.local.
// NEVER use setInterval here — it cannot survive the service worker sleeping/restart.

// Defaults — user can change in popup settings (FR-15, ADR-07).
const DEFAULT_ALARM_MINUTES = 120; // gentle cadence (every 2h)

chrome.runtime.onInstalled.addListener(async () => {
  const { reminderMinutes } = await chrome.storage.local.get({ reminderMinutes: DEFAULT_ALARM_MINUTES });
  chrome.alarms.create('reminder', { periodInMinutes: reminderMinutes });
});

// MUST be at the TOP LEVEL — registering inside a callback breaks after sleep.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'reminder') return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'AutoClock',
    message: 'Log your recent work? (≈ 20 seconds)',
    priority: 0,
  });
});

// Message channel for the popup to change cadence on the fly.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'set-cadence' && Number.isFinite(msg.minutes)) {
    chrome.alarms.clear('reminder');
    chrome.alarms.create('reminder', { periodInMinutes: msg.minutes });
    chrome.storage.local.set({ reminderMinutes: msg.minutes });
    sendResponse({ ok: true });
  }
  return true;
});
