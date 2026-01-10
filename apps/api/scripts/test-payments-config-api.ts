import axios from 'axios';

// Replace with your actual JWT token
const TOKEN = process.env.TEST_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTE1Mzk1NS02MmExLTQ5MzQtYTg1MS02ZGVjMzZhZmQxMjQiLCJyZXN0YXVyYW50SWQiOiI3OGEyOGZhNC1lNzdkLTQzNjMtYmMzYS1iNTVjYTQ1NDFmOTAiLCJyb2xlIjoiT1dORVIiLCJlbWFpbCI6Im93bmVyQGRlbW8uY29tIiwiaWF0IjoxNzY4MDY2NDQyLCJleHAiOjE3NjgwNjczNDJ9.QYuuSltF5vSe6FirgM-2wy8_NqLhWh57bP31_AKgNhM';

// Replace with your actual API URL if different
const API_URL = 'http://localhost:3000/api/v1/admin/payments/config';

async function testPaymentsConfig() {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json',
      },
    });
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', (error as Error).message);
    }
  }
}

testPaymentsConfig();