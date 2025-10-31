// MCP Tools Registry
// Defines all WinCC OA Node.js functions exposed via MCP server
// Each tool includes comprehensive documentation, parameters, and return types

const toolsRegistry = {
  // ============================================================================
  // DATA POINT FUNCTIONS
  // ============================================================================

  dpGet: {
    name: 'dpGet',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the current values of one or more data point elements (DPEs)',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'Data point element name(s) to retrieve. Can be a single string or array of strings.',
          items: { type: 'string' }
        }
      },
      required: ['dpeNames']
    },
    returns: 'Promise<unknown>',
    returnDescription: 'Current value(s) of the DPE(s). Type must be cast to expected type.',
    throws: 'WinccoaError if DPE does not exist or user has no read access',
    example: {
      description: 'Get values from two data point elements',
      code: `const values = await dpGet(['ExampleDP_Arg1.', 'ExampleDP_DDE.b1']);`
    }
  },

  dpSet: {
    name: 'dpSet',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set the value of one or more data point element(s)',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'Data point element name(s) to set',
          items: { type: 'string' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Values to set. Must match the size and types of dpeNames array. For single DPE, provide single value. Can be any JSON type.'
        }
      },
      required: ['dpeNames', 'values']
    },
    returns: 'boolean',
    returnDescription: 'true if successful. Note: actual database update may still fail after return.',
    throws: 'WinccoaError if DPE names do not exist, values cannot be converted, or array sizes mismatch',
    example: {
      description: 'Set values for multiple data point elements',
      code: `dpSet(['ExampleDP_Arg1.', 'ExampleDP_DDE.b1'], [123.456, false]);`
    }
  },

  dpExists: {
    name: 'dpExists',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Check if a data point element exists',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name to check'
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if DPE exists, false otherwise',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check if a DPE exists',
      code: `const exists = await dpExists('ExampleDP_Arg1.');`
    }
  },

  dpConnect: {
    name: 'dpConnect',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Create a connection to receive notifications when data point element values change',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'DPE name(s) to monitor',
          items: { type: 'string' }
        },
        answer: {
          type: 'boolean',
          description: 'If true, callback is called immediately with current values. If false, only called on changes.',
          default: true
        }
      },
      required: ['dpeNames']
    },
    returns: 'number',
    returnDescription: 'Connection ID (>= 0) for later disconnection',
    throws: 'WinccoaError if parameters are invalid or DPE names are unknown',
    remarks: 'Callback receives arrays of values even for single DPE. Use dpDisconnect with returned ID to stop monitoring.',
    example: {
      description: 'Connect to data point element changes',
      code: `const connId = dpConnect(['ExampleDP_Arg1.', 'ExampleDP_Arg2.'], true);`
    }
  },

  dpDisconnect: {
    name: 'dpDisconnect',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Disconnect from a previously connected data point element',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Connection ID returned by dpConnect'
        }
      },
      required: ['id']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError if connection ID is invalid',
    example: {
      description: 'Disconnect from data point element',
      code: `await dpDisconnect(connectionId);`
    }
  },

  dpGetId: {
    name: 'dpGetId',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the unique identifier (ID) of a data point',
    inputSchema: {
      type: 'object',
      properties: {
        dpName: {
          type: 'string',
          description: 'Data point name'
        }
      },
      required: ['dpName']
    },
    returns: 'Promise<number>',
    returnDescription: 'The unique ID of the data point',
    throws: 'WinccoaError if data point does not exist',
    example: {
      description: 'Get data point ID',
      code: `const dpId = await dpGetId('ExampleDP_Arg1');`
    }
  },

  dpGetName: {
    name: 'dpGetName',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the name of a data point from its ID and element ID',
    inputSchema: {
      type: 'object',
      properties: {
        dpId: {
          type: 'number',
          description: 'Data point ID'
        },
        elemId: {
          type: 'number',
          description: 'Element ID within the data point'
        },
        systemId: {
          type: 'number',
          description: 'System ID (optional, for distributed systems)',
          default: null
        }
      },
      required: ['dpId', 'elemId']
    },
    returns: 'Promise<string>',
    returnDescription: 'The data point element name',
    throws: 'WinccoaError if IDs are invalid',
    example: {
      description: 'Get data point element name from IDs',
      code: `const dpeName = await dpGetName(12345, 1);`
    }
  },

  dpGetDescription: {
    name: 'dpGetDescription',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the description/comment of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        },
        mode: {
          type: 'number',
          description: 'Description retrieval mode (optional)',
          default: 0
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<string|WinccoaLangString>',
    returnDescription: 'Description text',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Get DPE description',
      code: `const desc = await dpGetDescription('ExampleDP_Arg1.');`
    }
  },

  dpSetDescription: {
    name: 'dpSetDescription',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set the description/comment of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        },
        comment: {
          type: 'string',
          description: 'New description text'
        }
      },
      required: ['dpeName', 'comment']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError if DPE does not exist or user lacks permissions',
    example: {
      description: 'Set DPE description',
      code: `await dpSetDescription('ExampleDP_Arg1.', 'New description text');`
    }
  },

  dpGetFormat: {
    name: 'dpGetFormat',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the format string of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<string>',
    returnDescription: 'Format string (e.g., "%d", "%.2f")',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Get DPE format',
      code: `const format = await dpGetFormat('ExampleDP_Arg1.');`
    }
  },

  dpSetFormat: {
    name: 'dpSetFormat',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set the format string of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        },
        format: {
          type: 'string',
          description: 'Format string (e.g., "%d", "%.2f")'
        }
      },
      required: ['dpeName', 'format']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError if DPE does not exist or format is invalid',
    example: {
      description: 'Set DPE format',
      code: `await dpSetFormat('ExampleDP_Arg1.', '%.2f');`
    }
  },

  dpGetUnit: {
    name: 'dpGetUnit',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the unit of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<string>',
    returnDescription: 'Unit string (e.g., "°C", "m/s")',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Get DPE unit',
      code: `const unit = await dpGetUnit('ExampleDP_Arg1.');`
    }
  },

  dpSetUnit: {
    name: 'dpSetUnit',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set the unit of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        },
        unit: {
          type: 'string',
          description: 'Unit string (e.g., "°C", "m/s")'
        }
      },
      required: ['dpeName', 'unit']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Set DPE unit',
      code: `await dpSetUnit('ExampleDP_Arg1.', '°C');`
    }
  },

  dpGetAlias: {
    name: 'dpGetAlias',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the alias of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<string>',
    returnDescription: 'Alias name, or empty string if no alias is set',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Get DPE alias',
      code: `const alias = await dpGetAlias('ExampleDP_Arg1.');`
    }
  },

  dpSetAlias: {
    name: 'dpSetAlias',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set or change the alias of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        },
        alias: {
          type: 'string',
          description: 'New alias name'
        }
      },
      required: ['dpeName', 'alias']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError if DPE does not exist or alias is invalid',
    example: {
      description: 'Set DPE alias',
      code: `await dpSetAlias('ExampleDP_Arg1.', 'myAlias');`
    }
  },

  dpAliasToName: {
    name: 'dpAliasToName',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Convert an alias name to a data point element name',
    inputSchema: {
      type: 'object',
      properties: {
        alias: {
          type: 'string',
          description: 'Alias name to convert'
        }
      },
      required: ['alias']
    },
    returns: 'Promise<string>',
    returnDescription: 'The data point element name corresponding to the alias',
    throws: 'WinccoaError if alias does not exist',
    example: {
      description: 'Convert alias to DPE name',
      code: `const dpeName = await dpAliasToName('myAlias');`
    }
  },

  dpNames: {
    name: 'dpNames',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get list of data point names matching a pattern',
    inputSchema: {
      type: 'object',
      properties: {
        dpPattern: {
          type: 'string',
          description: 'Wildcard pattern (e.g., "Example*", "*_Arg*")'
        },
        dpType: {
          type: 'string',
          description: 'Optional filter by data point type',
          default: null
        },
        ignoreCase: {
          type: 'boolean',
          description: 'Case-insensitive matching',
          default: false
        }
      },
      required: ['dpPattern']
    },
    returns: 'Promise<string[]>',
    returnDescription: 'Array of matching data point names',
    throws: 'WinccoaError on error',
    example: {
      description: 'Find all data points matching a pattern',
      code: `const dps = await dpNames('Example*');`
    }
  },

  dpTypes: {
    name: 'dpTypes',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get list of data point types matching a pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Wildcard pattern (e.g., "Example*")'
        },
        systemId: {
          type: 'number',
          description: 'Optional system ID for distributed systems',
          default: null
        },
        includeEmpty: {
          type: 'boolean',
          description: 'Include empty/unused types',
          default: false
        }
      },
      required: ['pattern']
    },
    returns: 'Promise<string[]>',
    returnDescription: 'Array of matching data point type names',
    throws: 'WinccoaError on error',
    example: {
      description: 'Find all data point types matching a pattern',
      code: `const types = await dpTypes('Example*');`
    }
  },

  dpQuery: {
    name: 'dpQuery',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Execute a query to retrieve data point values from archives',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query string (SQL-like syntax)'
        }
      },
      required: ['query']
    },
    returns: 'Promise<unknown[][]>',
    returnDescription: 'Array of result rows, each containing column values',
    throws: 'WinccoaError if query is invalid',
    remarks: 'Query uses WinCC OA query language for data point archives',
    example: {
      description: 'Query data point history',
      code: `const results = await dpQuery("SELECT '_value' FROM 'ExampleDP_Arg1' LAST 100");`
    }
  },

  dpGetPeriod: {
    name: 'dpGetPeriod',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Retrieve data point values within a time period',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: {
          type: 'number',
          description: 'Start timestamp (milliseconds since epoch)'
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (milliseconds since epoch)'
        },
        dpeList: {
          type: 'array',
          description: 'List of DPE names to retrieve',
          items: { type: 'string' }
        },
        count: {
          type: 'number',
          description: 'Maximum number of values to retrieve'
        }
      },
      required: ['startTime', 'endTime', 'dpeList', 'count']
    },
    returns: 'Promise<unknown[][]>',
    returnDescription: 'Array of values for each DPE in the time period',
    throws: 'WinccoaError on error',
    example: {
      description: 'Get values from a time period',
      code: `const values = await dpGetPeriod(startTime, endTime, ['DPE1', 'DPE2'], 1000);`
    }
  },

  dpSetWait: {
    name: 'dpSetWait',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set data point values and wait for confirmation',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'DPE name(s) to set',
          items: { type: 'string' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Values to set. Can be any JSON type.'
        }
      },
      required: ['dpeNames', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if values were successfully set in database',
    throws: 'WinccoaError on error',
    remarks: 'Unlike dpSet, this waits for database confirmation',
    example: {
      description: 'Set values with confirmation',
      code: `await dpSetWait('ExampleDP_Arg1.', 123.456);`
    }
  },

  dpSetTimed: {
    name: 'dpSetTimed',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set data point values with a specific timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Timestamp (milliseconds since epoch)'
        },
        dpeNames: {
          type: ['string', 'array'],
          description: 'DPE name(s) to set',
          items: { type: 'string' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Values to set. Can be any JSON type.'
        }
      },
      required: ['time', 'dpeNames', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set values with timestamp',
      code: `await dpSetTimed(Date.now(), 'DPE', 100);`
    }
  },

  dpSetTimedWait: {
    name: 'dpSetTimedWait',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set data point values with timestamp and wait for confirmation',
    inputSchema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Timestamp (milliseconds since epoch)'
        },
        dpeNames: {
          type: ['string', 'array'],
          description: 'DPE name(s) to set',
          items: { type: 'string' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Values to set. Can be any JSON type.'
        }
      },
      required: ['time', 'dpeNames', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successfully set in database',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set timed values with confirmation',
      code: `await dpSetTimedWait(Date.now(), 'DPE', 100);`
    }
  },

  dpCopy: {
    name: 'dpCopy',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Copy a data point to a new location',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source data point name'
        },
        destination: {
          type: 'string',
          description: 'Destination data point name'
        },
        driver: {
          type: ['string', 'null'],
          description: 'Optional driver specification. Can be null if not specified.'
        }
      },
      required: ['source', 'destination']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError on error',
    example: {
      description: 'Copy a data point',
      code: `await dpCopy('ExampleDP_Arg1', 'ExampleDP_Arg1_Copy');`
    }
  },

  dpSubStr: {
    name: 'dpSubStr',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Extract substring information from data point names',
    inputSchema: {
      type: 'object',
      properties: {
        dp: {
          type: 'string',
          description: 'Data point name'
        },
        pattern: {
          type: 'string',
          description: 'Pattern for substring extraction'
        }
      },
      required: ['dp', 'pattern']
    },
    returns: 'Promise<string>',
    returnDescription: 'Extracted substring',
    throws: 'WinccoaError on error',
    example: {
      description: 'Extract substring from DP name',
      code: `const sub = await dpSubStr('System:ExampleDP_Arg1', 'System');`
    }
  },

  dpAttributeType: {
    name: 'dpAttributeType',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the data type of a data point attribute',
    inputSchema: {
      type: 'object',
      properties: {
        dpAttributeName: {
          type: 'string',
          description: 'Data point attribute name (e.g., "config_name.attribute")'
        }
      },
      required: ['dpAttributeName']
    },
    returns: 'Promise<string|WinccoaElementType>',
    returnDescription: 'Data type of the attribute',
    throws: 'WinccoaError on error',
    example: {
      description: 'Get attribute type',
      code: `const type = await dpAttributeType('_alert_hdl.._value');`
    }
  },

  dpElementType: {
    name: 'dpElementType',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Get the element type of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Data point element name'
        }
      },
      required: ['dpeName']
    },
    returns: 'Promise<string|WinccoaElementType>',
    returnDescription: 'Element type (e.g., Int, Bool, Float)',
    throws: 'WinccoaError if DPE does not exist',
    example: {
      description: 'Get element type',
      code: `const type = await dpElementType('ExampleDP_Arg1.');`
    }
  },

  dpWaitForValue: {
    name: 'dpWaitForValue',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Wait for data point elements to meet specified conditions',
    inputSchema: {
      type: 'object',
      properties: {
        dpNamesWait: {
          type: 'array',
          description: 'DPE names to monitor',
          items: { type: 'string' }
        },
        conditions: {
          type: 'array',
          description: 'Conditions to check for each DPE. Can be numbers, strings, booleans, objects, or arrays.',
          items: { type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'] }
        },
        dpNamesReturn: {
          type: 'array',
          description: 'DPE names to return when conditions are met',
          items: { type: 'string' }
        },
        timeoutMs: {
          type: 'number',
          description: 'Timeout in milliseconds'
        }
      },
      required: ['dpNamesWait', 'conditions', 'dpNamesReturn', 'timeoutMs']
    },
    returns: 'Promise<unknown[]>',
    returnDescription: 'Values of dpNamesReturn when conditions are met',
    throws: 'WinccoaError on error or timeout',
    example: {
      description: 'Wait for condition',
      code: `const result = await dpWaitForValue(['DPE1'], [100], ['DPE2'], 5000);`
    }
  },

  dpSetAndWaitForValue: {
    name: 'dpSetAndWaitForValue',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set data point values and wait for related values to meet conditions',
    inputSchema: {
      type: 'object',
      properties: {
        dpNamesSet: {
          type: 'array',
          description: 'DPE names to set',
          items: { type: 'string' }
        },
        dpValuesSet: {
          type: 'array',
          description: 'Values to set. Can contain any JSON types.',
          items: { type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'] }
        },
        dpNamesWait: {
          type: 'array',
          description: 'DPE names to monitor',
          items: { type: 'string' }
        },
        conditions: {
          type: 'array',
          description: 'Conditions to check. Can contain any JSON types.',
          items: { type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'] }
        },
        dpNamesReturn: {
          type: 'array',
          description: 'DPE names to return',
          items: { type: 'string' }
        },
        timeoutMs: {
          type: 'number',
          description: 'Timeout in milliseconds'
        }
      },
      required: ['dpNamesSet', 'dpValuesSet', 'dpNamesWait', 'conditions', 'dpNamesReturn', 'timeoutMs']
    },
    returns: 'Promise<unknown[]>',
    returnDescription: 'Values of dpNamesReturn when conditions are met',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set and wait for value',
      code: `const result = await dpSetAndWaitForValue(['IN'], [1], ['OUT'], [1], ['RESULT'], 5000);`
    }
  },

  nameCheck: {
    name: 'nameCheck',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Validate a name according to WinCC OA naming rules',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to validate'
        },
        nameType: {
          type: 'string',
          enum: ['Dp', 'Path', 'Project'],
          description: 'Type of name to validate'
        }
      },
      required: ['name', 'nameType']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if name is valid',
    throws: 'WinccoaError on error',
    example: {
      description: 'Validate name',
      code: `const valid = await nameCheck('ExampleDP_Arg1', 'Dp');`
    }
  },

  // ============================================================================
  // DATA POINT MANAGEMENT FUNCTIONS (Create/Delete/Type)
  // ============================================================================

  dpCreate: {
    name: 'dpCreate',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Create a new data point',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Name for the new data point'
        },
        dpType: {
          type: 'string',
          description: 'Type of data point to create'
        },
        systemId: {
          type: 'number',
          description: 'Optional system ID for distributed systems',
          default: null
        },
        dpId: {
          type: 'number',
          description: 'Optional specific data point ID. If exists, random ID is used.',
          default: null
        }
      },
      required: ['dpeName', 'dpType']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if data point was successfully created',
    throws: 'WinccoaError if name exists, type is invalid, or user lacks permissions',
    example: {
      description: 'Create a new data point',
      code: `const created = await dpCreate('newDP', 'ExampleDP_Float');`
    }
  },

  dpDelete: {
    name: 'dpDelete',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Delete a data point',
    inputSchema: {
      type: 'object',
      properties: {
        dpName: {
          type: 'string',
          description: 'Name of the data point to delete'
        }
      },
      required: ['dpName']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if data point was successfully deleted',
    throws: 'WinccoaError if data point does not exist or user lacks permissions',
    example: {
      description: 'Delete a data point',
      code: `const deleted = await dpDelete('newDP');`
    }
  },

  dpTypeCreate: {
    name: 'dpTypeCreate',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Create a new data point type',
    inputSchema: {
      type: 'object',
      properties: {
        startNode: {
          type: 'object',
          description: 'Root node definition for the type structure'
        }
      },
      required: ['startNode']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if data point type was created',
    throws: 'WinccoaError on error',
    example: {
      description: 'Create data point type',
      code: `const created = await dpTypeCreate(nodeDefinition);`
    }
  },

  dpTypeChange: {
    name: 'dpTypeChange',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Modify an existing data point type',
    inputSchema: {
      type: 'object',
      properties: {
        startNode: {
          type: 'object',
          description: 'Updated node definition'
        }
      },
      required: ['startNode']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if data point type was modified',
    throws: 'WinccoaError on error',
    example: {
      description: 'Change data point type',
      code: `const changed = await dpTypeChange(updatedNode);`
    }
  },

  dpTypeDelete: {
    name: 'dpTypeDelete',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Delete a data point type',
    inputSchema: {
      type: 'object',
      properties: {
        dpt: {
          type: 'string',
          description: 'Data point type name to delete'
        }
      },
      required: ['dpt']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if data point type was deleted',
    throws: 'WinccoaError on error',
    example: {
      description: 'Delete data point type',
      code: `const deleted = await dpTypeDelete('CustomType');`
    }
  },

  dpTypeGet: {
    name: 'dpTypeGet',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Retrieve structure of a data point type',
    inputSchema: {
      type: 'object',
      properties: {
        dpt: {
          type: 'string',
          description: 'Data point type name'
        },
        includeSubTypes: {
          type: 'boolean',
          description: 'Include sub-types in result',
          default: false
        }
      },
      required: ['dpt']
    },
    returns: 'Promise<object>',
    returnDescription: 'Data point type structure definition',
    throws: 'WinccoaError if type does not exist',
    example: {
      description: 'Get data point type structure',
      code: `const typeStruct = await dpTypeGet('ExampleDP_Float');`
    }
  },

  dpTypeName: {
    name: 'dpTypeName',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Get the type name of a data point',
    inputSchema: {
      type: 'object',
      properties: {
        dp: {
          type: 'string',
          description: 'Data point name'
        }
      },
      required: ['dp']
    },
    returns: 'Promise<string>',
    returnDescription: 'Data point type name',
    throws: 'WinccoaError if data point does not exist',
    example: {
      description: 'Get data point type name',
      code: `const typeName = await dpTypeName('ExampleDP_Arg1');`
    }
  },

  // ============================================================================
  // CNS FUNCTIONS (Component Name System)
  // ============================================================================

  cnsAddNode: {
    name: 'cnsAddNode',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Add a new node to a CNS tree',
    inputSchema: {
      type: 'object',
      properties: {
        cnsParentPath: {
          type: 'string',
          description: 'Parent node path in CNS tree'
        },
        name: {
          type: 'string',
          description: 'Name of the new node'
        },
        displayName: {
          type: 'string',
          description: 'Display name for the node'
        },
        dp: {
          type: 'string',
          description: 'Associated data point name'
        }
      },
      required: ['cnsParentPath', 'name', 'displayName', 'dp']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if node was successfully added',
    throws: 'WinccoaError if parent does not exist or operation fails',
    example: {
      description: 'Add node to CNS tree',
      code: `await cnsAddNode('/System/Values', 'Temperature', 'Temp', 'Temp_DP.');`
    }
  },

  cnsAddTree: {
    name: 'cnsAddTree',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Add a new tree to CNS',
    inputSchema: {
      type: 'object',
      properties: {
        cnsParentPath: {
          type: 'string',
          description: 'Parent path in CNS'
        },
        tree: {
          type: 'object',
          description: 'Tree structure definition'
        }
      },
      required: ['cnsParentPath', 'tree']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if tree was successfully added',
    throws: 'WinccoaError on error',
    example: {
      description: 'Add tree to CNS',
      code: `await cnsAddTree('/System', treeDefinition);`
    }
  },

  cnsGetChildren: {
    name: 'cnsGetChildren',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get child nodes of a CNS node',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'CNS path to parent node'
        }
      },
      required: ['cnsPath']
    },
    returns: 'Promise<WinccoaCnsTreeNode[]>',
    returnDescription: 'Array of child node definitions',
    throws: 'WinccoaError if path does not exist',
    example: {
      description: 'Get child nodes',
      code: `const children = await cnsGetChildren('/System/Values');`
    }
  },

  cnsGetDisplayNames: {
    name: 'cnsGetDisplayNames',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get display names for a CNS node',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'CNS path'
        }
      },
      required: ['cnsPath']
    },
    returns: 'Promise<object>',
    returnDescription: 'Display names in different languages',
    throws: 'WinccoaError if path does not exist',
    example: {
      description: 'Get display names',
      code: `const names = await cnsGetDisplayNames('/System/Values');`
    }
  },

  cnsGetId: {
    name: 'cnsGetId',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get the ID of a CNS node by its path',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'CNS path'
        },
        typeOutput: {
          type: 'string',
          description: 'Type of output (e.g., "id", "name")',
          default: 'id'
        }
      },
      required: ['cnsPath']
    },
    returns: 'Promise<string|number>',
    returnDescription: 'Node ID or identifier',
    throws: 'WinccoaError if path does not exist',
    example: {
      description: 'Get node ID',
      code: `const id = await cnsGetId('/System/Values');`
    }
  },

  cnsGetProperty: {
    name: 'cnsGetProperty',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get a property value of a CNS node',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'CNS path'
        },
        key: {
          type: 'string',
          description: 'Property key name'
        }
      },
      required: ['cnsPath', 'key']
    },
    returns: 'Promise<unknown>',
    returnDescription: 'Property value',
    throws: 'WinccoaError if path or property does not exist',
    example: {
      description: 'Get node property',
      code: `const value = await cnsGetProperty('/System/Values', 'description');`
    }
  },

  cnsSetProperty: {
    name: 'cnsSetProperty',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Set a property value of a CNS node',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'CNS path'
        },
        key: {
          type: 'string',
          description: 'Property key name'
        },
        value: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'New property value. Can be any JSON type.'
        },
        valueType: {
          type: 'string',
          description: 'Data type of the value (e.g., "string", "number", "boolean", "array")'
        }
      },
      required: ['cnsPath', 'key', 'value', 'valueType']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if property was set',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set node property',
      code: `await cnsSetProperty('/System/Values', 'description', 'Temperature sensor', 'string');`
    }
  },

  cnsNodeExists: {
    name: 'cnsNodeExists',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Check if a CNS node exists',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'CNS path to check'
        }
      },
      required: ['path']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if node exists',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check if node exists',
      code: `const exists = await cnsNodeExists('/System/Values');`
    }
  },

  cnsDeleteTree: {
    name: 'cnsDeleteTree',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Delete a CNS tree',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'Path of tree to delete'
        }
      },
      required: ['cnsPath']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if tree was deleted',
    throws: 'WinccoaError on error',
    example: {
      description: 'Delete tree',
      code: `await cnsDeleteTree('/OldTree');`
    }
  },

  cnsDeleteView: {
    name: 'cnsDeleteView',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Delete a CNS view',
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          description: 'View name to delete'
        }
      },
      required: ['view']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if view was deleted',
    throws: 'WinccoaError on error',
    example: {
      description: 'Delete view',
      code: `await cnsDeleteView('OldView');`
    }
  },

  cnsGetViewDisplayNames: {
    name: 'cnsGetViewDisplayNames',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get display names for a CNS view',
    inputSchema: {
      type: 'object',
      properties: {
        viewPath: {
          type: 'string',
          description: 'View path'
        }
      },
      required: ['viewPath']
    },
    returns: 'Promise<object>',
    returnDescription: 'Display names in different languages',
    throws: 'WinccoaError if view does not exist',
    example: {
      description: 'Get view display names',
      code: `const names = await cnsGetViewDisplayNames('MainView');`
    }
  },

  cnsGetTrees: {
    name: 'cnsGetTrees',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get trees associated with a view',
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          description: 'View name'
        }
      },
      required: ['view']
    },
    returns: 'Promise<string[]>',
    returnDescription: 'Array of tree names',
    throws: 'WinccoaError if view does not exist',
    example: {
      description: 'Get trees for view',
      code: `const trees = await cnsGetTrees('MainView');`
    }
  },

  cnsGetViews: {
    name: 'cnsGetViews',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Get views for a system',
    inputSchema: {
      type: 'object',
      properties: {
        systemName: {
          type: 'string',
          description: 'System name'
        }
      },
      required: ['systemName']
    },
    returns: 'Promise<string[]>',
    returnDescription: 'Array of view names',
    throws: 'WinccoaError on error',
    example: {
      description: 'Get system views',
      code: `const views = await cnsGetViews('System');`
    }
  },

  cnsCreateView: {
    name: 'cnsCreateView',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Create a new CNS view',
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          description: 'View name'
        },
        displayName: {
          type: 'string',
          description: 'Display name'
        },
        separator: {
          type: 'string',
          description: 'Path separator character'
        }
      },
      required: ['view', 'displayName', 'separator']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if view was created',
    throws: 'WinccoaError on error',
    example: {
      description: 'Create view',
      code: `await cnsCreateView('NewView', 'New View', '/');`
    }
  },

  cnsCheckName: {
    name: 'cnsCheckName',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Validate a CNS name',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to validate'
        }
      },
      required: ['name']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if name is valid',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check name validity',
      code: `const valid = await cnsCheckName('validNodeName');`
    }
  },

  cnsIsNode: {
    name: 'cnsIsNode',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Check if a CNS path is a node',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'CNS path to check'
        }
      },
      required: ['path']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if path is a node',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check if path is node',
      code: `const isNode = await cnsIsNode('/System/Values');`
    }
  },

  cnsIsTree: {
    name: 'cnsIsTree',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Check if a CNS path is a tree',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'CNS path to check'
        }
      },
      required: ['path']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if path is a tree',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check if path is tree',
      code: `const isTree = await cnsIsTree('/System/Values');`
    }
  },

  cnsIsView: {
    name: 'cnsIsView',
    enabled: true,
    category: 'CNS_FUNCTIONS',
    description: 'Check if a CNS path is a view',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'CNS path to check'
        }
      },
      required: ['path']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if path is a view',
    throws: 'WinccoaError on error',
    example: {
      description: 'Check if path is view',
      code: `const isView = await cnsIsView('MainView');`
    }
  },

  // ============================================================================
  // ALERT FUNCTIONS
  // ============================================================================

  alertGet: {
    name: 'alertGet',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Get the current alert attributes of a data point element',
    inputSchema: {
      type: 'object',
      properties: {
        alertsTime: {
          type: ['object', 'array'],
          description: 'Alert time object(s) with time, count, and dpe properties'
        },
        dpeNames: {
          type: ['string', 'array'],
          description: 'DPE name(s) with alert configuration',
          items: { type: 'string' }
        },
        alertCount: {
          type: ['number', 'array'],
          description: 'Optional serial number of alert',
          items: { type: 'number' },
          default: null
        }
      },
      required: ['alertsTime', 'dpeNames']
    },
    returns: 'Promise<unknown>',
    returnDescription: 'Alert attribute value(s)',
    throws: 'WinccoaError if DPE does not exist or user lacks read access',
    example: {
      description: 'Get alert values',
      code: `const values = await alertGet(alertTime, ['DPE._alert_hdl.._value', 'DPE._alert_hdl.._text']);`
    }
  },

  alertSet: {
    name: 'alertSet',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Set alert attribute values',
    inputSchema: {
      type: 'object',
      properties: {
        alerts: {
          type: ['object', 'array'],
          description: 'Alert time object(s) to set'
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s) to set. Can be any JSON type.'
        }
      },
      required: ['alerts', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if alert was set',
    throws: 'WinccoaError on error',
    remarks: 'Settable attributes are defined in _alert_hdl configuration',
    example: {
      description: 'Set alert attribute',
      code: `await alertSet(alertTime, 'Alert comment text');`
    }
  },

  alertSetWait: {
    name: 'alertSetWait',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Set alert attributes and wait for confirmation',
    inputSchema: {
      type: 'object',
      properties: {
        alerts: {
          type: ['object', 'array'],
          description: 'Alert time object(s)'
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.'
        }
      },
      required: ['alerts', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successfully set in database',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set alert and confirm',
      code: `await alertSetWait(alertTime, 'Confirmed');`
    }
  },

  alertSetTimed: {
    name: 'alertSetTimed',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Set alert attributes with specific timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Timestamp (milliseconds since epoch)'
        },
        alerts: {
          type: ['object', 'array'],
          description: 'Alert time object(s)'
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.'
        }
      },
      required: ['time', 'alerts', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successful',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set alert with timestamp',
      code: `await alertSetTimed(Date.now(), alertTime, 'value');`
    }
  },

  alertSetTimedWait: {
    name: 'alertSetTimedWait',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Set alert attributes with timestamp and wait for confirmation',
    inputSchema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Timestamp (milliseconds since epoch)'
        },
        alerts: {
          type: ['object', 'array'],
          description: 'Alert time object(s)'
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.'
        }
      },
      required: ['time', 'alerts', 'values']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'true if successfully set in database',
    throws: 'WinccoaError on error',
    example: {
      description: 'Set timed alert and confirm',
      code: `await alertSetTimedWait(Date.now(), alertTime, 'value');`
    }
  },

  alertGetPeriod: {
    name: 'alertGetPeriod',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Retrieve alerts from a time period',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: {
          type: 'number',
          description: 'Start timestamp (milliseconds since epoch)'
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (milliseconds since epoch)'
        },
        names: {
          type: 'array',
          description: 'DPE or alert names to query',
          items: { type: 'string' }
        }
      },
      required: ['startTime', 'endTime', 'names']
    },
    returns: 'Promise<unknown[][]>',
    returnDescription: 'Array of alert records',
    throws: 'WinccoaError on error',
    example: {
      description: 'Get alerts from time period',
      code: `const alerts = await alertGetPeriod(startTime, endTime, ['DPE1', 'DPE2']);`
    }
  }
};

// Export registry
module.exports = { toolsRegistry };
