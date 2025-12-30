// Migration script: JSON file → Supabase (Direct PostgreSQL connection)
import * as pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

interface Store {
  users: any[];
  incomes: any[];
  fixedExpenses: any[];
  variablePlans: any[];
  variableActuals: any[];
  investments: any[];
  futureBombs: any[];
  creditCards: any[];
  loans: any[];
  activities: any[];
  preferences: any[];
  themeStates: any[];
  sharedAccounts: any[];
  sharedMembers: any[];
  sharingRequests: any[];
  constraint: any;
}

async function migrate() {
  console.log('🚀 Starting migration from JSON to Supabase (Direct PostgreSQL)...\n');
  
  // Step 1: Load JSON data
  const dataPath = path.join(__dirname, '../../data/finflow-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    process.exit(1);
  }
  
  console.log('📂 Loading data from JSON file...');
  const jsonData = fs.readFileSync(dataPath, 'utf-8');
  const store: Store = JSON.parse(jsonData);
  
  console.log(`✅ Loaded data:`);
  console.log(`   - Users: ${store.users.length}`);
  console.log(`   - Incomes: ${store.incomes.length}`);
  console.log(`   - Fixed Expenses: ${store.fixedExpenses.length}`);
  console.log(`   - Variable Plans: ${store.variablePlans.length}`);
  console.log(`   - Variable Actuals: ${store.variableActuals.length}`);
  console.log(`   - Investments: ${store.investments.length}`);
  console.log(`   - Future Bombs: ${store.futureBombs.length}`);
  console.log(`   - Credit Cards: ${store.creditCards.length}`);
  console.log(`   - Loans: ${store.loans.length}`);
  console.log(`   - Activities: ${store.activities.length}`);
  console.log(`   - Preferences: ${store.preferences?.length || 0}`);
  console.log(`   - Theme States: ${store.themeStates?.length || 0}`);
  console.log(`   - Shared Accounts: ${store.sharedAccounts?.length || 0}`);
  console.log(`   - Shared Members: ${store.sharedMembers?.length || 0}`);
  console.log(`   - Sharing Requests: ${store.sharingRequests?.length || 0}`);
  console.log('');
  
  // Step 2: Connect to PostgreSQL
  let connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ SUPABASE_CONNECTION_STRING not found in .env file');
    process.exit(1);
  }
  
  // For connection pooling, add pgbouncer parameter
  if (connectionString.includes(':6543/')) {
    console.log('ℹ️  Using connection pooling (port 6543)...');
    if (!connectionString.includes('pgbouncer=')) {
      connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
  }
  
  // Add SSL mode if not present
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  
  console.log('🔌 Connecting to Supabase PostgreSQL...');
  console.log(`   Using: ${connectionString.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs
  
  // Temporarily disable SSL verification for migration (Supabase uses self-signed certs)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const client = new Client({
    connectionString: connectionString
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase!\n');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // Step 3: Migrate constraint (single row)
    console.log('📊 Migrating constraint score...');
    try {
      await client.query(`
        INSERT INTO constraint_scores (id, score, tier, recent_overspends, decay_applied_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
          score = EXCLUDED.score,
          tier = EXCLUDED.tier,
          recent_overspends = EXCLUDED.recent_overspends,
          decay_applied_at = EXCLUDED.decay_applied_at,
          updated_at = NOW()
      `, [
        '00000000-0000-0000-0000-000000000001',
        store.constraint?.score || 100,
        store.constraint?.tier || 'green',
        store.constraint?.recentOverspends || 0,
        store.constraint?.decayAppliedAt || new Date().toISOString()
      ]);
      console.log('✅ Constraint score migrated');
      successCount++;
    } catch (error: any) {
      console.error('❌ Error migrating constraint:', error.message);
      errorCount++;
    }
    
    // Step 4: Migrate users
    console.log('\n👥 Migrating users...');
    if (store.users.length > 0) {
      try {
        for (const user of store.users) {
          await client.query(`
            INSERT INTO users (id, username, password_hash, created_at, failed_login_attempts, account_locked_until)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              password_hash = EXCLUDED.password_hash,
              failed_login_attempts = EXCLUDED.failed_login_attempts,
              account_locked_until = EXCLUDED.account_locked_until
          `, [
            user.id,
            user.username,
            user.passwordHash,
            user.createdAt || new Date().toISOString(),
            user.failedLoginAttempts || 0,
            user.accountLockedUntil || null
          ]);
        }
        console.log(`✅ Migrated ${store.users.length} users`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating users:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No users to migrate');
    }
    
    // Step 5: Migrate incomes
    console.log('\n💰 Migrating incomes...');
    if (store.incomes.length > 0) {
      try {
        for (const income of store.incomes) {
          await client.query(`
            INSERT INTO incomes (
              id, user_id, name, amount, category, frequency, start_date, end_date,
              name_encrypted, name_iv, amount_encrypted, amount_iv,
              description, description_encrypted, description_iv
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              amount = EXCLUDED.amount,
              category = EXCLUDED.category,
              frequency = EXCLUDED.frequency,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              name_encrypted = EXCLUDED.name_encrypted,
              name_iv = EXCLUDED.name_iv,
              amount_encrypted = EXCLUDED.amount_encrypted,
              amount_iv = EXCLUDED.amount_iv,
              description = EXCLUDED.description,
              description_encrypted = EXCLUDED.description_encrypted,
              description_iv = EXCLUDED.description_iv
          `, [
            income.id,
            income.userId,
            income.name || null,
            income.amount || null,
            income.category || null,
            income.frequency || null,
            income.startDate || null,
            income.endDate || null,
            income.name_encrypted || null,
            income.name_iv || null,
            income.amount_encrypted || null,
            income.amount_iv || null,
            income.description || null,
            income.description_encrypted || null,
            income.description_iv || null
          ]);
        }
        console.log(`✅ Migrated ${store.incomes.length} incomes`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating incomes:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No incomes to migrate');
    }
    
    // Step 6: Migrate fixed expenses
    console.log('\n💳 Migrating fixed expenses...');
    if (store.fixedExpenses.length > 0) {
      try {
        for (const exp of store.fixedExpenses) {
          await client.query(`
            INSERT INTO fixed_expenses (id, user_id, name, amount, frequency, category, is_sip, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              amount = EXCLUDED.amount,
              frequency = EXCLUDED.frequency,
              category = EXCLUDED.category,
              is_sip = EXCLUDED.is_sip,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date
          `, [
            exp.id,
            exp.userId,
            exp.name,
            exp.amount,
            exp.frequency,
            exp.category || null,
            exp.isSip || false,
            exp.startDate || null,
            exp.endDate || null
          ]);
        }
        console.log(`✅ Migrated ${store.fixedExpenses.length} fixed expenses`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating fixed expenses:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No fixed expenses to migrate');
    }
    
    // Step 7: Migrate variable plans
    console.log('\n📋 Migrating variable expense plans...');
    if (store.variablePlans.length > 0) {
      try {
        for (const plan of store.variablePlans) {
          await client.query(`
            INSERT INTO variable_expense_plans (id, user_id, name, planned, category, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              planned = EXCLUDED.planned,
              category = EXCLUDED.category,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date
          `, [
            plan.id,
            plan.userId,
            plan.name,
            plan.planned,
            plan.category || null,
            plan.startDate,
            plan.endDate || null
          ]);
        }
        console.log(`✅ Migrated ${store.variablePlans.length} variable plans`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating variable plans:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No variable plans to migrate');
    }
    
    // Step 8: Migrate variable actuals
    console.log('\n📝 Migrating variable expense actuals...');
    if (store.variableActuals.length > 0) {
      try {
        for (const actual of store.variableActuals) {
          await client.query(`
            INSERT INTO variable_expense_actuals (
              id, user_id, plan_id, amount, incurred_at, justification,
              subcategory, payment_mode, credit_card_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              plan_id = EXCLUDED.plan_id,
              amount = EXCLUDED.amount,
              incurred_at = EXCLUDED.incurred_at,
              justification = EXCLUDED.justification,
              subcategory = EXCLUDED.subcategory,
              payment_mode = EXCLUDED.payment_mode,
              credit_card_id = EXCLUDED.credit_card_id
          `, [
            actual.id,
            actual.userId,
            actual.planId,
            actual.amount,
            actual.incurredAt,
            actual.justification || null,
            actual.subcategory || 'Unspecified',
            actual.paymentMode || 'Cash',
            actual.creditCardId || null
          ]);
        }
        console.log(`✅ Migrated ${store.variableActuals.length} variable actuals`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating variable actuals:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No variable actuals to migrate');
    }
    
    // Step 9: Migrate investments
    console.log('\n📈 Migrating investments...');
    if (store.investments.length > 0) {
      try {
        for (const inv of store.investments) {
          await client.query(`
            INSERT INTO investments (id, user_id, name, goal, monthly_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              goal = EXCLUDED.goal,
              monthly_amount = EXCLUDED.monthly_amount,
              status = EXCLUDED.status
          `, [
            inv.id,
            inv.userId,
            inv.name,
            inv.goal || null,
            inv.monthlyAmount,
            inv.status || 'active'
          ]);
        }
        console.log(`✅ Migrated ${store.investments.length} investments`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating investments:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No investments to migrate');
    }
    
    // Step 10: Migrate future bombs
    console.log('\n💣 Migrating future bombs...');
    if (store.futureBombs.length > 0) {
      try {
        for (const bomb of store.futureBombs) {
          await client.query(`
            INSERT INTO future_bombs (id, user_id, name, due_date, total_amount, saved_amount, monthly_equivalent, preparedness_ratio)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              due_date = EXCLUDED.due_date,
              total_amount = EXCLUDED.total_amount,
              saved_amount = EXCLUDED.saved_amount,
              monthly_equivalent = EXCLUDED.monthly_equivalent,
              preparedness_ratio = EXCLUDED.preparedness_ratio
          `, [
            bomb.id,
            bomb.userId,
            bomb.name,
            bomb.dueDate,
            bomb.totalAmount,
            bomb.savedAmount || 0,
            bomb.monthlyEquivalent || null,
            bomb.preparednessRatio || 0
          ]);
        }
        console.log(`✅ Migrated ${store.futureBombs.length} future bombs`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating future bombs:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No future bombs to migrate');
    }
    
    // Step 11: Migrate credit cards
    console.log('\n💳 Migrating credit cards...');
    if (store.creditCards.length > 0) {
      try {
        for (const card of store.creditCards) {
          await client.query(`
            INSERT INTO credit_cards (
              id, user_id, name, statement_date, due_date, bill_amount,
              paid_amount, current_expenses, billing_date, needs_bill_update
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              statement_date = EXCLUDED.statement_date,
              due_date = EXCLUDED.due_date,
              bill_amount = EXCLUDED.bill_amount,
              paid_amount = EXCLUDED.paid_amount,
              current_expenses = EXCLUDED.current_expenses,
              billing_date = EXCLUDED.billing_date,
              needs_bill_update = EXCLUDED.needs_bill_update
          `, [
            card.id,
            card.userId,
            card.name,
            card.statementDate,
            card.dueDate,
            card.billAmount || 0,
            card.paidAmount || 0,
            card.currentExpenses || 0,
            card.billingDate || null,
            card.needsBillUpdate || false
          ]);
        }
        console.log(`✅ Migrated ${store.creditCards.length} credit cards`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating credit cards:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No credit cards to migrate');
    }
    
    // Step 12: Migrate loans
    console.log('\n🏦 Migrating loans...');
    if (store.loans.length > 0) {
      try {
        for (const loan of store.loans) {
          await client.query(`
            INSERT INTO loans (id, user_id, name, principal, remaining_tenure_months, emi)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              name = EXCLUDED.name,
              principal = EXCLUDED.principal,
              remaining_tenure_months = EXCLUDED.remaining_tenure_months,
              emi = EXCLUDED.emi
          `, [
            loan.id,
            loan.userId,
            loan.name,
            loan.principal,
            loan.remainingTenureMonths,
            loan.emi
          ]);
        }
        console.log(`✅ Migrated ${store.loans.length} loans`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating loans:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No loans to migrate');
    }
    
    // Step 13: Migrate activities
    console.log('\n📜 Migrating activities...');
    if (store.activities.length > 0) {
      try {
        for (const activity of store.activities) {
          await client.query(`
            INSERT INTO activities (id, actor_id, entity, action, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              actor_id = EXCLUDED.actor_id,
              entity = EXCLUDED.entity,
              action = EXCLUDED.action,
              payload = EXCLUDED.payload,
              created_at = EXCLUDED.created_at
          `, [
            activity.id,
            activity.actorId,
            activity.entity,
            activity.action,
            JSON.stringify(activity.payload),
            activity.createdAt
          ]);
        }
        console.log(`✅ Migrated ${store.activities.length} activities`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating activities:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No activities to migrate');
    }
    
    // Step 14: Migrate preferences
    console.log('\n⚙️ Migrating preferences...');
    if (store.preferences && store.preferences.length > 0) {
      try {
        for (const pref of store.preferences) {
          await client.query(`
            INSERT INTO user_preferences (user_id, month_start_day, currency, timezone, use_prorated, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              month_start_day = EXCLUDED.month_start_day,
              currency = EXCLUDED.currency,
              timezone = EXCLUDED.timezone,
              use_prorated = EXCLUDED.use_prorated,
              updated_at = NOW()
          `, [
            pref.userId,
            pref.monthStartDay || 1,
            pref.currency || 'INR',
            pref.timezone || 'Asia/Kolkata',
            pref.useProrated || false
          ]);
        }
        console.log(`✅ Migrated ${store.preferences.length} preferences`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating preferences:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No preferences to migrate');
    }
    
    // Step 15: Migrate theme states
    console.log('\n🎨 Migrating theme states...');
    if (store.themeStates && store.themeStates.length > 0) {
      try {
        for (const theme of store.themeStates) {
          await client.query(`
            INSERT INTO theme_states (id, owner_ref, mode, selected_theme, constraint_tier_effect)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              owner_ref = EXCLUDED.owner_ref,
              mode = EXCLUDED.mode,
              selected_theme = EXCLUDED.selected_theme,
              constraint_tier_effect = EXCLUDED.constraint_tier_effect
          `, [
            theme.id,
            theme.ownerRef,
            theme.mode || 'health_auto',
            theme.selectedTheme || null,
            theme.constraintTierEffect !== false
          ]);
        }
        console.log(`✅ Migrated ${store.themeStates.length} theme states`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating theme states:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No theme states to migrate');
    }
    
    // Step 16: Migrate shared accounts
    console.log('\n👥 Migrating shared accounts...');
    if (store.sharedAccounts && store.sharedAccounts.length > 0) {
      try {
        for (const account of store.sharedAccounts) {
          await client.query(`
            INSERT INTO shared_accounts (id, name)
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
          `, [account.id, account.name]);
        }
        console.log(`✅ Migrated ${store.sharedAccounts.length} shared accounts`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating shared accounts:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No shared accounts to migrate');
    }
    
    // Step 17: Migrate shared members
    console.log('\n👥 Migrating shared members...');
    if (store.sharedMembers && store.sharedMembers.length > 0) {
      try {
        for (const member of store.sharedMembers) {
          await client.query(`
            INSERT INTO shared_members (id, shared_account_id, user_id, role, merge_finances)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
              shared_account_id = EXCLUDED.shared_account_id,
              user_id = EXCLUDED.user_id,
              role = EXCLUDED.role,
              merge_finances = EXCLUDED.merge_finances
          `, [
            member.id,
            member.sharedAccountId,
            member.userId,
            member.role,
            member.mergeFinances || false
          ]);
        }
        console.log(`✅ Migrated ${store.sharedMembers.length} shared members`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating shared members:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No shared members to migrate');
    }
    
    // Step 18: Migrate sharing requests
    console.log('\n📨 Migrating sharing requests...');
    if (store.sharingRequests && store.sharingRequests.length > 0) {
      try {
        for (const request of store.sharingRequests) {
          await client.query(`
            INSERT INTO sharing_requests (
              id, inviter_id, invitee_email, invitee_id, role, merge_finances, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              inviter_id = EXCLUDED.inviter_id,
              invitee_email = EXCLUDED.invitee_email,
              invitee_id = EXCLUDED.invitee_id,
              role = EXCLUDED.role,
              merge_finances = EXCLUDED.merge_finances,
              status = EXCLUDED.status
          `, [
            request.id,
            request.inviterId,
            request.inviteeEmail || null,
            request.inviteeId || null,
            request.role,
            request.mergeFinances || false,
            request.status || 'pending'
          ]);
        }
        console.log(`✅ Migrated ${store.sharingRequests.length} sharing requests`);
        successCount++;
      } catch (error: any) {
        console.error('❌ Error migrating sharing requests:', error.message);
        errorCount++;
      }
    } else {
      console.log('⚠️  No sharing requests to migrate');
    }
    
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount} tables`);
  console.log(`❌ Errors: ${errorCount} tables`);
  console.log('='.repeat(50));
  
  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All data has been migrated to Supabase');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify data in Supabase Table Editor');
    console.log('   2. Update backend code to use Supabase');
    console.log('   3. Test all endpoints');
    console.log('   4. Disable maintenance mode');
    console.log('   5. Deploy to production');
  } else {
    console.log('\n⚠️  Migration completed with errors');
    console.log('   Please review the errors above and fix them');
    process.exit(1);
  }
}

// Run migration
migrate().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

