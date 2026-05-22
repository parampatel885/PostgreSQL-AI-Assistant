import prisma from "../../config/prisma";
import { decrypt, encrypt } from "../../utils/crypto";

export interface CreateProjectInput {
  name: string;
  databaseUrl: string;
  userId: string;
}

export interface Project {
  id: number;
  name: string;
  databaseUrl: string;
  createdAt: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const encryptedUrl = encrypt(input.databaseUrl);

  const project = await prisma.project.create({
    data: {
      name: input.name,
      databaseUrl: encryptedUrl,
      userId: input.userId,
    },
  });

  return {
    id: Number(project.id),
    name: project.name,
    databaseUrl: decrypt(project.databaseUrl),
    createdAt: project.createdAt.toISOString(),
  };
}
