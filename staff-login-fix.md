# Staff Login Fix

This document provides instructions to fix the staff login issue where staff members can't log in but admin users can.

## Issue Identified

The issue is related to how staff users are authenticated and handled in both the frontend and backend:

1. In the backend, when a staff user logs in, the API doesn't include the staff-specific details in the login response.
2. In the frontend, the User type doesn't include a staff property to store these details.
3. When a staff user logs in, the frontend tries to navigate to the staff dashboard but doesn't have the necessary staff data.

## Backend Fix

1. Update the `auth.controller.js` file to include staff details in the login response:

```javascript
// In src/controllers/auth.controller.js - login function
exports.login = async (req, res) => {
  try {
    // ... existing code ...
    
    // If user is staff, include staff details
    let staffDetails = null;
    if (user.role === 'staff') {
      staffDetails = await Staff.findOne({ where: { user_id: user.id } });
    }
    
    // Return token and user info
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        image: user.image,
        staff: staffDetails
      }
    });
  } catch (error) {
    // ... existing error handling ...
  }
};
```

## Frontend Fix

1. Update the User type in `src/types/user.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'billing';
  image?: string;
  created_at?: string;
  updated_at?: string;
  staff?: {
    id: string;
    user_id: string;
    position?: string;
    bio?: string;
    commission_percentage?: number;
    is_available?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}
```

2. Update the login function in `src/api/auth.ts` to handle staff details:

```typescript
export const login = async (email: string, password: string): Promise<User> => {
  try {
    const data = await post<AuthResponse>('/auth/login', { email, password });
    
    if (data.success && data.token) {
      saveToken(data.token);
      saveUser(data.user);
      
      // If staff user but no staff details, try to fetch them
      if (data.user.role === 'staff' && !data.user.staff) {
        try {
          const userResponse = await get<UserResponse>('/auth/me');
          if (userResponse.success && userResponse.user.staff) {
            saveUser(userResponse.user);
            return userResponse.user;
          }
        } catch (profileError) {
          console.error('Error fetching staff details:', profileError);
        }
      }
      
      return data.user;
    }
    
    throw new Error('Login failed');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

3. Update the useAuth hook in `src/lib/auth.ts` to handle staff details:

```typescript
login: async (email, password) => {
  try {
    const user = await apiLogin(email, password);
    
    // If staff user but no staff details, try to fetch them
    if (user.role === 'staff' && !user.staff) {
      try {
        console.log('Staff user detected but no staff details, fetching profile...');
        const profileUser = await getCurrentUser();
        set({ 
          isAuthenticated: true, 
          userRole: profileUser.role as UserRole,
          user: profileUser
        });
        return;
      } catch (profileError) {
        console.error('Error fetching staff profile:', profileError);
      }
    }
    
    set({ 
      isAuthenticated: true, 
      userRole: user.role as UserRole,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
},
```

4. Add additional logging in the Login component to help diagnose issues:

```typescript
const onSubmit = async (values: z.infer<typeof formSchema>) => {
  try {
    setIsLoading(true);
    console.log('Attempting login with:', values.email);
    await login(values.email, values.password);
    
    console.log('Login successful, user role:', userRole);
    
    toast({
      title: 'Success',
      description: 'Welcome back!',
    });
  } catch (error) {
    let errorMessage = 'Invalid email or password';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error('Login error details:', error);
    
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
};
```

## Debugging Steps

If you're still having issues after applying these fixes, try the following:

1. Check the browser console for errors during login
2. Verify that the staff user has a corresponding record in the staff table
3. Check that the JWT token is being stored correctly in localStorage
4. Ensure that the API URL is correctly configured in the frontend

## Test Staff Login

Use the following credentials to test staff login:
- Email: teststaff@example.com
- Password: password123

This user has been created with a proper staff record and should work correctly after applying the fixes. 