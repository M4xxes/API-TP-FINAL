import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  await prisma.category.createMany({
    data: [
      {
        id: 1,
        name: "Informatique",
        description: "Ordinateurs, périphériques et accessoires",
      },
      {
        id: 2,
        name: "Maison",
        description: "Articles pour la maison et la décoration",
      },
      {
        id: 3,
        name: "Sport",
        description: "Equipements et vêtements de sport",
      },
    ],
  });

  const catInfo = await prisma.category.findFirst({
    where: { name: "Informatique" },
  });
  if (!catInfo) throw new Error("Category Informatique not found");

  const catHome = await prisma.category.findFirst({
    where: { name: "Maison" },
  });
  if (!catHome) throw new Error("Category Maison not found");

  const catSport = await prisma.category.findFirst({
    where: { name: "Sport" },
  });
  if (!catSport) throw new Error("Category Sport not found");

  await prisma.product.createMany({
    data: [
      { name: "Laptop 14\"", type: "INFORMATIQUE_LAPTOP", price: 899.99, stock: 10, categoryId: catInfo.id },
      { name: "Souris sans fil", type: "INFORMATIQUE_ACCESSOIRE", price: 24.99, stock: 50, categoryId: catInfo.id },
      { name: "Clavier mécanique", type: "INFORMATIQUE_ACCESSOIRE", price: 79.9, stock: 30, categoryId: catInfo.id },
      { name: "Ecran 27\"", type: "INFORMATIQUE_ECRAN", price: 199.0, stock: 15, categoryId: catInfo.id },
      { name: "Station d'accueil USB-C", type: "INFORMATIQUE_ACCESSOIRE", price: 149.0, stock: 12, categoryId: catInfo.id },
      { name: "Laptop 16\" Pro", type: "INFORMATIQUE_LAPTOP", price: 1499.99, stock: 5, categoryId: catInfo.id },
      { name: "Casque audio Bluetooth", type: "INFORMATIQUE_ACCESSOIRE", price: 129.0, stock: 25, categoryId: catInfo.id },
      { name: "Aspirateur", type: "MAISON_APPAREIL", price: 129.0, stock: 20, categoryId: catHome.id },
      { name: "Lampe de salon", type: "MAISON_DECO", price: 39.9, stock: 40, categoryId: catHome.id },
      { name: "Coussin déco", type: "MAISON_DECO", price: 19.99, stock: 60, categoryId: catHome.id },
      { name: "Table basse", type: "MAISON_MOBILIER", price: 149.5, stock: 8, categoryId: catHome.id },
      { name: "Canapé 3 places", type: "MAISON_MOBILIER", price: 599.0, stock: 5, categoryId: catHome.id },
      { name: "Chaise de bureau", type: "MAISON_MOBILIER", price: 89.9, stock: 25, categoryId: catHome.id },
      { name: "Machine à café filtre", type: "MAISON_APPAREIL", price: 79.0, stock: 14, categoryId: catHome.id },
      { name: "Robot cuiseur", type: "MAISON_APPAREIL", price: 349.0, stock: 6, categoryId: catHome.id },
      { name: "Rideaux occultants", type: "MAISON_DECO", price: 59.9, stock: 18, categoryId: catHome.id },
      { name: "Vélo route", type: "SPORTS_EQUIPMENT", price: 999.0, stock: 4, categoryId: catSport.id },
      { name: "Chaussures running", type: "SPORTS_APPAREL", price: 79.0, stock: 35, categoryId: catSport.id },
      { name: "Tapis de yoga", type: "SPORTS_ACCESSORY", price: 29.9, stock: 40, categoryId: catSport.id },
      { name: "Ballon de foot", type: "SPORTS_ACCESSORY", price: 25.0, stock: 50, categoryId: catSport.id },
      { name: "Raquette de tennis", type: "SPORTS_EQUIPMENT", price: 89.0, stock: 18, categoryId: catSport.id },
      { name: "Haltères 5kg", type: "SPORTS_EQUIPMENT", price: 39.0, stock: 22, categoryId: catSport.id },
      { name: "Veste de sport", type: "SPORTS_APPAREL", price: 59.9, stock: 16, categoryId: catSport.id },
      { name: "Short de sport", type: "SPORTS_APPAREL", price: 29.5, stock: 28, categoryId: catSport.id },
      { name: "Gants de fitness", type: "SPORTS_ACCESSORY", price: 19.5, stock: 30, categoryId: catSport.id },
      { name: "Sac de sport", type: "SPORTS_ACCESSORY", price: 49.9, stock: 20, categoryId: catSport.id },
      { name: "Vélo VTT", type: "SPORTS_EQUIPMENT", price: 799.0, stock: 3, categoryId: catSport.id },
      { name: "Collant de running", type: "SPORTS_APPAREL", price: 39.9, stock: 24, categoryId: catSport.id },
    ],
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.createMany({
    data: [
      { email: "admin@example.com", password: passwordHash, role: "ADMIN" },
      { email: "user1@example.com", password: passwordHash, role: "USER" },
      { email: "user2@example.com", password: passwordHash, role: "USER" },
    ],
  });

  console.log("Seeding done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


