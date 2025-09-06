require('dotenv').config();
const fetch = require('node-fetch');

async function testJojLogin() {
  try {
    console.log('Testing Joj@barber.com login...');
    
    // API URL - using the Vercel deployment
    const API_URL = 'https://barber-shop-api-eight.vercel.app/api';
    
    // Test login
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/'
      },
      body: JSON.stringify({
        email: 'Joj@barber.com',
        password: 'Joj@barber.com'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    // Get response body
    const loginData = await loginResponse.json();
    console.log('Login response data:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success && loginData.token) {
      console.log('Login successful!');
      
      // Test getting user profile
      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      console.log('Profile response status:', profileResponse.status);
      
      const profileData = await profileResponse.json();
      console.log('Profile response data:', JSON.stringify(profileData, null, 2));
      
      if (profileData.success) {
        console.log('Got user profile successfully!');
      } else {
        console.log('Failed to get user profile');
      }
    } else {
      console.log('Login failed');
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testJojLogin(); 