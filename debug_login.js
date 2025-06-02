// Debug script to test login and inspect JWT token
import fetch from 'node-fetch';

async function testLogin() {
  try {
    // Test login
    const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: '240@email.com',
        password: 'Dicoding12'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

    if (loginData.success && loginData.data.token) {
      const token = loginData.data.token;
      console.log('\n=== Testing Users Endpoint ===');

      // Test users endpoint
      const usersResponse = await fetch('http://localhost:3005/api/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const usersData = await usersResponse.json();
      console.log('Users Response:', JSON.stringify(usersData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
