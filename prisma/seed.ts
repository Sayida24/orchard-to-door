// Sample data for development. Safe to re-run: it upserts by unique fields
// and only creates orchards/batches/boxes when none exist yet.
// Run with: npx prisma db seed
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123"; // dev only

// Unambiguous characters (no 0/O, 1/I/L) so printed codes are easy to read.
const QR_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeQrCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += QR_ALPHABET[randomInt(QR_ALPHABET.length)];
  return code;
}

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- Users ----------
  const users = [
    { name: "Admin", phone: "01700000001", email: "admin@orchiva.test", role: Role.ADMIN },
    { name: "Rahim Seller", phone: "01700000002", email: "seller@orchiva.test", role: Role.SELLER },
    { name: "Karim Customer", phone: "01700000003", email: "customer@orchiva.test", role: Role.CUSTOMER },
  ];
  const [, seller] = await Promise.all(
    users.map((u) =>
      prisma.user.upsert({
        where: { phone: u.phone },
        update: {},
        create: { ...u, passwordHash },
      }),
    ),
  );

  // ---------- Varieties (Mango Guide) ----------
  const varietyData = [
    { name: "Himsagar", seasonStart: 5, seasonEnd: 6, taste: "Very sweet, fiberless, rich aroma", bestUse: "Eat fresh" },
    { name: "Langra", seasonStart: 6, seasonEnd: 7, taste: "Sweet with a slight tang, juicy", bestUse: "Eat fresh, juice" },
    { name: "Fazli", seasonStart: 7, seasonEnd: 8, taste: "Mildly sweet, large and fleshy", bestUse: "Juice, desserts, pickles" },
    { name: "Amrapali", seasonStart: 6, seasonEnd: 7, taste: "Very sweet, deep orange flesh", bestUse: "Eat fresh, smoothies" },
    { name: "Gopalbhog", seasonStart: 5, seasonEnd: 6, taste: "Sweet, soft, fragrant", bestUse: "Eat fresh" },
  ];
  const varieties = await Promise.all(
    varietyData.map((v) => prisma.variety.upsert({ where: { name: v.name }, update: v, create: v })),
  );
  const byName = Object.fromEntries(varieties.map((v) => [v.name, v]));

  // ---------- Delivery areas (Dhaka first) ----------
  const areas = [
    { name: "Dhanmondi", fee: 60 },
    { name: "Gulshan", fee: 60 },
    { name: "Mirpur", fee: 60 },
    { name: "Uttara", fee: 80 },
    { name: "Mohammadpur", fee: 60 },
    { name: "Old Dhaka", fee: 80 },
  ];
  await Promise.all(
    areas.map((a) => prisma.deliveryArea.upsert({ where: { name: a.name }, update: { fee: a.fee }, create: a })),
  );

  // ---------- Orchards + batches ----------
  if ((await prisma.orchard.count()) === 0) {
    const now = Date.now();
    const orchardData = [
      {
        name: "Shibganj Green Orchard",
        location: "Shibganj, Chapainawabganj",
        description: "Family orchard with 40-year-old Himsagar and Langra trees.",
        batches: [
          { variety: "Himsagar", daysAgo: 0, totalKg: 300, pricePerKg: 160 },
          { variety: "Langra", daysAgo: 1, totalKg: 250, pricePerKg: 150 },
        ],
      },
      {
        name: "Bagha Riverside Orchard",
        location: "Bagha, Rajshahi",
        description: "Riverside orchard known for Fazli and Gopalbhog.",
        batches: [
          { variety: "Fazli", daysAgo: 0, totalKg: 400, pricePerKg: 120 },
          { variety: "Gopalbhog", daysAgo: 2, totalKg: 150, pricePerKg: 170 },
        ],
      },
      {
        name: "Satkhira Sunrise Orchard",
        location: "Kalaroa, Satkhira",
        description: "Young Amrapali plantation, harvested early in the season.",
        batches: [{ variety: "Amrapali", daysAgo: 1, totalKg: 200, pricePerKg: 140 }],
      },
    ];

    for (const o of orchardData) {
      const orchard = await prisma.orchard.create({
        data: {
          name: o.name,
          location: o.location,
          description: o.description,
          photoUrls: [],
          sellerId: seller.id,
        },
      });
      for (const b of o.batches) {
        const harvestDate = new Date(now - b.daysAgo * DAY);
        await prisma.batch.create({
          data: {
            harvestDate,
            totalKg: b.totalKg,
            availableKg: b.totalKg,
            pricePerKg: b.pricePerKg,
            spinImageUrls: [],
            closesAt: new Date(harvestDate.getTime() + 3 * DAY), // listed for 3 days
            orchardId: orchard.id,
            varietyId: byName[b.variety].id,
            sellerId: seller.id,
          },
        });
      }
    }
  }

  // ---------- Pre-printed QR labels (not linked to an order yet) ----------
  if ((await prisma.box.count()) === 0) {
    const codes = new Set<string>();
    while (codes.size < 10) codes.add(makeQrCode());
    await prisma.box.createMany({
      data: [...codes].map((qrCode) => ({ qrCode, photoUrls: [], annotatedPhotoUrls: [] })),
    });
  }

  console.log("Seed done. Demo logins (password: %s):", DEMO_PASSWORD);
  for (const u of users) console.log(`  ${u.role.padEnd(8)} ${u.phone}  ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
