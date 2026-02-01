import { UserRepository } from '../repositories/userRepository';
import { NewUser } from '../types/userTypes';
import { db } from '../config/db';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function manualInsertUserTest() {
  const user: NewUser = {
    name: 'Simple User',
    email: 'teste_simples@example.com',
    password: 'password123'
  };

  try {
    console.log('Creating user...');
    const created = await UserRepository.createUser(user);

    if (!created) throw new Error('User was not created');

    if (created.email !== user.email) throw new Error('Email mismatch');
    if (created.name !== user.name) throw new Error('Name mismatch');
    if (created.password !== user.password) throw new Error('Password mismatch');
    if (!created.id) throw new Error('ID not returned');

    console.log('✅ Test passed.');
    console.log('Created user:', created);
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('Waiting 30 seconds before cleaning test user...');
    await delay(30000);
    console.log('Cleaning test user...');
    await db.query('DELETE FROM users WHERE email = $1', ['teste_simples@example.com']);
    await db.end();
  }
}

manualInsertUserTest();
console.log('Manual user insert test finished.');
