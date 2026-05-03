import { vi } from 'vitest'

export const DefaultArtifactClient = vi.fn().mockImplementation(() => ({
  uploadArtifact: vi.fn().mockResolvedValue({ id: 1, size: 0 }),
  downloadArtifact: vi.fn().mockResolvedValue({ downloadPath: '/tmp/mock' }),
  listArtifacts: vi.fn().mockResolvedValue({ artifacts: [] }),
  deleteArtifact: vi.fn().mockResolvedValue({ id: 1 }),
  getArtifact: vi.fn().mockResolvedValue({ artifact: null })
}))
