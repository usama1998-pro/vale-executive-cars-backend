import '../src/bootstrap-env';
import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '@prisma/client';
import * as readline from 'node:readline/promises';
import { getPrismaMariaDbAdapterConfig } from '../src/core/database/database-url';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const adapter = new PrismaMariaDb(getPrismaMariaDbAdapterConfig());
  const prisma = new PrismaClient({ adapter });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const email = (await rl.question('Email: ')).trim().toLowerCase();
    const password = (await rl.question('Password (min 8 chars): ')).trim();
    const password2 = (await rl.question('Password (again): ')).trim();

    if (!email || !password) {
      console.error('Email and password are required.');
      process.exitCode = 1;
      return;
    }
    if (password.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exitCode = 1;
      return;
    }
    if (password !== password2) {
      console.error('Passwords do not match.');
      process.exitCode = 1;
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.error('That email is already registered.');
      process.exitCode = 1;
      return;
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, password: hash, isAdmin: true },
    });
    console.log(`Created admin user ${user.id} (${user.email}).`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      console.error('Email is already in use.');
    } else {
      console.error(e);
    }
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

void main();
