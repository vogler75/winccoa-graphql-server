// Extra query methods resolvers
// Customers can add their own query functions here

function createExtrasMethods(winccoa, logger) {
  return {
    testDummy: () => ({
      success: true,
      message: 'Test dummy query executed successfully',
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = { createExtrasMethods }
