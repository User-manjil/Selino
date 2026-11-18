import crypto from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { getStore } from "@netlify/blobs";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, comics, orders, orderItems, type TrackingEntry, type ShippingAddress } from "../../db/schema.js";

export const config = {
  path: ["/api/*", "/uploads/*"],
};

type User = typeof users.$inferSelect;
type Comic = typeof comics.$inferSelect;
type Order = typeof orders.$inferSelect;
type AuthedRequest = Request & { user: User };

const COOKIE_EXPIRES_DAYS = 30;
const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const CONDITIONS = ["Mint", "Near Mint", "Very Fine", "Fine", "Very Good", "Good", "Fair", "Poor"];
const PAYMENT_METHODS = ["COD", "eSewa"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
// eSewa's publicly documented sandbox (UAT) secret; only used with the EPAYTEST product code.
const ESEWA_UAT_SECRET = "8gBm/:&EnhH.1/q";

const coverStore = getStore("comic-covers");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only .jpg, .jpeg, .png, .gif and .webp image files are allowed!"));
  },
});

const app = express();
app.set("trust proxy", true);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- helpers ----------

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

const getCookieOptions = (req: Request) => ({
  httpOnly: true,
  secure: req.secure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
});

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const publicUser = (u: Pick<User, "id" | "name" | "email"> & Partial<Pick<User, "role">>) => ({
  id: u.id,
  _id: u.id,
  name: u.name,
  email: u.email,
  ...(u.role ? { role: u.role } : {}),
});

const formatComic = (c: Comic, seller?: Pick<User, "id" | "name" | "email"> | null) => ({
  _id: c.id,
  title: c.title,
  author: c.author,
  publisher: c.publisher,
  genre: c.genre,
  description: c.description,
  condition: c.condition,
  price: c.price,
  stock: c.stock,
  imageUrl: c.imageUrl,
  seller: seller ? { _id: seller.id, name: seller.name, email: seller.email } : c.sellerId,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const sellerColumns = { id: users.id, name: users.name, email: users.email };

async function getComicWithSeller(id: string) {
  const [row] = await db
    .select({ comic: comics, seller: sellerColumns })
    .from(comics)
    .leftJoin(users, eq(comics.sellerId, users.id))
    .where(eq(comics.id, id));
  return row ? formatComic(row.comic, row.seller) : null;
}

// Loads orders with their buyer and items (each item's comic populated), mirroring the old API shape.
async function loadOrders(orderRows: Order[]) {
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((o) => o.id);
  const buyerIds = [...new Set(orderRows.map((o) => o.buyerId))];

  const [itemRows, buyerRows] = await Promise.all([
    db
      .select({ item: orderItems, comic: comics })
      .from(orderItems)
      .leftJoin(comics, eq(orderItems.comicId, comics.id))
      .where(inArray(orderItems.orderId, orderIds)),
    db.select(sellerColumns).from(users).where(inArray(users.id, buyerIds)),
  ]);
  const buyersById = new Map(buyerRows.map((b) => [b.id, b]));

  return orderRows.map((o) => {
    const buyer = buyersById.get(o.buyerId);
    return {
      _id: o.id,
      buyer: buyer ? { _id: buyer.id, name: buyer.name, email: buyer.email } : o.buyerId,
      items: itemRows
        .filter((r) => r.item.orderId === o.id)
        .map((r) => ({
          _id: r.item.id,
          comic: r.comic ? formatComic(r.comic) : null,
          quantity: r.item.quantity,
          price: r.item.price,
        })),
      totalAmount: o.totalAmount,
      status: o.status,
      trackingHistory: o.trackingHistory,
      shippingAddress: o.shippingAddress,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });
}

async function saveCover(file: Express.Multer.File) {
  const ext = (file.originalname.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  const key = `comic-${Date.now()}-${crypto.randomUUID()}${ext}`;
  await coverStore.set(key, new Blob([new Uint8Array(file.buffer)]), { metadata: { contentType: file.mimetype } });
  return `/uploads/${key}`;
}

async function deleteCover(imageUrl: string | null | undefined) {
  if (imageUrl?.startsWith("/uploads/")) {
    await coverStore.delete(imageUrl.slice("/uploads/".length)).catch(() => {});
  }
}

const getSiteUrl = (req: Request) => `${req.protocol}://${req.get("host")}`;

const serverError = (res: Response, message: string, err: unknown) => {
  console.error(message, err);
  res.status(500).json({ message, error: err instanceof Error ? err.message : String(err) });
};

// ---------- auth middleware ----------

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | null = null;
    if (req.cookies?.token) token = req.cookies.token;
    else if (req.headers.authorization?.startsWith("Bearer ")) token = req.headers.authorization.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Authentication token missing or invalid" });

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    if (!isUuid(decoded.id)) return res.status(401).json({ message: "User no longer exists" });
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) return res.status(401).json({ message: "User no longer exists" });

    (req as AuthedRequest).user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Authentication failed. Token is invalid or expired." });
  }
};

const requireRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  if ((req as AuthedRequest).user?.role === role) return next();
  return res.status(403).json({ message: `Access denied. ${role[0].toUpperCase() + role.slice(1)} role required.` });
};
const isSeller = requireRole("seller");
const isBuyer = requireRole("buyer");

// ---------- auth routes ----------

const issueToken = (req: Request, res: Response, user: User) => {
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: `${COOKIE_EXPIRES_DAYS}d`,
  });
  res.cookie("token", token, getCookieOptions(req));
  return token;
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existing) return res.status(400).json({ message: "User with this email already exists" });

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const [newUser] = await db
      .insert(users)
      .values({
        name: String(name),
        email: normalizedEmail,
        password: hashedPassword,
        // Only buyer or seller can self-register
        role: role === "seller" ? "seller" : "buyer",
      })
      .returning();

    const token = issueToken(req, res, newUser);
    res.status(201).json({ message: "Registration successful", token, user: publicUser(newUser) });
  } catch (err) {
    serverError(res, "Server error during registration", err);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password" });
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, String(email).trim().toLowerCase()));
    if (!user || !(await bcrypt.compare(String(password), user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = issueToken(req, res, user);
    res.json({ message: "Login successful", token, user: publicUser(user) });
  } catch (err) {
    serverError(res, "Server error during login", err);
  }
});

app.post("/api/auth/logout", (req, res) => {
  const { maxAge: _maxAge, ...options } = getCookieOptions(req);
  res.clearCookie("token", options);
  res.json({ message: "Logged out successfully" });
});

app.get("/api/auth/profile", authMiddleware, (req, res) => {
  res.json({ user: publicUser((req as AuthedRequest).user) });
});

// ---------- comic routes ----------

app.get("/api/comics", async (req, res) => {
  try {
    const { search, genre, condition, minPrice, maxPrice, sellerId } = req.query as Record<string, string | undefined>;
    const filters: SQL[] = [];

    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      filters.push(or(ilike(comics.title, pattern), ilike(comics.author, pattern))!);
    }
    if (genre) filters.push(eq(comics.genre, genre));
    if (condition) filters.push(eq(comics.condition, condition));
    if (sellerId) {
      if (!isUuid(sellerId)) return res.json([]);
      filters.push(eq(comics.sellerId, sellerId));
    }
    if (minPrice && !Number.isNaN(Number(minPrice))) filters.push(gte(comics.price, Number(minPrice)));
    if (maxPrice && !Number.isNaN(Number(maxPrice))) filters.push(lte(comics.price, Number(maxPrice)));

    const rows = await db
      .select({ comic: comics, seller: sellerColumns })
      .from(comics)
      .leftJoin(users, eq(comics.sellerId, users.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(comics.createdAt));

    res.json(rows.map((r) => formatComic(r.comic, r.seller)));
  } catch (err) {
    serverError(res, "Server error while fetching comics", err);
  }
});

app.get("/api/comics/:id", async (req, res) => {
  try {
    const comic = isUuid(req.params.id) ? await getComicWithSeller(req.params.id) : null;
    if (!comic) return res.status(404).json({ message: "Comic not found" });
    res.json(comic);
  } catch (err) {
    serverError(res, "Server error while fetching comic detail", err);
  }
});

app.post("/api/comics", authMiddleware, isSeller, upload.single("coverImage"), async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const { title, author, publisher, genre, description, condition, price, stock, imageUrl } = req.body ?? {};
    if (!title || !author || price === undefined || price === "") {
      return res.status(400).json({ message: "Title, author, and price are required" });
    }
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    let finalImageUrl: string | undefined;
    if (req.file) finalImageUrl = await saveCover(req.file);
    else if (imageUrl) finalImageUrl = String(imageUrl);

    const parsedStock = Number(stock);
    const [created] = await db
      .insert(comics)
      .values({
        title: String(title),
        author: String(author),
        publisher: publisher || "Unknown",
        genre: genre || "Superhero",
        description: description || "",
        condition: CONDITIONS.includes(condition) ? condition : "Fine",
        price: Number(price),
        stock: Number.isFinite(parsedStock) && parsedStock >= 0 ? Math.floor(parsedStock) : 1,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
        sellerId: user.id,
      })
      .returning();

    res.status(201).json(await getComicWithSeller(created.id));
  } catch (err) {
    serverError(res, "Server error while listing comic", err);
  }
});

app.put("/api/comics/:id", authMiddleware, isSeller, upload.single("coverImage"), async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const [comic] = isUuid(req.params.id) ? await db.select().from(comics).where(eq(comics.id, req.params.id)) : [];
    if (!comic) return res.status(404).json({ message: "Comic not found" });
    if (comic.sellerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized. You can only update your own listings." });
    }

    const { title, author, publisher, genre, description, condition, price, stock, imageUrl } = req.body ?? {};
    const updates: Partial<typeof comics.$inferInsert> = {
      title: title || comic.title,
      author: author || comic.author,
      publisher: publisher || comic.publisher,
      genre: genre || comic.genre,
      description: description !== undefined ? description : comic.description,
      condition: CONDITIONS.includes(condition) ? condition : comic.condition,
      price: price !== undefined && price !== "" && !Number.isNaN(Number(price)) ? Number(price) : comic.price,
      stock:
        stock !== undefined && stock !== "" && !Number.isNaN(Number(stock))
          ? Math.max(0, Math.floor(Number(stock)))
          : comic.stock,
      updatedAt: new Date(),
    };

    if (req.file) {
      await deleteCover(comic.imageUrl);
      updates.imageUrl = await saveCover(req.file);
    } else if (imageUrl && imageUrl !== comic.imageUrl) {
      await deleteCover(comic.imageUrl);
      updates.imageUrl = String(imageUrl);
    }

    await db.update(comics).set(updates).where(eq(comics.id, comic.id));
    res.json(await getComicWithSeller(comic.id));
  } catch (err) {
    serverError(res, "Server error while updating comic", err);
  }
});

app.delete("/api/comics/:id", authMiddleware, isSeller, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const [comic] = isUuid(req.params.id) ? await db.select().from(comics).where(eq(comics.id, req.params.id)) : [];
    if (!comic) return res.status(404).json({ message: "Comic not found" });
    if (comic.sellerId !== user.id) {
      return res.status(403).json({ message: "Unauthorized. You can only delete your own listings." });
    }
    // Past order items keep their price; their comic reference is cleared by the foreign key.
    await db.delete(comics).where(eq(comics.id, comic.id));
    await deleteCover(comic.imageUrl);
    res.json({ message: "Comic listing deleted successfully" });
  } catch (err) {
    serverError(res, "Server error while deleting comic", err);
  }
});

// ---------- order routes ----------

app.post("/api/orders", authMiddleware, isBuyer, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const { items, shippingAddress, paymentMethod } = req.body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items in the order" });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Please select COD or eSewa" });
    }
    const address = shippingAddress as ShippingAddress | undefined;
    if (!address?.street || !address.city || !address.state || !address.zip || !address.country) {
      return res.status(400).json({ message: "Please provide a complete shipping address" });
    }

    const productCode = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
    const esewaSecret = process.env.ESEWA_SECRET_KEY || (productCode === "EPAYTEST" ? ESEWA_UAT_SECRET : "");
    if (paymentMethod === "eSewa" && !esewaSecret) {
      return res.status(503).json({ message: "eSewa is not configured. Add ESEWA_SECRET_KEY to the site environment." });
    }

    // Validate items and stock
    let total = 0;
    const lines: { comic: Comic; quantity: number }[] = [];
    for (const item of items) {
      const quantity = Math.floor(Number(item?.quantity));
      if (!isUuid(item?.comic) || !Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Invalid order item" });
      }
      const [comic] = await db.select().from(comics).where(eq(comics.id, item.comic));
      if (!comic) return res.status(404).json({ message: `Comic with ID ${item.comic} not found` });
      if (comic.stock < quantity) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for "${comic.title}". Only ${comic.stock} available.` });
      }
      total += comic.price * quantity;
      lines.push({ comic, quantity });
    }

    // Reserve stock atomically per item; roll back reservations if any item sold out meanwhile
    const reserved: typeof lines = [];
    for (const line of lines) {
      const updated = await db
        .update(comics)
        .set({ stock: sql`${comics.stock} - ${line.quantity}` })
        .where(and(eq(comics.id, line.comic.id), gte(comics.stock, line.quantity)))
        .returning({ id: comics.id });
      if (updated.length === 0) {
        for (const r of reserved) {
          await db
            .update(comics)
            .set({ stock: sql`${comics.stock} + ${r.quantity}` })
            .where(eq(comics.id, r.comic.id));
        }
        return res.status(400).json({ message: `Insufficient stock for "${line.comic.title}".` });
      }
      reserved.push(line);
    }

    const tracking: TrackingEntry[] = [
      {
        status: "Pending",
        note: "Order placed successfully. Awaiting confirmation from seller.",
        timestamp: new Date().toISOString(),
      },
    ];
    const [newOrder] = await db
      .insert(orders)
      .values({
        buyerId: user.id,
        totalAmount: total,
        status: "Pending",
        paymentMethod,
        shippingAddress: {
          street: String(address.street),
          city: String(address.city),
          state: String(address.state),
          zip: String(address.zip),
          country: String(address.country),
        },
        trackingHistory: tracking,
      })
      .returning();
    await db
      .insert(orderItems)
      .values(lines.map((l) => ({ orderId: newOrder.id, comicId: l.comic.id, quantity: l.quantity, price: l.comic.price })));

    const [populatedOrder] = await loadOrders([newOrder]);

    if (paymentMethod === "COD") {
      return res.status(201).json({ order: populatedOrder, payment: { gateway: "COD" } });
    }

    const siteUrl = getSiteUrl(req);
    const transactionUuid = `${newOrder.id}-${Date.now()}`;
    const totalAmount = total.toFixed(2);
    const signature = crypto
      .createHmac("sha256", esewaSecret)
      .update(`total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`)
      .digest("base64");

    return res.status(201).json({
      order: populatedOrder,
      payment: {
        gateway: "eSewa",
        action: process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        fields: {
          amount: totalAmount,
          tax_amount: "0",
          total_amount: totalAmount,
          transaction_uuid: transactionUuid,
          product_code: productCode,
          product_service_charge: "0",
          product_delivery_charge: "0",
          success_url: `${siteUrl}/?payment=esewa&order=${newOrder.id}&status=success`,
          failure_url: `${siteUrl}/cart?payment=failed`,
          signed_field_names: "total_amount,transaction_uuid,product_code",
          signature,
        },
      },
    });
  } catch (err) {
    serverError(res, "Server error while processing checkout", err);
  }
});

app.get("/api/orders/buyer", authMiddleware, isBuyer, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const rows = await db.select().from(orders).where(eq(orders.buyerId, user.id)).orderBy(desc(orders.createdAt));
    res.json(await loadOrders(rows));
  } catch (err) {
    serverError(res, "Server error while fetching order history", err);
  }
});

app.get("/api/orders/track/:id", authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const [row] = isUuid(req.params.id) ? await db.select().from(orders).where(eq(orders.id, req.params.id)) : [];
    if (!row) return res.status(404).json({ message: "Order not found" });

    const [order] = await loadOrders([row]);
    const isBuyerOwner = row.buyerId === user.id;
    const isSellerInvolved =
      user.role === "seller" && order.items.some((i) => i.comic && i.comic.seller === user.id);

    if (!isBuyerOwner && !isSellerInvolved) {
      return res.status(403).json({ message: "You are not authorized to view this order" });
    }
    res.json(order);
  } catch (err) {
    serverError(res, "Server error while fetching order tracking", err);
  }
});

app.get("/api/orders/seller", authMiddleware, isSeller, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const orderIdRows = await db
      .selectDistinct({ id: orderItems.orderId })
      .from(orderItems)
      .innerJoin(comics, eq(orderItems.comicId, comics.id))
      .where(eq(comics.sellerId, user.id));

    const orderRows = orderIdRows.length
      ? await db
          .select()
          .from(orders)
          .where(inArray(orders.id, orderIdRows.map((r) => r.id)))
          .orderBy(desc(orders.createdAt))
      : [];
    const fullOrders = await loadOrders(orderRows);

    let totalEarnings = 0;
    let totalItemsSold = 0;
    const sales = [];
    for (const order of fullOrders) {
      const sellerItems = order.items.filter((i) => i.comic && i.comic.seller === user.id);
      if (sellerItems.length === 0) continue;
      const subtotal = sellerItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
      totalEarnings += subtotal;
      totalItemsSold += sellerItems.reduce((acc, i) => acc + i.quantity, 0);
      sales.push({
        orderId: order._id,
        buyer: order.buyer,
        items: sellerItems,
        subtotal,
        status: order.status,
        trackingHistory: order.trackingHistory,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        date: order.createdAt,
      });
    }

    res.json({ sales, stats: { totalEarnings, totalItemsSold, totalOrders: sales.length } });
  } catch (err) {
    serverError(res, "Server error while fetching sales records", err);
  }
});

app.put("/api/orders/:id/status", authMiddleware, isSeller, async (req, res) => {
  try {
    const user = (req as AuthedRequest).user;
    const { status, note } = req.body ?? {};
    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}` });
    }

    const [row] = isUuid(req.params.id) ? await db.select().from(orders).where(eq(orders.id, req.params.id)) : [];
    if (!row) return res.status(404).json({ message: "Order not found" });

    const [involved] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(comics, eq(orderItems.comicId, comics.id))
      .where(and(eq(orderItems.orderId, row.id), eq(comics.sellerId, user.id)))
      .limit(1);
    if (!involved) {
      return res.status(403).json({ message: "You can only update orders containing your comics" });
    }

    const trackingHistory = [
      ...row.trackingHistory,
      { status, note: note || `Order status updated to ${status}`, timestamp: new Date().toISOString() },
    ];
    const [updated] = await db
      .update(orders)
      .set({ status, trackingHistory, updatedAt: new Date() })
      .where(eq(orders.id, row.id))
      .returning();

    const [order] = await loadOrders([updated]);
    res.json(order);
  } catch (err) {
    serverError(res, "Server error while updating order status", err);
  }
});

// ---------- uploaded cover images ----------

app.get("/uploads/:key", async (req, res) => {
  try {
    const result = await coverStore.getWithMetadata(req.params.key, { type: "arrayBuffer" });
    if (!result) return res.status(404).send("Not found");
    res.set("Content-Type", String(result.metadata?.contentType || "application/octet-stream"));
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(result.data));
  } catch (err) {
    console.error("Error serving upload:", err);
    res.status(500).send("Error loading image");
  }
});

app.get("/api", (_req, res) => {
  res.json({ message: "Welcome to ComicVerse API" });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Multer / unexpected errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError || err.message?.startsWith("Only .jpg")) {
    return res.status(400).json({ message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
