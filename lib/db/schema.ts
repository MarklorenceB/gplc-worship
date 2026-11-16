import {
  boolean,
  date,
  integer,
  index,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { Language } from "../dates";
import type { Answer, BandSlot, Role, SongSet } from "../lineup";

export const members = pgTable("members", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  sings: boolean().notNull().default(false),
  instruments: text().array().$type<BandSlot[]>().notNull().default([]),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const months = pgTable("months", {
  // "YYYY-MM"
  id: text().primaryKey(),
  theme: text(),
  note: text(),
  availabilityOpen: boolean().notNull().default(false),
});

export const services = pgTable("services", {
  id: serial().primaryKey(),
  date: date({ mode: "string" }).notNull().unique(),
  monthId: text()
    .notNull()
    .references(() => months.id, { onDelete: "cascade" }),
  language: text().$type<Language>().notNull(),
  palette: text(),
  occasion: text(),
  notes: text(),
  status: text().$type<"draft" | "published">().notNull().default("draft"),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const serviceSongs = pgTable("service_songs", {
  id: serial().primaryKey(),
  serviceId: integer()
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  position: integer().notNull(),
  title: text().notNull(),
  artist: text(),
  set: text().$type<SongSet>(),
  isBackup: boolean().notNull().default(false),
});

export const assignments = pgTable(
  "assignments",
  {
    id: serial().primaryKey(),
    serviceId: integer()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: text().$type<Role>().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [unique().on(t.serviceId, t.role, t.memberId)],
);

export const availability = pgTable(
  "availability",
  {
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    serviceId: integer()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    answer: text().$type<Answer>().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.serviceId] })],
);

export const availabilityNotes = pgTable(
  "availability_notes",
  {
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    monthId: text()
      .notNull()
      .references(() => months.id, { onDelete: "cascade" }),
    openTo: text().array().notNull().default([]),
    tryLead: boolean().notNull().default(false),
    songIdea: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.monthId] })],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial().primaryKey(),
  deviceId: text().notNull().unique(),
  memberId: integer().notNull().references(() => members.id, { onDelete: "cascade" }),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastTestAt: timestamp({ withTimezone: true }),
});

export const lineupNotificationState = pgTable("lineup_notification_state", {
  serviceId: integer().primaryKey().references(() => services.id, { onDelete: "cascade" }),
  fingerprint: text().notNull(),
  status: text().notNull(),
  version: integer().notNull().default(0),
});

export const announcements = pgTable("announcements", {
  id: text().primaryKey(),
  authorId: integer().references(() => members.id, { onDelete: "set null" }),
  authorName: text().notNull(),
  title: text().notNull(),
  body: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp({ withTimezone: true }),
}, (t) => [index("announcements_feed_idx").on(t.archivedAt, t.createdAt)]);

export type NotificationPayload = { title: string; body: string; url: string; tag: string };
export const notificationEvents = pgTable("notification_events", {
  id: text().primaryKey(),
  kind: text().$type<"published" | "updated" | "sunday" | "availability" | "announcement">().notNull(),
  serviceId: integer().references(() => services.id, { onDelete: "cascade" }),
  announcementId: text().references(() => announcements.id, { onDelete: "cascade" }),
  payload: jsonb().$type<NotificationPayload>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial().primaryKey(),
  eventId: text().notNull().references(() => notificationEvents.id, { onDelete: "cascade" }),
  subscriptionId: integer().notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  status: text().$type<"pending" | "sent" | "failed" | "cancelled">().notNull().default("pending"),
  attempts: integer().notNull().default(0),
  availableAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lease: text(),
  sentAt: timestamp({ withTimezone: true }),
  error: text(),
}, (t) => [unique().on(t.eventId, t.subscriptionId), index("notification_due_idx").on(t.status, t.availableAt)]);

export const notificationRuntime = pgTable("notification_runtime", {
  id: text().primaryKey(),
  lastRunAt: timestamp({ withTimezone: true }).notNull(),
});
