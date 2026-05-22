import prisma from "../../config/prisma";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export async function createUser(email: string, passwordHash: string): Promise<AuthUser> {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt.toISOString(),
  };
}
