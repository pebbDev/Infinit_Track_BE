import fetch from 'node-fetch';

// Cookie jar untuk menyimpan cookies seperti browser
let cookieJar = '';

// Helper function untuk extract cookies dari response
function extractCookies(response) {
  const setCookieHeader = response.headers.raw()['set-cookie'];
  if (setCookieHeader) {
    return setCookieHeader.map((cookie) => cookie.split(';')[0]).join('; ');
  }
  return '';
}

// Helper function untuk membuat request dengan cookies
async function fetchWithCookies(url, options = {}) {
  const headers = {
    ...options.headers,
    Cookie: cookieJar
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Update cookie jar dengan cookies baru
  const newCookies = extractCookies(response);
  if (newCookies) {
    cookieJar = newCookies;
  }

  return response;
}

async function testUserCRUD() {
  try {
    console.log('🔧 === TESTING USER CRUD ENDPOINTS ===\n');

    // Step 1: Login sebagai Admin
    console.log('🔑 Step 1: Login sebagai Admin...');
    const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        email: '240@email.com', // Admin user
        password: 'Dicoding12'
      })
    });

    cookieJar = extractCookies(loginResponse);

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Admin login successful!');
      console.log('👤 User:', loginData.data.full_name);
      console.log('🔑 Role:', loginData.data.role_name);
    } else {
      console.log('❌ Admin login failed');
      return;
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 2: Get all users to find a user to update
    console.log('👥 Step 2: Getting all users...');
    const usersResponse = await fetchWithCookies('http://localhost:3005/api/users');

    let testUserId = null;
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ Users fetched successfully!');
      console.log('👥 Total users:', usersData.data.length);

      // Find a user to test update (not the admin)
      const testUser = usersData.data.find((user) => user.email !== '240@email.com');
      if (testUser) {
        testUserId = testUser.id;
        console.log('🎯 Test user found:', testUser.full_name, `(ID: ${testUserId})`);
      }
    } else {
      console.log('❌ Failed to fetch users');
      return;
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 3: Test PATCH /users/:id (Update User)
    if (testUserId) {
      console.log('📝 Step 3: Testing PATCH /users/:id (Update User)...');

      const updateData = {
        full_name: 'Updated Test User',
        phone: '08123456789',
        nip_nim: 'TEST001UPDATED',
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 100,
        description: 'Updated WFH Location'
      };

      const updateResponse = await fetchWithCookies(
        `http://localhost:3005/api/users/${testUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      console.log('📊 Update Response Status:', updateResponse.status);

      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        console.log('✅ User update successful!');
        console.log('👤 Updated user:', updateResult.data.full_name);
        console.log('📱 Phone:', updateResult.data.phone);
        console.log('🔢 NIP/NIM:', updateResult.data.nip_nim);
        console.log('📍 Location updated:', updateResult.data.location ? 'Yes' : 'No');
        if (updateResult.data.location) {
          console.log('   - Latitude:', updateResult.data.location.latitude);
          console.log('   - Longitude:', updateResult.data.location.longitude);
          console.log('   - Radius:', updateResult.data.location.radius);
          console.log('   - Description:', updateResult.data.location.description);
        }
      } else {
        const errorData = await updateResponse.json();
        console.log('❌ User update failed:', errorData.message);
        console.log('🔍 Error details:', errorData);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 4: Test validation (try to update with invalid data)
    if (testUserId) {
      console.log('🔒 Step 4: Testing validation (invalid phone)...');

      const invalidUpdateData = {
        phone: 'invalid-phone', // Should be numeric
        password: '123' // Should be at least 8 characters
      };

      const validationResponse = await fetchWithCookies(
        `http://localhost:3005/api/users/${testUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invalidUpdateData)
        }
      );

      console.log('📊 Validation Response Status:', validationResponse.status);

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        console.log('✅ Validation working correctly!');
        console.log('❌ Error message:', errorData.message);
      } else {
        console.log("⚠️ Validation should have failed but didn't");
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 5: Test duplicate NIP/NIM validation
    if (testUserId) {
      console.log('🔄 Step 5: Testing duplicate NIP/NIM validation...');

      const duplicateNipData = {
        nip_nim: '240001' // Try to use existing NIP
      };

      const duplicateResponse = await fetchWithCookies(
        `http://localhost:3005/api/users/${testUserId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(duplicateNipData)
        }
      );

      console.log('📊 Duplicate NIP Response Status:', duplicateResponse.status);

      if (!duplicateResponse.ok) {
        const errorData = await duplicateResponse.json();
        console.log('✅ Duplicate NIP validation working!');
        console.log('❌ Error message:', errorData.message);
      } else {
        console.log('⚠️ Duplicate NIP validation should have failed');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 6: Test DELETE /users/:id (Soft Delete)
    if (testUserId) {
      console.log('🗑️ Step 6: Testing DELETE /users/:id (Soft Delete)...');

      const deleteResponse = await fetchWithCookies(
        `http://localhost:3005/api/users/${testUserId}`,
        {
          method: 'DELETE'
        }
      );

      console.log('📊 Delete Response Status:', deleteResponse.status);

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log('✅ User soft delete successful!');
        console.log('💬 Message:', deleteResult.message);

        // Verify user is no longer in the list
        const verifyResponse = await fetchWithCookies('http://localhost:3005/api/users');
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const deletedUser = verifyData.data.find((user) => user.id === testUserId);
          if (!deletedUser) {
            console.log('✅ User no longer appears in users list (soft deleted)');
          } else {
            console.log('⚠️ User still appears in users list');
          }
        }
      } else {
        const errorData = await deleteResponse.json();
        console.log('❌ User delete failed:', errorData.message);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Step 7: Test role restrictions (try with Management role)
    console.log('👑 Step 7: Testing role restrictions with Management...');

    // Reset cookie jar and login as Management
    cookieJar = '';

    const mgmtLoginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        email: 'diana123@email.com', // Management user
        password: 'Dicoding12'
      })
    });

    cookieJar = extractCookies(mgmtLoginResponse);

    if (mgmtLoginResponse.ok) {
      const mgmtLoginData = await mgmtLoginResponse.json();
      console.log('✅ Management login successful!');
      console.log('👤 User:', mgmtLoginData.data.full_name);

      // Try to update user (should work for Management)
      const mgmtUpdateResponse = await fetchWithCookies(`http://localhost:3005/api/users/5`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: 'Management Update Test'
        })
      });

      console.log('📊 Management Update Status:', mgmtUpdateResponse.status);
      console.log(
        mgmtUpdateResponse.ok
          ? '✅ Management can update users'
          : '❌ Management cannot update users'
      );

      // Try to delete user (should fail for Management - Admin only)
      const mgmtDeleteResponse = await fetchWithCookies(`http://localhost:3005/api/users/5`, {
        method: 'DELETE'
      });

      console.log('📊 Management Delete Status:', mgmtDeleteResponse.status);
      console.log(
        !mgmtDeleteResponse.ok
          ? '✅ Management correctly blocked from deleting users'
          : '❌ Management should not be able to delete users'
      );
    }

    console.log('\n🎉 === USER CRUD TESTING COMPLETED ===');
  } catch (error) {
    console.error('💥 Error during testing:', error.message);
  }
}

// Jalankan test
testUserCRUD();
