import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import {
  isNotificationQuietTime,
  notificationAllowed,
  takeNewNotifications,
  type AttentionNotification,
} from "./attentionNotificationPolicy";
const alert: AttentionNotification = {
  key: "env:item:approval",
  revision: 1,
  category: "approval",
  ref: { environmentId: EnvironmentId.make("env"), threadId: ThreadId.make("thread") },
};
const at = (time: string) => new Date(`2026-09-29T${time}:00`);
describe("client notification policy", () => {
  it.each([
    ["21:59", false],
    ["22:00", true],
    ["23:59", true],
    ["00:00", true],
    ["07:59", true],
    ["08:00", false],
  ])("uses local overnight start-inclusive/end-exclusive policy at %s", (time, expected) => {
    expect(isNotificationQuietTime({ enabled: true, start: "22:00", end: "08:00" }, at(time))).toBe(
      expected,
    );
  });
  it("handles daytime intervals, disabled schedules and equal endpoints", () => {
    const schedule = { enabled: true, start: "09:00", end: "17:00" };
    expect(isNotificationQuietTime(schedule, at("09:00"))).toBe(true);
    expect(isNotificationQuietTime(schedule, at("17:00"))).toBe(false);
    expect(isNotificationQuietTime({ ...schedule, end: "09:00" }, at("01:00"))).toBe(true);
    expect(isNotificationQuietTime({ ...schedule, enabled: false }, at("10:00"))).toBe(false);
  });
  it("applies category, environment mute and quiet time without changing attention", () => {
    expect(notificationAllowed(DEFAULT_CLIENT_SETTINGS, alert, at("12:00"))).toBe(true);
    expect(
      notificationAllowed(
        { ...DEFAULT_CLIENT_SETTINGS, notificationCategories: [] },
        alert,
        at("12:00"),
      ),
    ).toBe(false);
    expect(
      notificationAllowed(
        { ...DEFAULT_CLIENT_SETTINGS, notificationMutedEnvironments: [alert.ref.environmentId] },
        alert,
        at("12:00"),
      ),
    ).toBe(false);
    expect(
      notificationAllowed(
        {
          ...DEFAULT_CLIENT_SETTINGS,
          notificationQuietHours: { enabled: true, start: "22:00", end: "08:00" },
        },
        alert,
        at("23:00"),
      ),
    ).toBe(false);
    expect(
      notificationAllowed(
        DEFAULT_CLIENT_SETTINGS,
        { ...alert, category: "disconnect" },
        at("12:00"),
      ),
    ).toBe(false);
  });
  it("deduplicates scoped material revisions independently for two clients and consumes suppressed observations", () => {
    const first = takeNewNotifications(new Map(), [alert]);
    expect(first.alerts).toEqual([alert]);
    expect(takeNewNotifications(first.observed, [alert]).alerts).toEqual([]);
    expect(takeNewNotifications(new Map(), [alert]).alerts).toEqual([alert]);
    const newer = { ...alert, revision: 2 };
    const next = takeNewNotifications(first.observed, [newer]);
    expect(next.alerts).toEqual([newer]);
    expect(takeNewNotifications(next.observed, [alert]).alerts).toEqual([]);
    const other = {
      ...alert,
      key: "other:item:approval",
      ref: { ...alert.ref, environmentId: EnvironmentId.make("other") },
    };
    expect(takeNewNotifications(next.observed, [newer, other]).alerts).toEqual([other]);
  });
});
