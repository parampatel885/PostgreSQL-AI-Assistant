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
  tableCount?:number;
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

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { schemaTables: true },
      },
    },
  });

  return projects.map((project) => ({
    id: Number(project.id),
    name: project.name,
    databaseUrl: decrypt(project.databaseUrl),
    createdAt: project.createdAt.toISOString(),
    tableCount: project._count.schemaTables,
  }));
}

export async function getProjectById(id: number, userId: string): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: BigInt(id),
      userId,
    },
  });

  if (!project) return null;

  return {
    id: Number(project.id),
    name: project.name,
    databaseUrl: decrypt(project.databaseUrl),
    createdAt: project.createdAt.toISOString(),
  };
}