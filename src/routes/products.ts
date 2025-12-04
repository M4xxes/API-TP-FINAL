import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

export const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const limit = Math.max(
      Math.min(parseInt((req.query.limit as string) || "10", 10), 100),
      1
    );
    const skip = (page - 1) * limit;

    const sortParam = (req.query.sort as string) || "createdAt";
    const sortField =
      sortParam.startsWith("-") || sortParam.startsWith("+")
        ? sortParam.slice(1)
        : sortParam;
    const sortDirection = sortParam.startsWith("-") ? "desc" : "asc";

    const allowedSortFields = ["name", "price", "createdAt"];
    if (!allowedSortFields.includes(sortField)) {
      return res.status(400).json({ message: "Invalid sort field" });
    }

    const where: any = {};

    if (req.query.categoryId) {
      const categoryId = parseInt(req.query.categoryId as string, 10);
      if (!Number.isNaN(categoryId)) {
        where.categoryId = categoryId;
      }
    }

    if (req.query.priceMin || req.query.priceMax) {
      where.price = {};
      if (req.query.priceMin) {
        const min = parseFloat(req.query.priceMin as string);
        if (!Number.isNaN(min)) {
          where.price.gte = min;
        }
      }
      if (req.query.priceMax) {
        const max = parseFloat(req.query.priceMax as string);
        if (!Number.isNaN(max)) {
          where.price.lte = max;
        }
      }
    }

    if (req.query.type) {
      where.type = req.query.type as string;
    }

    const fieldsParam = (req.query.fields as string) || "";
    const selectedFields = fieldsParam
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const allowedFields = ["id", "name", "price", "stock", "createdAt", "type"];
    let select: any | undefined;

    if (selectedFields.length > 0) {
      for (const f of selectedFields) {
        if (!allowedFields.includes(f)) {
          return res.status(400).json({ message: `Invalid field: ${f}` });
        }
      }
      select = {};
      selectedFields.forEach((f) => {
        select[f] = true;
      });
    }

    const includeCategory = (req.query.include as string) === "category";

    // Prisma n'autorise pas select + include en même temps.
    // - Si des champs sont sélectionnés ET include=category, on ajoute simplement category au select.
    // - Sinon, on utilise include séparément.
    const queryOptions: any = {
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    };

    if (select) {
      queryOptions.select = { ...select };
      if (includeCategory) {
        queryOptions.select.category = true;
      }
    } else if (includeCategory) {
      queryOptions.include = { category: true };
    }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany(queryOptions),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      page,
      limit,
      total,
      totalPages,
      items,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, stock, categoryId, type } = req.body || {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "name is required" });
    }
    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ message: "price must be a positive number" });
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: "stock must be a positive integer" });
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "categoryId must be a positive integer" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        type: typeof type === "string" && type.trim() ? type.trim() : "STANDARD",
        price,
        stock,
        categoryId,
      },
      include: { category: true },
    });

    return res.status(201).json(product);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
});


