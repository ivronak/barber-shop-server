require('dotenv').config();
const fetch = require('node-fetch');

async function testJojLogin() {
  try {
    
    
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
    
    
    
    // Get response body
    const loginData = await loginResponse.json();
    
    
    if (loginData.success && loginData.token) {
      
      
      // Test getting user profile
      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      
      
      const profileData = await profileResponse.json();
      
      
      if (profileData.success) {
        
      } else {
        
      }
    } else {
      
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testJojLogin(); 