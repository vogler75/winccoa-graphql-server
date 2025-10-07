// Extra GraphQL resolver functions for additional WinCC OA functionality

function createExtrasResolvers(winccoa, logger) {
  return {
    Mutation: {
      async setOpcUaAddress(_, { datapointName, driverNumber, addressDirection, addressDataType, serverName, subscriptionName, nodeId }) {
        try {
          // First dpSet operation: Set distribution type and driver
          const firstDpeNames = [
            `${datapointName}:_distrib.._type`,
            `${datapointName}:_distrib.._driver`
          ];
          const firstValues = [56, driverNumber];
          
          const firstResult = await winccoa.dpSet(firstDpeNames, firstValues);
          if (!firstResult) {
            throw new Error('Failed to set distribution type and driver');
          }

          // Second dpSet operation: Set OPC UA address configuration
          const secondDpeNames = [
            `${datapointName}:_address.._type`,
            `${datapointName}:_address.._reference`,
            `${datapointName}:_address.._offset`,
            `${datapointName}:_address.._subindex`,
            `${datapointName}:_address.._direction`,
            `${datapointName}:_address.._internal`,
            `${datapointName}:_address.._lowlevel`,
            `${datapointName}:_address.._active`,
            `${datapointName}:_address.._datatype`,
            `${datapointName}:_address.._drv_ident`
          ];
          const secondValues = [
            16, // Address type for OPC UA
            `${serverName}$${subscriptionName}$1$1$${nodeId}`,
            0, // offset
            0, // subindex
            addressDirection,
            0, // internal
            0, // lowlevel
            1, // active
            addressDataType,
            "OPCUA" // drv_ident
          ];
          
          const secondResult = await winccoa.dpSet(secondDpeNames, secondValues);
          if (!secondResult) {
            throw new Error('Failed to set OPC UA address configuration');
          }

          return true;
        } catch (error) {
          logger.error('setOpcUaAddress error:', error);
          throw new Error(`Failed to set OPC UA address: ${error.message}`);
        }
      }
    }
  };
}

module.exports = {
  createExtrasResolvers
};