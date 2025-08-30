# Deploying the Barber Shop API to Vercel

This guide will help you deploy the Barber Shop API to Vercel.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. [Vercel CLI](https://vercel.com/cli) installed (optional for direct deployments)
3. A production MySQL database (e.g., PlanetScale, Amazon RDS, DigitalOcean, etc.)

## Deployment Steps

### 1. Set up your production database

Ensure you have a MySQL database set up in production with the same schema as your development database.

### 2. Set up environment variables in Vercel

When deploying to Vercel, you'll need to configure environment variables. Go to your project settings in the Vercel dashboard and add the following environment variables:

```
NODE_ENV=production
DB_USERNAME=your_production_db_username
DB_PASSWORD=your_production_db_password
DB_NAME=your_production_db_name
DB_HOST=your_production_db_host
JWT_SECRET=your_strong_jwt_secret_key_for_production
```

Add any other environment variables you need for your application (email settings, etc.).

### 3. Deploy to Vercel

#### Option 1: Using GitHub Integration (Recommended)

1. Push your code to a GitHub repository
2. Log in to your Vercel account
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Set the Framework Preset to "Other"
   - Ensure the Root Directory is correct (if your API is in a subdirectory)
   - Configure the Build and Output settings if needed
6. Click "Deploy"

#### Option 2: Using Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Deploy from your project directory: `vercel`
4. Follow the prompts to configure your deployment

### 4. Verify Deployment

After deployment is complete, test your API by accessing the health check endpoint:

```
https://your-vercel-url.vercel.app/health
```

If everything is set up correctly, you should receive a response: `{"status":"ok"}`.

### Important Notes

1. **Database Migration**: You'll need to run migrations on your production database. This can be done by:
   - Temporarily changing your .env file to point to the production database and running `npm run migrate` locally
   - Setting up a one-time deployment script to run migrations

2. **Cold Starts**: Serverless functions on Vercel may experience cold starts. The first request after a period of inactivity might be slower.

3. **Connection Limits**: Be aware of database connection limits. In a serverless environment, each function invocation might create a new connection.

4. **Logs**: Check Vercel logs if you encounter any issues during deployment or runtime.

5. **Custom Domains**: You can configure a custom domain for your API in the Vercel project settings.

## Troubleshooting

If you encounter issues with your deployment, check:

1. Environment variables are correctly set
2. Database connection is properly configured
3. Vercel logs for any error messages
4. Network rules/firewall settings allow connections to your database from Vercel's IP ranges

For more help, refer to [Vercel's documentation](https://vercel.com/docs) or open an issue in the project repository. 