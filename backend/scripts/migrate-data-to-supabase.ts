// Migration script: JSON file → Supabase
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

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
  console.log('🚀 Starting migration from JSON to Supabase...\n');
  
  // Step 1: Load JSON data
  const dataPath = path.join(__dirname, '../../data/finflow-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    console.log('\n💡 Options:');
    console.log('   1. Download from Railway volume');
    console.log('   2. Use Railway CLI to download');
    console.log('   3. Create admin export endpoint');
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
  
  let successCount = 0;
  let errorCount = 0;
  
  // Step 2: Migrate constraint (single row)
  console.log('📊 Migrating constraint score...');
  try {
    const { error } = await supabase
      .from('constraint_scores')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        score: store.constraint?.score || 100,
        tier: store.constraint?.tier || 'green',
        recent_overspends: store.constraint?.recentOverspends || 0,
        decay_applied_at: store.constraint?.decayAppliedAt || new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) throw error;
    console.log('✅ Constraint score migrated');
    successCount++;
  } catch (error: any) {
    console.error('❌ Error migrating constraint:', error.message);
    errorCount++;
  }
  
  // Step 3: Migrate users
  console.log('\n👥 Migrating users...');
  if (store.users.length > 0) {
    try {
      const usersData = store.users.map(user => ({
        id: user.id,
        username: user.username,
        password_hash: user.passwordHash,
        created_at: user.createdAt || new Date().toISOString(),
        failed_login_attempts: user.failedLoginAttempts || 0,
        account_locked_until: user.accountLockedUntil || null
      }));
      
      const { error } = await supabase
        .from('users')
        .upsert(usersData, { onConflict: 'id' });
      
      if (error) throw error;
      console.log(`✅ Migrated ${store.users.length} users`);
      successCount++;
    } catch (error: any) {
      console.error('❌ Error migrating users:', error.message);
      errorCount++;
    }
  } else {
    console.log('⚠️  No users to migrate');
  }
  
  // Step 4: Migrate incomes
  console.log('\n💰 Migrating incomes...');
  if (store.incomes.length > 0) {
    try {
      const incomesData = store.incomes.map(income => ({
        id: income.id,
        user_id: income.userId,
        name: income.name,
        amount: income.amount,
        category: income.category,
        frequency: income.frequency,
        start_date: income.startDate,
        end_date: income.endDate,
        name_encrypted: income.name_encrypted,
        name_iv: income.name_iv,
        amount_encrypted: income.amount_encrypted,
        amount_iv: income.amount_iv,
        description: income.description,
        description_encrypted: income.description_encrypted,
        description_iv: income.description_iv
      }));
      
      // Insert in batches of 100
      for (let i = 0; i < incomesData.length; i += 100) {
        const batch = incomesData.slice(i, i + 100);
        const { error } = await supabase.from('incomes').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 5: Migrate fixed expenses
  console.log('\n💳 Migrating fixed expenses...');
  if (store.fixedExpenses.length > 0) {
    try {
      const expensesData = store.fixedExpenses.map(exp => ({
        id: exp.id,
        user_id: exp.userId,
        name: exp.name,
        amount: exp.amount,
        frequency: exp.frequency,
        category: exp.category,
        is_sip: exp.isSip || false,
        start_date: exp.startDate,
        end_date: exp.endDate
      }));
      
      for (let i = 0; i < expensesData.length; i += 100) {
        const batch = expensesData.slice(i, i + 100);
        const { error } = await supabase.from('fixed_expenses').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 6: Migrate variable plans
  console.log('\n📋 Migrating variable expense plans...');
  if (store.variablePlans.length > 0) {
    try {
      const plansData = store.variablePlans.map(plan => ({
        id: plan.id,
        user_id: plan.userId,
        name: plan.name,
        planned: plan.planned,
        category: plan.category,
        start_date: plan.startDate,
        end_date: plan.endDate
      }));
      
      for (let i = 0; i < plansData.length; i += 100) {
        const batch = plansData.slice(i, i + 100);
        const { error } = await supabase.from('variable_expense_plans').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 7: Migrate variable actuals
  console.log('\n📝 Migrating variable expense actuals...');
  if (store.variableActuals.length > 0) {
    try {
      const actualsData = store.variableActuals.map(actual => ({
        id: actual.id,
        user_id: actual.userId,
        plan_id: actual.planId,
        amount: actual.amount,
        incurred_at: actual.incurredAt,
        justification: actual.justification,
        subcategory: actual.subcategory || 'Unspecified',
        payment_mode: actual.paymentMode || 'Cash',
        credit_card_id: actual.creditCardId || null
      }));
      
      for (let i = 0; i < actualsData.length; i += 100) {
        const batch = actualsData.slice(i, i + 100);
        const { error } = await supabase.from('variable_expense_actuals').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 8: Migrate investments
  console.log('\n📈 Migrating investments...');
  if (store.investments.length > 0) {
    try {
      const investmentsData = store.investments.map(inv => ({
        id: inv.id,
        user_id: inv.userId,
        name: inv.name,
        goal: inv.goal,
        monthly_amount: inv.monthlyAmount,
        status: inv.status || 'active'
      }));
      
      for (let i = 0; i < investmentsData.length; i += 100) {
        const batch = investmentsData.slice(i, i + 100);
        const { error } = await supabase.from('investments').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 9: Migrate future bombs
  console.log('\n💣 Migrating future bombs...');
  if (store.futureBombs.length > 0) {
    try {
      const bombsData = store.futureBombs.map(bomb => ({
        id: bomb.id,
        user_id: bomb.userId,
        name: bomb.name,
        due_date: bomb.dueDate,
        total_amount: bomb.totalAmount,
        saved_amount: bomb.savedAmount,
        monthly_equivalent: bomb.monthlyEquivalent,
        preparedness_ratio: bomb.preparednessRatio
      }));
      
      for (let i = 0; i < bombsData.length; i += 100) {
        const batch = bombsData.slice(i, i + 100);
        const { error } = await supabase.from('future_bombs').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 10: Migrate credit cards
  console.log('\n💳 Migrating credit cards...');
  if (store.creditCards.length > 0) {
    try {
      const cardsData = store.creditCards.map(card => ({
        id: card.id,
        user_id: card.userId,
        name: card.name,
        statement_date: card.statementDate,
        due_date: card.dueDate,
        bill_amount: card.billAmount,
        paid_amount: card.paidAmount,
        current_expenses: card.currentExpenses || 0,
        billing_date: card.billingDate,
        needs_bill_update: card.needsBillUpdate || false
      }));
      
      for (let i = 0; i < cardsData.length; i += 100) {
        const batch = cardsData.slice(i, i + 100);
        const { error } = await supabase.from('credit_cards').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 11: Migrate loans
  console.log('\n🏦 Migrating loans...');
  if (store.loans.length > 0) {
    try {
      const loansData = store.loans.map(loan => ({
        id: loan.id,
        user_id: loan.userId,
        name: loan.name,
        principal: loan.principal,
        remaining_tenure_months: loan.remainingTenureMonths,
        emi: loan.emi
      }));
      
      for (let i = 0; i < loansData.length; i += 100) {
        const batch = loansData.slice(i, i + 100);
        const { error } = await supabase.from('loans').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 12: Migrate activities
  console.log('\n📜 Migrating activities...');
  if (store.activities.length > 0) {
    try {
      const activitiesData = store.activities.map(activity => ({
        id: activity.id,
        actor_id: activity.actorId,
        entity: activity.entity,
        action: activity.action,
        payload: activity.payload,
        created_at: activity.createdAt
      }));
      
      for (let i = 0; i < activitiesData.length; i += 100) {
        const batch = activitiesData.slice(i, i + 100);
        const { error } = await supabase.from('activities').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 13: Migrate preferences
  console.log('\n⚙️ Migrating preferences...');
  if (store.preferences && store.preferences.length > 0) {
    try {
      const prefsData = store.preferences.map(pref => ({
        user_id: pref.userId,
        month_start_day: pref.monthStartDay || 1,
        currency: pref.currency || 'INR',
        timezone: pref.timezone || 'Asia/Kolkata',
        use_prorated: pref.useProrated || false
      }));
      
      for (let i = 0; i < prefsData.length; i += 100) {
        const batch = prefsData.slice(i, i + 100);
        const { error } = await supabase.from('user_preferences').upsert(batch, { onConflict: 'user_id' });
        if (error) throw error;
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
  
  // Step 14: Migrate theme states
  console.log('\n🎨 Migrating theme states...');
  if (store.themeStates && store.themeStates.length > 0) {
    try {
      const themesData = store.themeStates.map(theme => ({
        id: theme.id,
        owner_ref: theme.ownerRef,
        mode: theme.mode || 'health_auto',
        selected_theme: theme.selectedTheme,
        constraint_tier_effect: theme.constraintTierEffect !== false
      }));
      
      for (let i = 0; i < themesData.length; i += 100) {
        const batch = themesData.slice(i, i + 100);
        const { error } = await supabase.from('theme_states').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 15: Migrate shared accounts
  console.log('\n👥 Migrating shared accounts...');
  if (store.sharedAccounts && store.sharedAccounts.length > 0) {
    try {
      const accountsData = store.sharedAccounts.map(account => ({
        id: account.id,
        name: account.name
      }));
      
      for (let i = 0; i < accountsData.length; i += 100) {
        const batch = accountsData.slice(i, i + 100);
        const { error } = await supabase.from('shared_accounts').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 16: Migrate shared members
  console.log('\n👥 Migrating shared members...');
  if (store.sharedMembers && store.sharedMembers.length > 0) {
    try {
      const membersData = store.sharedMembers.map(member => ({
        id: member.id,
        shared_account_id: member.sharedAccountId,
        user_id: member.userId,
        role: member.role,
        merge_finances: member.mergeFinances || false
      }));
      
      for (let i = 0; i < membersData.length; i += 100) {
        const batch = membersData.slice(i, i + 100);
        const { error } = await supabase.from('shared_members').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
  
  // Step 17: Migrate sharing requests
  console.log('\n📨 Migrating sharing requests...');
  if (store.sharingRequests && store.sharingRequests.length > 0) {
    try {
      const requestsData = store.sharingRequests.map(request => ({
        id: request.id,
        inviter_id: request.inviterId,
        invitee_email: request.inviteeEmail,
        invitee_id: request.inviteeId,
        role: request.role,
        merge_finances: request.mergeFinances || false,
        status: request.status || 'pending'
      }));
      
      for (let i = 0; i < requestsData.length; i += 100) {
        const batch = requestsData.slice(i, i + 100);
        const { error } = await supabase.from('sharing_requests').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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
    console.log('   4. Deploy to production');
  } else {
    console.log('\n⚠️  Migration completed with errors');
    console.log('   Please review the errors above and fix them');
  }
}

// Run migration
migrate().catch(console.error);


