// Helper script to URL-encode password for connection string
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Password Encoder for Connection String');
console.log('Enter your database password (spaces will be encoded):\n');

rl.question('Password: ', (password) => {
  // URL encode the password
  const encoded = encodeURIComponent(password);
  
  console.log('\n✅ Encoded password:');
  console.log(encoded);
  console.log('\n📝 Use this in your connection string:');
  console.log(`postgresql://postgres.lvwpurwrktdblctzwctr:${encoded}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`);
  console.log('\n💡 Or update your .env file:');
  console.log(`SUPABASE_CONNECTION_STRING=postgresql://postgres.lvwpurwrktdblctzwctr:${encoded}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`);
  
  rl.close();
});


