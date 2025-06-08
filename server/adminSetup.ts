import { storage } from "./storage";

export async function createAdminUser() {
  try {
    // Create a default admin user if none exists
    const adminUser = await storage.upsertUser({
      id: "admin-user-1",
      email: "admin@tournament.app",
      firstName: "Tournament",
      lastName: "Admin",
      role: "admin",
    });
    
    console.log("Admin user created:", adminUser.email);
    return adminUser;
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

export async function promoteUserToAdmin(userId: string) {
  try {
    const user = await storage.getUser(userId);
    if (user) {
      await storage.upsertUser({
        ...user,
        role: "admin",
      });
      console.log(`User ${user.email} promoted to admin`);
    }
  } catch (error) {
    console.error("Error promoting user to admin:", error);
  }
}