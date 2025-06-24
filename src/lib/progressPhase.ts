import { prisma } from './prisma';

const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];

export async function progressPhase(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');
  const idx = phases.indexOf(project.currentPhase);
  if (idx === -1 || idx === phases.length - 1) return project; // Already at final phase
  const nextPhase = phases[idx + 1];
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      currentPhase: nextPhase,
      phaseHistory: { create: { phase: nextPhase } },
    },
    include: { phaseHistory: true, clientMessages: true },
  });
  return updated;
} 