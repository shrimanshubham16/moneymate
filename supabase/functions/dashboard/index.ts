// Supabase Edge Function: Dashboard Data
// Replaces the Railway backend /dashboard endpoint

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database access (bypasses RLS for function)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the optimized PostgreSQL function
    const { data: dashboardData, error: dbError } = await supabaseAdmin
      .rpc('get_dashboard_data', {
        p_user_id: user.id,
        p_billing_period_id: null
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate health if not cached
    let health = null;
    if (dashboardData?.healthCache && !dashboardData.healthCache.isStale) {
      health = {
        remaining: dashboardData.healthCache.availableFunds,
        category: dashboardData.healthCache.healthCategory
      };
    } else {
      // Calculate fresh health using PostgreSQL function
      const { data: healthData, error: healthError } = await supabaseAdmin
        .rpc('calculate_user_health', { uid: user.id });
      
      if (!healthError && healthData) {
        health = healthData;
      }
    }

    // Format response to match existing API structure
    const response = {
      data: {
        incomes: dashboardData?.incomes || [],
        fixedExpenses: (dashboardData?.fixedExpenses || []).map((e: any) => ({
          ...e,
          is_sip_flag: e.isSipFlag
        })),
        variablePlans: (dashboardData?.variablePlans || []).map((plan: any) => {
          const actuals = (dashboardData?.variableActuals || [])
            .filter((a: any) => a.planId === plan.id);
          const actualTotal = actuals.reduce((sum: number, a: any) => sum + a.amount, 0);
          return { ...plan, actuals, actualTotal };
        }),
        investments: dashboardData?.investments || [],
        futureBombs: dashboardData?.futureBombs || [],
        health,
        constraintScore: dashboardData?.constraintScore || { score: 0, tier: 'green' },
        alerts: []
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



