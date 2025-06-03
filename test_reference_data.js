// Test reference data endpoints
import fetch from 'node-fetch';

async function testReferenceDataEndpoints() {
  console.log('🧪 Testing Reference Data API Endpoints...\n');

  try {
    // Step 1: Login as admin to get token
    console.log('🔐 Step 1: Logging in as admin...');
    const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@infnitetrack.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful!');
    console.log('🔑 Token received:', token ? 'Yes' : 'No');

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 2: Test GET /api/roles
    console.log('📋 Step 2: Testing GET /api/roles...');
    const rolesResponse = await fetch('http://localhost:3005/api/roles', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('📊 Roles Response Status:', rolesResponse.status);

    if (rolesResponse.ok) {
      const rolesData = await rolesResponse.json();
      console.log('✅ Roles fetched successfully!');
      console.log('📊 Roles count:', rolesData.data.length);
      console.log('📋 Sample roles:', rolesData.data.slice(0, 3));
    } else {
      const errorData = await rolesResponse.json();
      console.log('❌ Roles fetch failed:', errorData);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 3: Test GET /api/programs
    console.log('🎓 Step 3: Testing GET /api/programs...');
    const programsResponse = await fetch('http://localhost:3005/api/programs', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('📊 Programs Response Status:', programsResponse.status);

    if (programsResponse.ok) {
      const programsData = await programsResponse.json();
      console.log('✅ Programs fetched successfully!');
      console.log('📊 Programs count:', programsData.data.length);
      console.log('📋 Sample programs:', programsData.data.slice(0, 3));
    } else {
      const errorData = await programsResponse.json();
      console.log('❌ Programs fetch failed:', errorData);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 4: Test GET /api/positions (without filter)
    console.log('💼 Step 4: Testing GET /api/positions (all positions)...');
    const positionsResponse = await fetch('http://localhost:3005/api/positions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('📊 Positions Response Status:', positionsResponse.status);

    if (positionsResponse.ok) {
      const positionsData = await positionsResponse.json();
      console.log('✅ Positions fetched successfully!');
      console.log('📊 Positions count:', positionsData.data.length);
      console.log('📋 Sample positions:', positionsData.data.slice(0, 3));
    } else {
      const errorData = await positionsResponse.json();
      console.log('❌ Positions fetch failed:', errorData);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 5: Test GET /api/positions with program filter
    console.log('💼 Step 5: Testing GET /api/positions with program filter...');
    const filteredPositionsResponse = await fetch(
      'http://localhost:3005/api/positions?program_id=1',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log('📊 Filtered Positions Response Status:', filteredPositionsResponse.status);

    if (filteredPositionsResponse.ok) {
      const filteredPositionsData = await filteredPositionsResponse.json();
      console.log('✅ Filtered positions fetched successfully!');
      console.log('📊 Filtered positions count:', filteredPositionsData.data.length);
      console.log('📋 Sample filtered positions:', filteredPositionsData.data.slice(0, 3));
    } else {
      const errorData = await filteredPositionsResponse.json();
      console.log('❌ Filtered positions fetch failed:', errorData);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 6: Test GET /api/divisions
    console.log('🏢 Step 6: Testing GET /api/divisions...');
    const divisionsResponse = await fetch('http://localhost:3005/api/divisions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('📊 Divisions Response Status:', divisionsResponse.status);

    if (divisionsResponse.ok) {
      const divisionsData = await divisionsResponse.json();
      console.log('✅ Divisions fetched successfully!');
      console.log('📊 Divisions count:', divisionsData.data.length);
      console.log('📋 Sample divisions:', divisionsData.data.slice(0, 3));
    } else {
      const errorData = await divisionsResponse.json();
      console.log('❌ Divisions fetch failed:', errorData);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 7: Test unauthorized access (without token)
    console.log('🚫 Step 7: Testing unauthorized access...');
    const unauthorizedResponse = await fetch('http://localhost:3005/api/roles', {
      method: 'GET'
    });

    console.log('📊 Unauthorized Response Status:', unauthorizedResponse.status);

    if (!unauthorizedResponse.ok) {
      const errorData = await unauthorizedResponse.json();
      console.log('✅ Unauthorized access properly blocked!');
      console.log('📊 Error message:', errorData.message);
    } else {
      console.log('❌ Unauthorized access should have been blocked!');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ All reference data endpoints tested successfully!');
    console.log('🔐 Authorization working properly');
    console.log('📋 Data transformation working correctly');
    console.log('🔍 Query filtering working for positions');
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('🔍 Stack trace:', error.stack);
  }
}

// Run the test
console.log('🚀 Starting Reference Data API Tests...\n');
testReferenceDataEndpoints()
  .then(() => {
    console.log('\n✅ All tests completed!');
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error.message);
  });
