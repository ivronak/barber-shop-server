# Troubleshooting Database Connection Issues on Vercel

When deploying the Barber Shop API to Vercel, you might encounter database connection issues. This guide will help you resolve them.

## Checking Your Database Connection

First, visit the health endpoint to get information about your API status:
```
https://your-api-url.vercel.app/health
```

If you see a response like:
```json
{
  "status": "ok",
  "db": "disconnected",
  "db_config": {
    "host": "your-host.com",
    "database": "your_database",
    "username": "your_username"
  },
  "timestamp": "2025-06-10T02:18:52.024Z",
  "env": "production"
}
```

This means your API is running but can't connect to the database.

## Common Connection Issues

### 1. IP Whitelist / Firewall Settings

Most cloud database services restrict which IP addresses can connect to them. Vercel uses dynamic IP addresses for serverless functions, so you need to:

- Allow all IP addresses to connect to your database (not ideal for security)
- OR whitelist Vercel's IP ranges (check Vercel documentation for current ranges)
- OR use a database service that supports SSL connections without IP restrictions

### 2. Incorrect Environment Variables

Make sure you've set these environment variables in your Vercel project settings:
- `DB_HOST`: Your database hostname
- `DB_USERNAME`: Your database username
- `DB_PASSWORD`: Your database password
- `DB_NAME`: Your database name

### 3. SSL Requirements

Most cloud database providers require SSL connections. In our configuration, we've already enabled this, but make sure your database supports and requires SSL.

### 4. Connection Limits

Serverless environments can create many simultaneous connections. Ensure your database plan supports enough connections.

## Testing Your Database Connection

You can test your database connection from your local machine to verify credentials:

```bash
mysql -h YOUR_DB_HOST -u YOUR_DB_USERNAME -p YOUR_DB_NAME
```

Enter your password when prompted. If you can connect locally but not from Vercel, it's likely an IP whitelist issue.

## Using a Database Proxy Service

For persistent connections in a serverless environment, consider using:
- [PlanetScale](https://planetscale.com) - MySQL-compatible with serverless-friendly connections
- [Neon](https://neon.tech) - PostgreSQL with serverless-friendly connections
- [Supabase](https://supabase.com) - PostgreSQL with connection pooling

## Recommended Changes for Your Database Settings

1. If using Amazon RDS, Azure Database for MySQL, or similar:
   - Configure the security group/firewall to allow connections from anywhere (0.0.0.0/0)
   - Ensure your database user has proper permissions
   - Use a strong password and SSL

2. If using shared hosting:
   - Check if remote connections are allowed (many shared hosts restrict this)
   - Contact your hosting provider to allow connections from external sources

3. Consider a serverless-friendly database service like:
   - PlanetScale (MySQL compatible)
   - Neon (PostgreSQL)
   - Supabase (PostgreSQL)
   - MongoDB Atlas (Document database)

These services are designed to work well with serverless architectures like Vercel. 