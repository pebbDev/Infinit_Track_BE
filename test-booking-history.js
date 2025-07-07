#!/usr/bin/env node

/**
 * Test script for the new GET /api/bookings/history endpoint
 * Tests various filtering, pagination, and sorting scenarios
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'employee@infinitetrack.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

let authToken = '';

// Test scenarios
const testScenarios = [
  {
    name: 'Basic History Request',
    params: {}
  },
  {
    name: 'Filter by Status (approved)',
    params: { status: 'approved' }
  },
  {
    name: 'Pagination Test (page 1, limit 3)',
    params: { page: 1, limit: 3 }
  },
  {
    name: 'Sort by Schedule Date DESC',
    params: { sort_by: 'schedule_date', sort_order: 'DESC' }
  },
  {
    name: 'Sort by Status with Pagination',
    params: { sort_by: 'status', sort_order: 'ASC', page: 1, limit: 5 }
  },
  {
    name: 'Complex Filter + Sort',
    params: { status: 'pending', sort_by: 'created_at', sort_order: 'ASC', page: 1, limit: 2 }
  }
];

// Helper function to make authenticated requests
async function makeRequest(endpoint, params = {}) {
  try {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log(`\n🔍 Testing: ${url.toString()}`);
    
    const response = await axios.get(url.toString(), {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.response?.data || error.message);
    throw error;
  }
}

// Login function
async function login() {
  try {
    console.log('🔑 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test invalid parameters
async function testInvalidParams() {
  console.log('\n📋 === TESTING INVALID PARAMETERS ===');
  
  const invalidTests = [
    { name: 'Invalid Status', params: { status: 'invalid' } },
    { name: 'Invalid Page (0)', params: { page: 0 } },
    { name: 'Invalid Limit (101)', params: { limit: 101 } },
    { name: 'Invalid Sort Field', params: { sort_by: 'invalid_field' } },
    { name: 'Invalid Sort Order', params: { sort_order: 'INVALID' } }
  ];

  for (const test of invalidTests) {
    try {
      console.log(`\n❌ Testing ${test.name}:`);
      const result = await makeRequest('/api/bookings/history', test.params);
      console.log('⚠️  Expected error but got success:', result.message);
    } catch (error) {
      console.log('✅ Correctly rejected:', error.response?.data?.message || 'Error handled');
    }
  }
}

// Test valid scenarios
async function testValidScenarios() {
  console.log('\n📋 === TESTING VALID SCENARIOS ===');
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n✅ Testing: ${scenario.name}`);
      const result = await makeRequest('/api/bookings/history', scenario.params);
      
      // Log key response details
      console.log(`📊 Response Summary:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Message: ${result.message}`);
      console.log(`   - Total Items: ${result.data.pagination?.total_items || 0}`);
      console.log(`   - Current Page: ${result.data.pagination?.current_page || 1}`);
      console.log(`   - Items Returned: ${result.data.bookings?.length || 0}`);
      console.log(`   - Filters Applied: ${JSON.stringify(result.data.filters || {})}`);
      
      // Sample first booking if exists
      if (result.data.bookings?.length > 0) {
        const firstBooking = result.data.bookings[0];
        console.log(`   - Sample Booking: ID ${firstBooking.booking_id}, Status: ${firstBooking.status}, Date: ${firstBooking.schedule_date}`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed for ${scenario.name}:`, error.response?.data || error.message);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Booking History Endpoint Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_USER_EMAIL}`);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  try {
    // Test valid scenarios
    await testValidScenarios();
    
    // Test invalid parameters
    await testInvalidParams();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Summary:');
    console.log('   - New endpoint: GET /api/bookings/history');
    console.log('   - Features: Status filtering, pagination, sorting');
    console.log('   - Authentication: Required (Bearer token)');
    console.log('   - Response: Comprehensive booking data with metadata');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  });
}

export { runTests };
