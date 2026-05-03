export const DefaultArtifactClient = jest.fn().mockImplementation(() => ({
  uploadArtifact: jest.fn().mockResolvedValue({ id: 1, size: 0 }),
  downloadArtifact: jest.fn().mockResolvedValue({ downloadPath: '/tmp/mock' }),
  listArtifacts: jest.fn().mockResolvedValue({ artifacts: [] }),
  deleteArtifact: jest.fn().mockResolvedValue({ id: 1 }),
  getArtifact: jest.fn().mockResolvedValue({ artifact: null })
}))
