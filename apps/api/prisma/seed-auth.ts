import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create test restaurant if not exists
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: 'test-restaurant' },
      update: {},
      create: {
        slug: 'test-restaurant',
        name: 'Test Restaurant',
        description: 'A test restaurant for development',
        isActive: true,
      },
    });

    console.log('✅ Restaurant created/found:', restaurant.slug);

    // Hash password
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // Create test users with different roles
    const owner = await prisma.restaurantUser.upsert({
      where: {
        restaurantId_email: {
          restaurantId: restaurant.id,
          email: 'owner@test.com',
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: 'owner@test.com',
        passwordHash,
        name: 'Test Owner',
        role: UserRole.OWNER,
      },
    });

    const manager = await prisma.restaurantUser.upsert({
      where: {
        restaurantId_email: {
          restaurantId: restaurant.id,
          email: 'manager@test.com',
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: 'manager@test.com',
        passwordHash,
        name: 'Test Manager',
        role: UserRole.MANAGER,
      },
    });

    const staff = await prisma.restaurantUser.upsert({
      where: {
        restaurantId_email: {
          restaurantId: restaurant.id,
          email: 'staff@test.com',
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: 'staff@test.com',
        passwordHash,
        name: 'Test Staff',
        role: UserRole.STAFF,
        tokenVersion: 0,
      },
    });

    console.log('✅ Test users created:');
    console.log(`   Owner: ${owner.email} (role: ${owner.role})`);
    console.log(`   Manager: ${manager.email} (role: ${manager.role})`);
    console.log(`   Staff: ${staff.email} (role: ${staff.role})`);
    console.log(`   Password for all: Password123!`);

    // Create a sample menu category
    const category = await prisma.menuCategory.upsert({
      where: {
        id: 'test-category-id',
      },
      update: {},
      create: {
        id: 'test-category-id',
        restaurantId: restaurant.id,
        name: 'Main Dishes',
        description: 'Our main dishes',
        displayOrder: 1,
      },
    });

    console.log('✅ Menu category created:', category.name);

    // Create sample menu items
    await prisma.menuItem.upsert({
      where: {
        id: 'test-item-1',
      },
      update: {},
      create: {
        id: 'test-item-1',
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 12.99,
        isAvailable: true,
        displayOrder: 1,
      },
    });

    await prisma.menuItem.upsert({
      where: {
        id: 'test-item-2',
      },
      update: {},
      create: {
        id: 'test-item-2',
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: 'Pepperoni Pizza',
        description: 'Pizza with pepperoni and cheese',
        price: 14.99,
        isAvailable: true,
        displayOrder: 2,
      },
    });

    console.log('✅ Menu items created');

    console.log('\n📝 Test credentials:');
    console.log('   Restaurant Slug: test-restaurant');
    console.log('   Email (Owner): owner@test.com');
    console.log('   Email (Manager): manager@test.com');
    console.log('   Email (Staff): staff@test.com');
    console.log('   Password: Password123!');
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
