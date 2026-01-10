import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      slug: 'demo-restaurant',
      name: 'Demo Restaurant',
      description: 'A sample restaurant for testing',
      timezone: 'America/New_York',
      currency: 'USD',
      isActive: true,
    },
  });

  console.log(`Created restaurant: ${restaurant.name}`);

  // Create owner user
  const passwordHash = await bcrypt.hash('password123', 10);
  const owner = await prisma.restaurantUser.upsert({
    where: {
      restaurantId_email: {
        restaurantId: restaurant.id,
        email: 'owner@demo.com',
      },
    },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'owner@demo.com',
      passwordHash,
      name: 'Demo Owner',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log(`Created user: ${owner.email}`);

  // Create menu categories
  const appetizers = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Appetizers',
      description: 'Start your meal right',
      displayOrder: 1,
    },
  });

  const mains = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Main Courses',
      description: 'Our signature dishes',
      displayOrder: 2,
    },
  });

  console.log('Created menu categories');

  // Create menu items
  await prisma.menuItem.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        categoryId: appetizers.id,
        name: 'Spring Rolls',
        description: 'Crispy vegetable rolls',
        price: 8.99,
        isAvailable: true,
        displayOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: appetizers.id,
        name: 'Garlic Bread',
        description: 'Fresh baked with herbs',
        price: 6.99,
        imageUrl: 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&q=80',
        isAvailable: true,
        displayOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        name: 'Grilled Salmon',
        description: 'Wild caught with seasonal vegetables',
        price: 24.99,
        isAvailable: true,
        displayOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        name: 'Chicken Parmesan',
        description: 'Breaded chicken with marinara and mozzarella',
        price: 18.99,
        isAvailable: true,
        displayOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, basil, and tomato sauce',
        price: 14.99,
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
        isAvailable: true,
        displayOrder: 3,
      },
      {
        restaurantId: restaurant.id,
        categoryId: mains.id,
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella cheese',
        price: 15.99,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
        isAvailable: true,
        displayOrder: 4,
      },
    ],
  });

  console.log('Created menu items');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
