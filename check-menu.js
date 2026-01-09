const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMenu() {
  try {
    // Get all restaurants
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, slug: true }
    });
    
    console.log('\n=== RESTAURANTS ===');
    restaurants.forEach(r => {
      console.log(`${r.name} (${r.slug}) - ID: ${r.id}`);
    });

    // Get menu items for each restaurant
    for (const restaurant of restaurants) {
      console.log(`\n\n=== MENU FOR: ${restaurant.name} ===`);
      
      const categories = await prisma.menuCategory.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        include: {
          menuItems: {
            where: { isAvailable: true },
            include: { inventory: true },
            orderBy: { displayOrder: 'asc' }
          }
        },
        orderBy: { displayOrder: 'asc' }
      });

      if (categories.length === 0) {
        console.log('No menu categories found');
      }

      categories.forEach(cat => {
        console.log(`\nCategory: ${cat.name}`);
        console.log('-'.repeat(50));
        
        if (cat.menuItems.length === 0) {
          console.log('  No items in this category');
        }
        
        cat.menuItems.forEach(item => {
          const stock = item.inventory ? `Stock: ${item.inventory.quantity}` : 'No inventory tracking';
          console.log(`  - ${item.name} ($${item.price}) - ${stock}`);
          if (item.description) {
            console.log(`    ${item.description}`);
          }
        });
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenu();
