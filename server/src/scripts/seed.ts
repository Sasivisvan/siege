import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User.js';
import { Exam } from '../models/Exam.js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment variables');
  process.exit(1);
}

import crypto from 'crypto';

if (process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: Seed script cannot be run in production.');
  process.exit(1);
}

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing users and exams...');
    await User.deleteMany({});
    await Exam.deleteMany({});

    // Generate strong random passwords
    const teacherPassword = crypto.randomBytes(12).toString('hex');
    const student1Password = crypto.randomBytes(12).toString('hex');
    const student2Password = crypto.randomBytes(12).toString('hex');

    // Create Recruiter (Teacher)
    console.log('Creating users (teachers and students)...');
    const recruiter = await User.create({
      email: 'teacher@siege.com',
      password: teacherPassword,
      name: 'John Doe (Teacher)',
      role: 'recruiter',
    });

    // Create Students
    const student1 = await User.create({
      email: 'student1@siege.com',
      password: student1Password,
      name: 'Alice Smith',
      role: 'candidate',
    });

    const student2 = await User.create({
      email: 'student2@siege.com',
      password: student2Password,
      name: 'Bob Johnson',
      role: 'candidate',
    });

    // Create an Exam with Questions
    console.log('Creating sample exam...');
    const exam = await Exam.create({
      title: 'Software Engineering Assessment 2026',
      description: 'A comprehensive test for software engineering candidates covering coding, logic, and core concepts.',
      duration: 120, // minutes
      createdBy: recruiter._id,
      settings: {
        webcamRequired: true,
        fullscreenRequired: true,
        copyPasteBlocked: true,
        tabSwitchLimit: 3,
        randomizeQuestions: false,
        showRiskToCandidate: false,
      },
      questions: [
        {
          type: 'coding',
          title: 'Two Sum',
          description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
          points: 50,
          timeLimit: 1800, // 30 minutes
          testCases: [
            { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
            { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: true },
          ],
        },
        {
          type: 'mcq',
          title: 'Database Normalization',
          description: 'Which normal form ensures that there are no transitive dependencies?',
          points: 10,
          options: ['1NF', '2NF', '3NF', 'BCNF'],
          correctOption: 2,
        },
        {
          type: 'aptitude',
          title: 'Number Series',
          description: 'Find the next number in the series: 2, 6, 12, 20, 30, ...',
          points: 10,
          options: ['40', '42', '44', '48'],
          correctOption: 1, // 42
        }
      ],
    });

    console.log('✅ Seed completed successfully!');
    console.log('--- CREDENTIALS ---');
    console.log(`Recruiter: ${recruiter.email} / ${teacherPassword}`);
    console.log(`Student 1: ${student1.email} / ${student1Password}`);
    console.log(`Student 2: ${student2.email} / ${student2Password}`);
    console.log('-------------------');
    console.log('Exam ID:', exam._id);

    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
