require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skilltrading.com' },
    update: {},
    create: {
      email: 'admin@skilltrading.com',
      password: adminPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
      skc: 0,
    }
  });

  // Create sample users
  const userPassword = await bcrypt.hash('user123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: userPassword,
      fullName: 'Alice Nguyen',
      bio: 'Frontend developer with 3 years experience. Love teaching React and CSS!',
      skc: 250,
      transactions: {
        create: {
          type: 'BONUS',
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          description: 'Welcome bonus'
        }
      }
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      password: userPassword,
      fullName: 'Bob Tran',
      bio: 'Music teacher and guitarist. 5 years experience teaching guitar for beginners.',
      skc: 180,
      transactions: {
        create: {
          type: 'BONUS',
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          description: 'Welcome bonus'
        }
      }
    }
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      password: userPassword,
      fullName: 'Carol Le',
      bio: 'English tutor and language enthusiast. IELTS 8.0 scorer.',
      skc: 320,
      transactions: {
        create: {
          type: 'BONUS',
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          description: 'Welcome bonus'
        }
      }
    }
  });

  const user4 = await prisma.user.upsert({
    where: { email: 'david@example.com' },
    update: {},
    create: {
      email: 'david@example.com',
      password: userPassword,
      fullName: 'David Pham',
      bio: 'Data scientist and Python enthusiast. Love sharing knowledge!',
      skc: 150,
      transactions: {
        create: {
          type: 'BONUS',
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          description: 'Welcome bonus'
        }
      }
    }
  });

  // Create sample skills
  const skills = [
    {
      title: 'React.js for Beginners',
      description: 'Learn React.js from scratch. We will cover components, hooks, state management, and build real projects. Perfect for beginners with basic JavaScript knowledge.',
      category: 'Programming',
      price: 80,
      teacherId: user1.id,
      status: 'APPROVED',
      avgRating: 4.8,
      totalReviews: 12
    },
    {
      title: 'CSS & Tailwind Mastery',
      description: 'Master CSS and Tailwind CSS to build beautiful, responsive websites. Learn flexbox, grid, animations, and the utility-first workflow.',
      category: 'Programming',
      price: 60,
      teacherId: user1.id,
      status: 'APPROVED',
      avgRating: 4.6,
      totalReviews: 8
    },
    {
      title: 'Guitar Lessons for Beginners',
      description: 'Start your guitar journey! Learn basic chords, strumming patterns, and play your first songs. I have helped 50+ students start their musical journey.',
      category: 'Music',
      price: 50,
      teacherId: user2.id,
      status: 'APPROVED',
      avgRating: 4.9,
      totalReviews: 20
    },
    {
      title: 'IELTS Speaking Preparation',
      description: 'Intensive IELTS speaking preparation. Cover all parts of the speaking test, common topics, vocabulary building, and pronunciation improvement.',
      category: 'Language',
      price: 70,
      teacherId: user3.id,
      status: 'APPROVED',
      avgRating: 4.7,
      totalReviews: 15
    },
    {
      title: 'English Conversation Practice',
      description: 'Daily English conversation practice for intermediate learners. Improve fluency, expand vocabulary, and build confidence in speaking.',
      category: 'Language',
      price: 45,
      teacherId: user3.id,
      status: 'APPROVED',
      avgRating: 4.5,
      totalReviews: 10
    },
    {
      title: 'Python Data Analysis',
      description: 'Learn data analysis with Python, Pandas, and Matplotlib. Process real datasets, create visualizations, and derive insights.',
      category: 'Programming',
      price: 90,
      teacherId: user4.id,
      status: 'APPROVED',
      avgRating: 4.7,
      totalReviews: 6
    },
    {
      title: 'Machine Learning Basics',
      description: 'Introduction to machine learning concepts and algorithms using scikit-learn. Hands-on projects included.',
      category: 'Programming',
      price: 120,
      teacherId: user4.id,
      status: 'PENDING',
      avgRating: 0,
      totalReviews: 0
    },
    {
      title: 'Photo Editing with Lightroom',
      description: 'Learn professional photo editing with Adobe Lightroom. Color grading, retouching, and developing your personal style.',
      category: 'Design',
      price: 65,
      teacherId: user2.id,
      status: 'APPROVED',
      avgRating: 4.4,
      totalReviews: 5
    },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { id: skills.indexOf(skill) + 1 },
      update: {},
      create: skill
    });
  }

  console.log('✅ Seeding completed!');
  console.log('📧 Admin: admin@skilltrading.com / admin123');
  console.log('📧 User 1: alice@example.com / user123');
  console.log('📧 User 2: bob@example.com / user123');
  console.log('📧 User 3: carol@example.com / user123');
  console.log('📧 User 4: david@example.com / user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
