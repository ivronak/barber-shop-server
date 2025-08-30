# Solving Database Connection Issues on Vercel

This guide provides detailed instructions for resolving the `ETIMEDOUT` database connection error when deploying to Vercel.

## Understanding the Error

The error message `connect ETIMEDOUT` indicates that the connection to your database server timed out. This typically happens for one of these reasons:

1. **IP Restriction**: Your database doesn't allow connections from Vercel's IP addresses
2. **Firewall Rules**: Your database has firewall rules blocking external connections
3. **Network Configuration**: Your database might not be configured for public access
4. **Incorrect Credentials**: The database credentials in your Vercel environment variables are incorrect

## Solutions to Try

### Option 1: Use a Serverless-Friendly Database

The most reliable solution is to use a database service designed for serverless architectures:

#### 1. PlanetScale (MySQL compatible)

PlanetScale is specifically designed to work with serverless environments and doesn't require IP whitelisting:

1. Create a free account at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Get your connection string from the "Connect" button
4. Update your Vercel environment variables:
   ```
   DB_HOST=<your-branch>.<your-database>.planetscale.io
   DB_USERNAME=<username from planetscale>
   DB_PASSWORD=<password from planetscale>
   DB_NAME=<database name>
   ```

#### 2. Neon (PostgreSQL)

If you're willing to switch to PostgreSQL:

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Get your connection details
4. Update your code to use PostgreSQL instead of MySQL

### Option 2: Configure Your Existing Database

If you want to keep using your current database, you need to:

#### 1. Allow connections from anywhere (less secure but works)

For MySQL on a cloud provider:
- Find the "Network Security" or "Connectivity" settings
- Add `0.0.0.0/0` to the allowed IP addresses
- Ensure SSL is required for all connections

For MySQL on shared hosting:
- Check if your hosting provider allows remote connections
- If they do, find the "Remote MySQL" or similar option in your control panel
- Add `%` as an allowed hostname

#### 2. Update Vercel Environment Variables

Ensure these environment variables are set correctly in the Vercel dashboard:

```
DB_HOST=<your-database-host>
DB_USERNAME=<your-database-username>
DB_PASSWORD=<your-database-password>
DB_NAME=<your-database-name>
NODE_ENV=production
```

### Option 3: Use a Database Proxy Service

Services like [Prisma Data Proxy](https://www.prisma.io/docs/data-platform/data-proxy) can help maintain stable connections between serverless functions and databases.

## Diagnosing Connection Issues

After deploying to Vercel, you can use these endpoints to diagnose issues:

1. `/health` - Shows basic API status and DB connection state
2. `/diag` - Provides detailed diagnostic information
3. `/api-status` - A simple endpoint that works even without DB connection

## Verifying Your Database Settings

Run these tests to check your database configuration:

1. Test connection from your local machine:
   ```bash
   mysql -h YOUR_DB_HOST -u YOUR_DB_USERNAME -p YOUR_DB_NAME
   ```

2. Check if your database allows external connections:
   ```sql
   SELECT host, user FROM mysql.user WHERE user = 'YOUR_DB_USERNAME';
   ```
   You should see either `%` or specific IP addresses in the `host` column.

3. Check if your database requires SSL:
   ```sql
   SHOW GLOBAL VARIABLES LIKE 'have_ssl';
   ```
   It should return 'YES'.

## Final Recommendation

For the best experience with serverless platforms like Vercel, we strongly recommend:

1. Using PlanetScale as your database provider
2. Keeping connection pooling minimal (max: 2 connections)
3. Implementing proper error handling in your code
4. Having non-database fallback endpoints for your API

If you continue to have issues, consider moving to a traditional hosting provider instead of serverless, as they better support persistent database connections. 