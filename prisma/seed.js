import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.local' },
    update: {},
    create: {
      email: 'admin@library.local',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      phone: '+1234567890',
      status: 'ACTIVE'
    }
  });

  console.log('✓ Admin user created');

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@library.local' },
    update: {},
    create: {
      email: 'staff@library.local',
      password: staffPassword,
      fullName: 'Library Staff',
      role: 'STAFF',
      phone: '+1234567891',
      status: 'ACTIVE'
    }
  });

  console.log('✓ Staff user created');

  // Create regular users
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      password: userPassword,
      fullName: 'John Doe',
      role: 'USER',
      phone: '+1234567892',
      status: 'ACTIVE'
    }
  });

  console.log('✓ Regular users created');

  // Create categories
  const categories = [
    { name: 'Computer Science', description: 'Programming, Algorithms, AI, Data Structures' },
    { name: 'Mathematics', description: 'Calculus, Algebra, Statistics, Probability' },
    { name: 'Physics', description: 'Mechanics, Thermodynamics, Quantum Physics' },
    { name: 'Literature', description: 'Novels, Poetry, Drama, Fiction' },
    { name: 'History', description: 'World History, Ancient Civilizations' }
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
    createdCategories.push(category);
  }

  console.log('✓ Categories created');

  // Create shelves
  const shelves = [
    { shelfCode: 'CS-A-01', location: 'Building A, Floor 1, Section A', floor: 1, capacity: 100 },
    { shelfCode: 'CS-A-02', location: 'Building A, Floor 1, Section B', floor: 1, capacity: 100 },
    { shelfCode: 'MATH-B-01', location: 'Building B, Floor 2, Section A', floor: 2, capacity: 80 },
    { shelfCode: 'LIT-C-01', location: 'Building C, Floor 1, Section A', floor: 1, capacity: 120 }
  ];

  const createdShelves = [];
  for (const shelf of shelves) {
    const createdShelf = await prisma.shelf.upsert({
      where: { shelfCode: shelf.shelfCode },
      update: {},
      create: shelf
    });
    createdShelves.push(createdShelf);
  }

  console.log('✓ Shelves created');

  // Create sample books
  const books = [
    {
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      isbn: '978-0262033848',
      categoryId: createdCategories[0].id,
      shelfId: createdShelves[0].id,
      copiesTotal: 3,
      copiesAvailable: 3,
      publicationYear: 2009,
      description: 'Comprehensive guide to algorithms and data structures'
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      categoryId: createdCategories[0].id,
      shelfId: createdShelves[0].id,
      copiesTotal: 2,
      copiesAvailable: 2,
      publicationYear: 2008,
      description: 'A handbook of agile software craftsmanship'
    },
    {
      title: 'Calculus: Early Transcendentals',
      author: 'James Stewart',
      isbn: '978-1285741550',
      categoryId: createdCategories[1].id,
      shelfId: createdShelves[2].id,
      copiesTotal: 5,
      copiesAvailable: 5,
      publicationYear: 2015,
      description: 'Comprehensive calculus textbook'
    },
    {
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '978-0061120084',
      categoryId: createdCategories[3].id,
      shelfId: createdShelves[3].id,
      copiesTotal: 4,
      copiesAvailable: 4,
      publicationYear: 1960,
      description: 'Classic American novel'
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: '978-0451524935',
      categoryId: createdCategories[3].id,
      shelfId: createdShelves[3].id,
      copiesTotal: 3,
      copiesAvailable: 3,
      publicationYear: 1949,
      description: 'Dystopian social science fiction novel'
    }
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: book
    });
  }

  console.log('✓ Sample books created');
  console.log('\nSeed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin@library.local / admin123');
  console.log('Staff: staff@library.local / staff123');
  console.log('User:  john@example.com / user123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
