/**
 * Overdue Checker Service
 * Runs periodically to check for overdue books and send notifications
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const checkOverdueBooks = async () => {
  try {
    // Find all overdue borrowings
    const overdueBorrowings = await prisma.borrowing.findMany({
      where: {
        status: 'BORROWED',
        expectedReturnDate: {
          lt: new Date()
        }
      },
      include: {
        user: true,
        book: true
      }
    });

    // Update status to OVERDUE
    for (const borrowing of overdueBorrowings) {
      await prisma.borrowing.update({
        where: { id: borrowing.id },
        data: { status: 'OVERDUE' }
      });

      // Create notification if not already sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: borrowing.userId,
          type: 'OVERDUE',
          createdAt: {
            gte: today
          },
          message: {
            contains: borrowing.book.title
          }
        }
      });

      if (!existingNotification) {
        const daysOverdue = Math.floor(
          (new Date() - new Date(borrowing.expectedReturnDate)) / (1000 * 60 * 60 * 24)
        );

        await prisma.notification.create({
          data: {
            userId: borrowing.userId,
            type: 'OVERDUE',
            title: 'Book Overdue',
            message: `Your book "${borrowing.book.title}" is overdue by ${daysOverdue} day(s). Please return it as soon as possible.`,
            isRead: false
          }
        });

        console.log(`Overdue notification sent to ${borrowing.user.email} for book "${borrowing.book.title}"`);
      }
    }

    console.log(`Overdue check completed. Found ${overdueBorrowings.length} overdue book(s).`);
  } catch (error) {
    console.error('Error checking overdue books:', error);
  }
};

export const startOverdueChecker = () => {
  // Run immediately
  checkOverdueBooks();

  // Run every 24 hours
  const interval = parseInt(process.env.OVERDUE_CHECK_INTERVAL) || 86400000; // 24 hours
  setInterval(checkOverdueBooks, interval);

  console.log('Overdue checker service started');
};
