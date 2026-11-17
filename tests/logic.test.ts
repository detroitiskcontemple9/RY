import { test } from "node:test";
import assert from "node:assert/strict";
import { feeToCover, parseDollarsToCents, formatUSD } from "../src/lib/money";
import { addDays, todayIn } from "../src/lib/dates";
import { dueReminder } from "../src/lib/reminder-schedule";
import { toCsv } from "../src/lib/csv";

test("fee coverage grosses up so the temple nets the full gift", () => {
  for (const gift of [100, 5100, 10800, 100100]) {
    const fee = feeToCover(gift, 2.2, 30);
    const charged = gift + fee;
    const stripeFee = Math.round(charged * 0.022 + 30);
    assert.ok(charged - stripeFee >= gift, `gift ${gift}: nets ${charged - stripeFee}`);
    assert.ok(charged - stripeFee - gift <= 1);
  }
  assert.equal(feeToCover(10800, 2.2, 30), 274);
});

test("parses dollar input", () => {
  assert.equal(parseDollarsToCents("101"), 10100);
  assert.equal(parseDollarsToCents("$1,001.50"), 100150);
  assert.ok(Number.isNaN(parseDollarsToCents("abc")));
  assert.ok(Number.isNaN(parseDollarsToCents("1.234")));
  assert.equal(formatUSD(10100), "$101");
});

test("dates", () => {
  assert.equal(addDays("2027-03-01", -7), "2027-02-22");
  assert.equal(addDays("2026-12-28", 7), "2027-01-04");
  // 03:00 UTC on Nov 18 is still Nov 17 in Detroit
  assert.equal(todayIn("America/Detroit", new Date("2026-11-18T03:00:00Z")), "2026-11-17");
});

test("pledge reminder schedule", () => {
  const base = { status: "open" as const, dueDate: "2027-03-22", reminderBeforeSentAt: null, reminderDueSentAt: null, reminderOverdueSentAt: null };
  assert.equal(dueReminder(base, "2027-03-01"), null);
  assert.equal(dueReminder(base, "2027-03-15"), "before");
  assert.equal(dueReminder({ ...base, reminderBeforeSentAt: new Date() }, "2027-03-16"), null);
  assert.equal(dueReminder(base, "2027-03-22"), "due");
  assert.equal(dueReminder({ ...base, reminderDueSentAt: new Date() }, "2027-03-25"), null);
  assert.equal(dueReminder(base, "2027-03-29"), "overdue");
  assert.equal(dueReminder({ ...base, reminderOverdueSentAt: new Date() }, "2027-04-10"), null);
  assert.equal(dueReminder({ ...base, status: "fulfilled" }, "2027-03-22"), null);
});

test("csv escapes and blocks formula injection", () => {
  assert.equal(toCsv([["a,b", '"q"', "=SUM(1)", null]]), `"a,b","""q""",'=SUM(1),`);
});
