import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function getCurrentAppUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("A signed-in Clerk user is required to load the dashboard.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();

  if (!clerkUser || clerkUser.id !== userId) {
    throw new Error("The signed-in Clerk profile could not be loaded.");
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Error("Your Clerk account must have a primary email address.");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    create: {
      clerkId: clerkUser.id,
      email,
      name,
    },
    update: {
      email,
      name,
    },
  });
}
