/**
 * Script to set admin role for admin@lekbanken.no
 * 
 * Run with: node scripts/set-admin-role.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Loading env from:', envPath);
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (line.startsWith('#') || !line.trim()) return;
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    process.env[key] = value;
  }
});
/* eslint-enable @typescript-eslint/no-require-imports */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = 'admin@lekbanken.no';

async function setAdminRole() {
  console.log(`\n🔍 Looking for user: ${ADMIN_EMAIL}\n`);

  // 1. Find the user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error listing users:', authError.message);
    process.exit(1);
  }

  const adminUser = authData.users.find(u => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.error(`❌ User ${ADMIN_EMAIL} not found in auth.users`);
    console.log('\n📋 Available users:');
    authData.users.forEach(u => console.log(`   - ${u.email}`));
    process.exit(1);
  }

  console.log(`✅ Found user: ${adminUser.email}`);
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Current app_metadata: ${JSON.stringify(adminUser.app_metadata)}`);
  console.log(`   Current user_metadata: ${JSON.stringify(adminUser.user_metadata)}`);

  // 2. Update app_metadata to include role: "admin"
  console.log('\n🔧 Updating app_metadata.role to "admin"...');
  
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    {
      app_metadata: {
        ...adminUser.app_metadata,
        role: 'admin'
      }
    }
  );

  if (updateError) {
    console.error('❌ Error updating user:', updateError.message);
    process.exit(1);
  }

  console.log(`✅ app_metadata updated: ${JSON.stringify(updateData.user.app_metadata)}`);

  // 3. Check if user exists in public.users table
  console.log('\n🔍 Checking public.users table...');
  
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', adminUser.id)
    .maybeSingle();

  if (profileError) {
    console.error('⚠️ Error checking public.users:', profileError.message);
  } else if (!profileData) {
    console.log('⚠️ No profile found in public.users, creating one...');
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.user_metadata?.full_name || 'Admin',
        role: 'admin'
      });

    if (insertError) {
      console.error('❌ Error creating profile:', insertError.message);
    } else {
      console.log('✅ Profile created in public.users with role: admin');
    }
  } else {
    console.log(`   Current profile role: ${profileData.role}`);
    
    if (profileData.role !== 'admin') {
      console.log('🔧 Updating profile role to "admin"...');
      
      const { error: updateProfileError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', adminUser.id);

      if (updateProfileError) {
        console.error('❌ Error updating profile:', updateProfileError.message);
      } else {
        console.log('✅ Profile updated with role: admin');
      }
    } else {
      console.log('✅ Profile already has role: admin');
    }
  }

  console.log('\n🎉 Done! Admin role has been set for', ADMIN_EMAIL);
  console.log('\n📋 Summary:');
  console.log(`   - auth.users.app_metadata.role = "admin" ✅`);
  console.log(`   - public.users.role = "admin" ✅`);
}

setAdminRole().catch(console.error);
