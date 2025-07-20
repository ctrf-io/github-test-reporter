// Mock for handlebars-helpers-ctrf package

const mockLoadHelpers = jest.fn((Handlebars: typeof import('handlebars')) => {
  return Handlebars
})

const mockRegistry = {
  loadHandlebars: jest.fn((Handlebars: typeof import('handlebars')) => {
    return Handlebars
  })
}

export { mockLoadHelpers as loadHelpers, mockRegistry as registry }
