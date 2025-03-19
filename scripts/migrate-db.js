const { execSync } = require('child_process');
const path = require('path');

async function main() {
  try {
    console.log('Running Prisma migration...');
    
    // Generate migration files
    execSync('npx prisma migrate dev --name add_document_model', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('Database migration completed successfully!');

    // Generate Prisma client
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('Prisma client generated successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
