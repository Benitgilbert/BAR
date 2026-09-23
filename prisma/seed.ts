import {
  ItemCategory,
  PrismaClient,
  ProductionStation,
  RoomStatus,
  RoomType,
  StaffRole,
  TableSection,
} from "@prisma/client";

const prisma = new PrismaClient();

const staff = [
  {
    id: "staff-admin",
    fullName: "Umugano Administrator",
    email: "admin@umugano.rw",
    phone: "+250 78X XXX XXX",
    role: StaffRole.ADMIN,
  },
  {
    id: "staff-mucoma",
    fullName: "Grace Mukamana",
    email: "mucoma@umugano.rw",
    phone: "+250 78X XXX XXX",
    role: StaffRole.MUCOMA,
  },
  {
    id: "staff-waiter",
    fullName: "Eric Habimana",
    email: "waiter@umugano.rw",
    phone: "+250 78X XXX XXX",
    role: StaffRole.WAITER,
  },
  {
    id: "staff-receptionist",
    fullName: "Alice Uwase",
    email: "reception@umugano.rw",
    phone: "+250 78X XXX XXX",
    role: StaffRole.RECEPTIONIST,
  },
];

const rooms = [
  ...Array.from({ length: 5 }, (_, index) => {
    const number = String(101 + index);
    return {
      id: `room-${number}`,
      number,
      name: `Room ${number}`,
      type: RoomType.STANDARD,
      hourlyRate: 3_000,
      dailyRate: 15_000,
      minimumHours: 2,
      capacity: 2,
      status:
        number === "101"
          ? RoomStatus.OCCUPIED
          : number === "102"
            ? RoomStatus.CLEANING
            : RoomStatus.AVAILABLE,
      amenities: "Wi-Fi, Ensuite bathroom, TV",
    };
  }),
  ...Array.from({ length: 2 }, (_, index) => {
    const number = index + 1;
    return {
      id: `room-vip-${number}`,
      number: `VIP ${number}`,
      name: `VIP ${number}`,
      type: RoomType.VIP,
      hourlyRate: 5_000,
      dailyRate: 25_000,
      minimumHours: 2,
      capacity: 4,
      status: RoomStatus.AVAILABLE,
      amenities: "Wi-Fi, King bed, Smart TV, Mini bar, Air conditioning",
    };
  }),
];

const menuItems = [
  {
    sku: "BEER-001",
    name: "Primus",
    description: "Chilled 65cl bottle",
    category: ItemCategory.BEER,
    price: 1_200,
    stock: 72,
    lowStockThreshold: 12,
    unit: "bottle",
  },
  {
    sku: "BEER-002",
    name: "Mutzig",
    description: "Chilled 65cl bottle",
    category: ItemCategory.BEER,
    price: 1_500,
    stock: 60,
    lowStockThreshold: 12,
    unit: "bottle",
  },
  {
    sku: "BEER-003",
    name: "Skol Malt",
    description: "Chilled 50cl bottle",
    category: ItemCategory.BEER,
    price: 1_300,
    stock: 48,
    lowStockThreshold: 10,
    unit: "bottle",
  },
  {
    sku: "BEER-004",
    name: "Skol Select",
    description: "Chilled 65cl bottle",
    category: ItemCategory.BEER,
    price: 1_500,
    stock: 54,
    lowStockThreshold: 10,
    unit: "bottle",
  },
  {
    sku: "BEER-005",
    name: "Heineken",
    description: "Premium lager 65cl",
    category: ItemCategory.BEER,
    price: 2_000,
    stock: 36,
    lowStockThreshold: 8,
    unit: "bottle",
  },
  {
    sku: "BEER-006",
    name: "Amstel",
    description: "Chilled 65cl bottle",
    category: ItemCategory.BEER,
    price: 1_500,
    stock: 42,
    lowStockThreshold: 10,
    unit: "bottle",
  },
  {
    sku: "SOFT-001",
    name: "Inyange Water 500ml",
    description: "Still drinking water",
    category: ItemCategory.SOFT_DRINK,
    price: 500,
    stock: 180,
    lowStockThreshold: 24,
    unit: "bottle",
  },
  {
    sku: "SOFT-002",
    name: "Inyange Juice",
    description: "Mango or mixed fruit",
    category: ItemCategory.SOFT_DRINK,
    price: 1_000,
    stock: 96,
    lowStockThreshold: 18,
    unit: "pack",
  },
  {
    sku: "SOFT-003",
    name: "Coca-Cola",
    description: "Chilled 350ml",
    category: ItemCategory.SOFT_DRINK,
    price: 800,
    stock: 84,
    lowStockThreshold: 18,
    unit: "can",
  },
  {
    sku: "SOFT-004",
    name: "Fanta",
    description: "Chilled 350ml",
    category: ItemCategory.SOFT_DRINK,
    price: 800,
    stock: 72,
    lowStockThreshold: 18,
    unit: "can",
  },
  {
    sku: "SOFT-005",
    name: "Sprite",
    description: "Chilled 350ml",
    category: ItemCategory.SOFT_DRINK,
    price: 800,
    stock: 72,
    lowStockThreshold: 18,
    unit: "can",
  },
  {
    sku: "LIQ-001",
    name: "Jameson Irish Whiskey Shot",
    description: "Neat 30ml shot",
    category: ItemCategory.LIQUOR,
    price: 1_500,
    stock: 40,
    lowStockThreshold: 8,
    unit: "shot",
  },
  {
    sku: "LIQ-002",
    name: "Jameson Irish Whiskey Bottle",
    description: "700ml bottle",
    category: ItemCategory.LIQUOR,
    price: 18_000,
    stock: 12,
    lowStockThreshold: 3,
    unit: "bottle",
  },
  {
    sku: "LIQ-003",
    name: "Johnnie Walker Red Label",
    description: "700ml blended Scotch whisky",
    category: ItemCategory.LIQUOR,
    price: 15_000,
    stock: 10,
    lowStockThreshold: 3,
    unit: "bottle",
  },
  {
    sku: "LIQ-004",
    name: "Gordon's Dry Gin",
    description: "700ml bottle",
    category: ItemCategory.LIQUOR,
    price: 12_000,
    stock: 10,
    lowStockThreshold: 3,
    unit: "bottle",
  },
  {
    sku: "FOOD-001",
    name: "Goat Brochettes",
    description: "Grilled goat skewers with sides",
    category: ItemCategory.FOOD,
    price: 1_500,
    stock: 30,
    lowStockThreshold: 6,
    unit: "plate",
  },
  {
    sku: "FOOD-002",
    name: "Beef Brochettes",
    description: "Grilled beef skewers with sides",
    category: ItemCategory.FOOD,
    price: 1_500,
    stock: 35,
    lowStockThreshold: 6,
    unit: "plate",
  },
  {
    sku: "FOOD-003",
    name: "Chips / Fries",
    description: "Crispy chips with seasoning",
    category: ItemCategory.FOOD,
    price: 1_500,
    stock: 40,
    lowStockThreshold: 8,
    unit: "plate",
  },
  {
    sku: "FOOD-004",
    name: "Grilled Fish",
    description: "Whole fish with chips and salad",
    category: ItemCategory.FOOD,
    price: 8_000,
    stock: 12,
    lowStockThreshold: 3,
    unit: "plate",
  },
  {
    sku: "FOOD-005",
    name: "Roasted Chicken - Full",
    description: "Whole chicken with sides",
    category: ItemCategory.FOOD,
    price: 12_000,
    stock: 10,
    lowStockThreshold: 3,
    unit: "meal",
  },
  {
    sku: "FOOD-006",
    name: "Roasted Chicken - Half",
    description: "Half chicken with sides",
    category: ItemCategory.FOOD,
    price: 6_000,
    stock: 16,
    lowStockThreshold: 4,
    unit: "meal",
  },
].map((item) => ({
  ...item,
  productionStation:
    item.category === ItemCategory.FOOD
      ? ProductionStation.KITCHEN_MUCOMA
      : ProductionStation.BAR,
  active: true,
}));

const tables = [
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `table-bar-${index + 1}`,
    name: `Bar ${index + 1}`,
    section: TableSection.BAR_COUNTER,
    capacity: 2,
    active: true,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `table-garden-${index + 1}`,
    name: `G${index + 1}`,
    section: TableSection.GARDEN,
    capacity: index < 4 ? 4 : 6,
    active: true,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `table-vip-${index + 1}`,
    name: `V${index + 1}`,
    section: TableSection.VIP_LOUNGE,
    capacity: 6,
    active: true,
  })),
];

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.orderRound.deleteMany();
  await prisma.order.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.item.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: staff });
  await prisma.room.createMany({ data: rooms });
  await prisma.item.createMany({ data: menuItems });
  await prisma.table.createMany({ data: tables });

  const checkedInAt = new Date(Date.now() - 2 * 60 * 60 * 1_000);
  const expectedCheckoutAt = new Date(Date.now() + 22 * 60 * 60 * 1_000);

  await prisma.booking.create({
    data: {
      id: "booking-active-101",
      bookingCode: "UMG-101-001",
      roomId: "room-101",
      guestName: "Jean Pierre Nshimiyimana",
      guestPhone: "+250 78X XXX XXX",
      guestEmail: "guest@example.com",
      guestIdDocument: "1199XXXXXXXX",
      rentalType: "HOURLY",
      rateAmount: 3_000,
      numberOfUnits: 1,
      status: "CHECKED_IN",
      settlementStatus: "PENDING",
      checkedInAt,
      expectedCheckoutAt,
      createdById: "staff-receptionist",
      notes: "Guest requested a quiet room.",
    },
  });

  const [
    userCount,
    roomCount,
    itemCount,
    tableCount,
    bookingCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    prisma.item.count(),
    prisma.table.count(),
    prisma.booking.count(),
  ]);

  console.log("Umugano seed complete:");
  console.log(`- ${userCount} staff users`);
  console.log(`- ${roomCount} rooms`);
  console.log(`- ${itemCount} menu items`);
  console.log(`- ${tableCount} tables and counter tabs`);
  console.log(`- ${bookingCount} active sample booking`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
