import { pgTable, uuid, text, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export type TrackingEntry = { status: string; note: string; timestamp: string };
export type ShippingAddress = { street: string; city: string; state: string; zip: string; country: string };

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text().notNull().default("buyer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comics = pgTable("comics", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  author: text().notNull(),
  publisher: text().notNull().default("Unknown"),
  genre: text().notNull().default("Superhero"),
  description: text().notNull().default(""),
  condition: text().notNull().default("Fine"),
  price: doublePrecision().notNull(),
  stock: integer().notNull().default(1),
  imageUrl: text("image_url")
    .notNull()
    .default("https://images.unsplash.com/photo-1588497859490-85d1c17db26d?q=80&w=600&auto=format&fit=crop"),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid().primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text().notNull().default("Pending"),
  trackingHistory: jsonb("tracking_history").$type<TrackingEntry[]>().notNull().default([]),
  shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  // Nullable so a seller can delete a listing without erasing order history
  comicId: uuid("comic_id").references(() => comics.id, { onDelete: "set null" }),
  quantity: integer().notNull(),
  price: doublePrecision().notNull(),
});
