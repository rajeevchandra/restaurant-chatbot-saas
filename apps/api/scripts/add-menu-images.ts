import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env
config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function addMenuImages() {
  console.log('Adding images to menu items...');

  // Find the test restaurant
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'test-restaurant' },
  });

  if (!restaurant) {
    console.error('❌ test-restaurant not found!');
    process.exit(1);
  }

  console.log(`✅ Found restaurant: ${restaurant.name}`);

  // Update Garlic Bread
  const garlicBread = await prisma.menuItem.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: { contains: 'Garlic Bread', mode: 'insensitive' },
    },
  });

  if (garlicBread) {
    await prisma.menuItem.update({
      where: { id: garlicBread.id },
      data: {
        imageUrl: 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&q=80',
      },
    });
    console.log('✅ Updated Garlic Bread with image');
  }

  // Update Margherita Pizza
  const margherita = await prisma.menuItem.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: { contains: 'Margherita', mode: 'insensitive' },
    },
  });

  if (margherita) {
    await prisma.menuItem.update({
      where: { id: margherita.id },
      data: {
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
      },
    });
    console.log('✅ Updated Margherita Pizza with image');
  }

  // Update Pepperoni Pizza
  const pepperoni = await prisma.menuItem.findFirst({
    where: {
      restaurantId: restaurant.id,
      name: { contains: 'Pepperoni', mode: 'insensitive' },
    },
  });

  if (pepperoni) {
    await prisma.menuItem.update({
      where: { id: pepperoni.id },
      data: {
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
      },
    });
    console.log('✅ Updated Pepperoni Pizza with image');
  }

  // If pizzas don't exist, create them
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
  });

  const mainCategory = categories.find(
    (c) => c.name.toLowerCase().includes('main') || c.name.toLowerCase().includes('entree')
  );

  if (!margherita && mainCategory) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: mainCategory.id,
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, basil, and tomato sauce',
        price: 14.99,
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
        isAvailable: true,
      },
    });
    console.log('✅ Created Margherita Pizza with image');
  }

  if (!pepperoni && mainCategory) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: mainCategory.id,
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella cheese',
        price: 15.99,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
        isAvailable: true,
      },
    });
    console.log('✅ Created Pepperoni Pizza with image');
  }

  console.log('\n🎉 All done! Images added to menu items.');
}

addMenuImages()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
