# Troubleshooting Vercel 500 Errors

If you're encountering a 500 error with your Vercel deployment, follow these steps to diagnose and fix the issue.

## Common Causes of 500 Errors in Serverless Functions

1. **Missing Environment Variables**
   - Ensure all required environment variables are set in the Vercel dashboard
   - Check for typos in environment variable names

2. **Database Connection Issues**
   - Verify your database is accessible from Vercel's servers
   - Check if your database supports SSL connections (required by most cloud DB providers)
   - Ensure your database username/password is correct
   - Confirm your database allows connections from Vercel's IP ranges

3. **Cold Start Timeout**
   - Serverless functions have limited execution time for initialization
   - Database connections during cold starts can be slow
   - Consider optimizing your code to handle cold starts better

4. **Memory Limits**
   - Serverless functions have memory limitations
   - Large dependencies or operations might cause crashes

## Steps to Debug

1. **Check Vercel Logs**
   - Go to your Vercel dashboard → Project → Deployments → Latest deployment → Functions
   - Find the function that's failing and check its logs

2. **Test Your API Endpoints**
   - Try accessing the simplified health endpoints first:
     - `/api-status` - Should work even if DB connection fails
     - `/health` - Provides more detailed status information

3. **Verify Database Connection**
   - Make sure your database is running and accessible
   - Check that your database allows remote connections
   - Verify network/firewall rules

4. **Test Locally with Production Settings**
   - Create a `.env.production` file with your production settings
   - Run the application with `NODE_ENV=production` to simulate production environment

## Specific Fixes for Common Issues

### Database Connection Errors

If you're seeing database connection errors:

1. **Check Connection String**
   - Verify hostname, port, username, password, and database name
   - For MySQL: `mysql://username:password@hostname:port/database`

2. **SSL Requirements**
   - Most cloud databases require SSL connections
   - Make sure your `dialectOptions` in database.js includes proper SSL settings

3. **Connection Pooling**
   - Adjust pool settings in database.js for serverless environment:
   ```javascript
   pool: {
     max: 2, // Lower than default for serverless
     min: 0,
     acquire: 30000,
     idle: 10000
   }
   ```

### Memory or Timeout Issues

1. **Optimize Imports**
   - Only import necessary modules
   - Use dynamic imports for heavy dependencies

2. **Increase Function Size**
   - In vercel.json, set a higher value for maxLambdaSize:
   ```json
   "config": {
     "maxLambdaSize": "50mb"
   }
   ```

3. **Optimize Database Queries**
   - Avoid heavy queries during initialization
   - Use connection pooling efficiently

## Next Steps After Fixing

1. Redeploy your application after making changes
2. Monitor logs to ensure the error doesn't recur
3. Set up alerts for ongoing monitoring

Remember that serverless environments behave differently from traditional servers. Your code may need adaptation to work effectively in a serverless context. 