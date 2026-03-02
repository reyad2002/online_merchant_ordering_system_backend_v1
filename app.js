import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { errorHandler } from "./middleware/errorHandler.js";
import {
  authRoutes,
  merchantsRoutes,
  branchesRoutes,
  tablesRoutes,
  usersRoutes,
  menusRoutes,
  categoriesRoutes,
  itemsRoutes,
  variantsRoutes,
  modifiersRoutes,
  publicRoutes,
  ordersRoutes,
  kitchenRoutes,
  cashierRoutes,
} from "./routes/index.js";

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Public
app.use("/auth", authRoutes);
app.use("/public", publicRoutes);
app.use("/orders", ordersRoutes);

// Staff (auth required on routers)
app.use("/merchants", merchantsRoutes);
app.use("/branches", branchesRoutes);
app.use("/tables", tablesRoutes);
app.use("/users", usersRoutes);
app.use("/menus", menusRoutes);
app.use("/categories", categoriesRoutes);

app.use("/", variantsRoutes);
app.use("/", modifiersRoutes);
app.use("/", itemsRoutes);

app.use("/kitchen", kitchenRoutes);
app.use("/cashier", cashierRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
