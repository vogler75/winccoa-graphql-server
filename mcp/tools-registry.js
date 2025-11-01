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
    description: 'Get the current values of one or more data point elements (DPEs). Returns values directly from the database without type conversion verification.',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'Single data point element name (string) or multiple names (string[]). Examples: "ExampleDP_Arg1.", or ["ExampleDP_Arg1.", "ExampleDP_DDE.b1"]',
          items: { type: 'string' }
        }
      },
      required: ['dpeNames']
    },
    returns: 'Promise<unknown>',
    returnDescription: 'Promise that resolves to current value(s) of the DPE(s). For single DPE, returns single value. For multiple DPEs, returns array of values in same order. Type must be cast to expected type before use.',
    throws: 'WinccoaError when DPE does not exist, current user has no read access, or invalid parameter type given',
    example: {
      description: 'Get values from two data point elements',
      code: `const values = await dpGet(['ExampleDP_Arg1.', 'ExampleDP_DDE.b1']); // returns array [number, boolean]`
    }
  },

  dpSet: {
    name: 'dpSet',
    enabled: true,
    category: 'DP_FUNCTIONS',
    description: 'Set the value of one or more data point element(s). Returns immediately without waiting for database confirmation - actual update may still fail after return. Use dpSetWait() for confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        dpeNames: {
          type: ['string', 'array'],
          description: 'Single DPE name (string) or multiple names (string[]). Must match size of values parameter. Examples: "ExampleDP_Arg1.", or ["ExampleDP_Arg1.", "ExampleDP_DDE.b1"]',
          items: { type: 'string' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Single value or array of values. Must match size and order of dpeNames. For single DPE string, pass single value (not array). For array of DPEs, pass matching array of values. Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
        }
      },
      required: ['dpeNames', 'values']
    },
    returns: 'boolean',
    returnDescription: 'Returns true if send is successful. IMPORTANT: This does not mean database update succeeded - actual update can still fail after this returns. Use dpSetWait() if confirmation is required.',
    throws: 'WinccoaError when DPE names do not exist, values cannot be converted, array sizes mismatch, invalid parameter types, or user lacks write access',
    example: {
      description: 'Set values for multiple data point elements',
      code: `dpSet(['ExampleDP_Arg1.', 'ExampleDP_DDE.b1'], [123.456, false]); // two arrays of size 2\ndpSet('ExampleDP_Arg2.', 2); // single string and single value`
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
    description: 'Queries DP attributes over a specified period of time. Returns historical values and their timestamps for the given DPEs.',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: {
          type: ['object', 'string', 'number'],
          description: 'WinccoaTime object or Date: The start time of the interval from which values should be returned. Pass JavaScript Date object or WinccoaTime object.'
        },
        endTime: {
          type: ['object', 'string', 'number'],
          description: 'WinccoaTime object or Date: The end time of the interval from which values should be returned. Pass JavaScript Date object or WinccoaTime object.'
        },
        dpeList: {
          type: 'array',
          description: 'Array of DPE (data point element) names as strings. Example: ["System1:ExampleDP_Trend1.", "System1:ExampleDP_Trend2."]',
          items: { type: 'string' }
        },
        count: {
          type: 'number',
          description: 'Optional number of boundary values before startTime and after endTime to also return. Default: 0. These boundary values help with interpolation.'
        }
      },
      required: ['startTime', 'endTime', 'dpeList']
    },
    returns: 'Promise<object[]>',
    returnDescription: 'Promise resolves to array of results (one for each DPE in same order as dpeList). Each result contains: {values: unknown[], timestamps: WinccoaTime[]} - the values array and corresponding timestamps array.',
    throws: 'WinccoaError when empty dpeList provided, data point not found, invalid startTime/endTime, invalid requestId, or user lacks read access',
    example: {
      description: 'Get historical values from a time period',
      code: `const startTime = new Date(2023, 0, 1);\nconst endTime = new Date(2023, 11, 31);\nconst results = await dpGetPeriod(startTime, endTime, ['System1:ExampleDP_Trend1.'], 0);\n// results[0] = {values: [...], timestamps: [...]}`
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
          description: 'Values to set. Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
          description: 'Values to set. Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
          description: 'Values to set. Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
    description: 'Copies a data point including its full configuration (attributes, elements, structure). Destination must not already exist.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Name of the data point to copy (source DP name). Must exist.'
        },
        destination: {
          type: 'string',
          description: 'Name of the new copied data point (destination DP name). Must NOT exist yet.'
        },
        driver: {
          type: ['number', 'null'],
          description: 'Optional driver number (default: 1). Specifies which driver to use for the copy. Pass null or omit for default.'
        }
      },
      required: ['source', 'destination']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'Promise resolves to true if copy successful. On error, error.details contains same error code as CTRL dpCopy().',
    throws: 'WinccoaError when source DP does not exist, destination already exists, DP copied into itself, invalid arguments, or user lacks required privileges',
    example: {
      description: 'Copy a data point with its configuration',
      code: `const success = await dpCopy('ExampleDP_Arg1', 'ExampleDP_Arg1_Copy');\nif (success) console.log('DP copied successfully');`
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
    description: 'Creates a new data point of specified type. Can optionally specify target system (for distributed systems) and data point ID.',
    inputSchema: {
      type: 'object',
      properties: {
        dpeName: {
          type: 'string',
          description: 'Name for the new data point. Must be unique and follow WinCC OA naming rules. Cannot already exist.'
        },
        dpType: {
          type: 'string',
          description: 'Type of data point to create. Must be an existing and valid DP type (e.g., "ExampleDP_Float").'
        },
        systemId: {
          type: ['number', 'null'],
          description: 'Optional system ID for distributed systems. Used to create data point on remote system. Default: local system. Pass null to omit.'
        },
        dpId: {
          type: ['number', 'null'],
          description: 'Optional specific data point ID. If provided ID already exists, a random ID is assigned instead. Default: auto-assigned. Pass null to omit.'
        }
      },
      required: ['dpeName', 'dpType']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'Promise resolves to true if data point was successfully created.',
    throws: 'WinccoaError when invalid argument type, invalid dpeName/dpType, DP with dpeName already exists, non-existing systemId, or user lacks create privileges',
    example: {
      description: 'Create a new data point of type ExampleDP_Float',
      code: `const created = await dpCreate('newFloatDpe', 'ExampleDP_Float');\nif (created) console.log('DP created successfully');`
    }
  },

  dpDelete: {
    name: 'dpDelete',
    enabled: true,
    category: 'DP_MANAGEMENT_FUNCTIONS',
    description: 'Deletes a data point and all its configuration. In distributed systems, include system name in the DP name.',
    inputSchema: {
      type: 'object',
      properties: {
        dpName: {
          type: 'string',
          description: 'Name of the data point to delete. For distributed systems, use format: "SystemName:DataPointName".'
        }
      },
      required: ['dpName']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'Promise resolves to true if data point was successfully deleted.',
    throws: 'WinccoaError when data point with given name does not exist, or current user lacks delete privileges',
    example: {
      description: 'Delete a data point',
      code: `const deleted = await dpDelete('newDpe');\nif (deleted) console.log('DP deleted successfully');`
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
    description: 'Adds a new node to a CNS (Central Navigation System) tree or sub-tree under specified parent node.',
    inputSchema: {
      type: 'object',
      properties: {
        cnsParentPath: {
          type: 'string',
          description: 'ID path of the parent node (must be node, not view). Format: "System.View:ParentNode" or similar. Example: "System1.View1:Node1"'
        },
        name: {
          type: 'string',
          description: 'ID of the new node (must use valid characters). Example: "Temperature" or "MyNode_1"'
        },
        displayName: {
          type: ['string', 'object'],
          description: 'Display name as multi-language string or plain string. Example: "Temperature Reading" or language object'
        },
        dp: {
          type: ['string', 'null'],
          description: 'Optional data point (element) linked to node. Format: "System:DataPoint." or empty string for no DP link. Default: empty string (no link)'
        }
      },
      required: ['cnsParentPath', 'name', 'displayName']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'Promise resolves to true if node successfully added.',
    throws: 'WinccoaError when wrong/missing parameters, defined cnsParentPath not found, illegal characters in name, or user lacks privileges',
    remarks: 'cnsParentPath must point to node (not view). dp parameter is optional and can be empty string.',
    example: {
      description: 'Add node to CNS tree with data point',
      code: `const success = await cnsAddNode('System1.View1:Node1', 'Temperature', 'Temperature', 'System1:Temp_DP.');\nif (success) console.log('Node added');`
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
    description: 'Returns the paths of all child nodes for a given CNS node. Throws error if node does not exist.',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'ID path of the node. Format: "System.View:Node" or "System.View:Node.ChildNode". Example: "System1.View1:Node1"'
        }
      },
      required: ['cnsPath']
    },
    returns: 'string[]',
    returnDescription: 'Array of child node paths (string[]). Each path is in same format as cnsPath. Empty array if no children.',
    throws: 'WinccoaError when invalid parameters, cnsPath or child nodes do not exist, or user lacks read access',
    remarks: 'Returns immediate children only, not recursive descendants. Use returned paths as cnsPath for cnsGetChildren to explore deeper.',
    example: {
      description: 'Get all child nodes of a parent',
      code: `const children = cnsGetChildren('System1.View1:Node1');\n// Returns: ['System1.View1:Node1.Child1', 'System1.View1:Node1.Child2']`
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
    description: 'Sets a property value for a CNS node. Properties are custom key-value pairs with specified data types.',
    inputSchema: {
      type: 'object',
      properties: {
        cnsPath: {
          type: 'string',
          description: 'ID path of the CNS node. Format: "System.View:Node" or "System.View:Node.ChildNode". Example: "System1.View1:Node1"'
        },
        key: {
          type: 'string',
          description: 'Property key name. Custom identifier for the property being set. Example: "description" or "config_version"'
        },
        value: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'New property value. Can be any JSON type. Value will be stored according to valueType specification.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
        },
        valueType: {
          type: 'string',
          description: 'Data type of value: "string", "number" (float), "int", "bool", "time", "blob", "langString", etc. Must match WinCC OA data type constants.'
        }
      },
      required: ['cnsPath', 'key', 'value', 'valueType']
    },
    returns: 'Promise<boolean>',
    returnDescription: 'Promise resolves to true if property was successfully set.',
    throws: 'WinccoaError when wrong/missing parameters, cnsPath not found, invalid valueType, conversion impossible, or user lacks write access',
    remarks: 'valueType must be valid WinCC OA data type (string, number, bool, etc.). Properties are custom metadata stored with the node.',
    example: {
      description: 'Set a node property with string value',
      code: `const success = await cnsSetProperty('System1.View1:Node1', 'description', 'Temperature sensor', 'string');\nif (success) console.log('Property set');`
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
    description: 'Queries the last alert attributes of data point elements. Can accept single or multiple alert times and corresponding DPEs.',
    inputSchema: {
      type: 'object',
      properties: {
        alertsTime: {
          type: ['object', 'array'],
          description: 'WinccoaAlertTime object or array of WinccoaAlertTime objects. Each contains: {time: WinccoaTime, count: number, dpe: string}',
          items: { type: 'object' }
        },
        dpeNames: {
          type: ['string', 'array'],
          description: 'Single DPE name (string) or array of names (string[]). Can access alert configs like "DPE:_alert_hdl.._value" or "DPE:_alert_hdl.._text". Must match alertsTime size if both are arrays.',
          items: { type: 'string' }
        },
        alertCount: {
          type: ['number', 'array', 'null'],
          description: 'Optional serial number of alert per DPE. Pass array matching dpeNames size, or null to omit.',
          items: { type: 'number' },
          default: null
        }
      },
      required: ['alertsTime', 'dpeNames']
    },
    returns: 'Promise<unknown>',
    returnDescription: 'Promise resolves to requested alert attribute value(s). Must be cast to expected types. For arrays of DPEs, returns values in same order.',
    throws: 'WinccoaError when DPE does not exist, user lacks read access, invalid alert time, or mismatched array sizes',
    remarks: 'Can accept: 1) Single alertTime + multiple DPEs, 2) Multiple alertTimes + multiple DPEs (must match sizes), 3) Single alertTime + single DPE',
    example: {
      description: 'Get alert attribute values',
      code: `const values = await alertGet(alertTime, ['System1:DPE:_alert_hdl.._value', 'System1:DPE:_alert_hdl.._text']);`
    }
  },

  alertSet: {
    name: 'alertSet',
    enabled: true,
    category: 'ALERT_FUNCTIONS',
    description: 'Allows setting data point alert attributes. Returns immediately without confirming database update - use alertSetWait() for confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        alerts: {
          type: ['object', 'array'],
          description: 'WinccoaAlertTime object or array of objects to be set. Each contains: {time: WinccoaTime, count: number, dpe: string}',
          items: { type: 'object' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Single value or array of values to set. Must match size of alerts parameter. For single alert, pass single value (not array). For array of alerts, pass matching array of values. Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
        }
      },
      required: ['alerts', 'values']
    },
    returns: 'boolean',
    returnDescription: 'Returns true if send successful. NOTE: Does not confirm database update - use alertSetWait() if confirmation needed. Update can still fail after this returns.',
    throws: 'WinccoaError when DPE does not exist, mismatch number of alerts and values, invalid argument type, user lacks write access, or invalid alert attributes',
    remarks: 'Settable attributes are defined in WinCC OA _alert_hdl configuration. Common attributes: _comment, _act_state. Use alertSetWait() or alertSetTimed()/alertSetTimedWait() for confirmation or delayed set.',
    example: {
      description: 'Set alert attribute value',
      code: `const success = alertSet(alertTime, 'Alert comment text from winccoa node manager.');\nif (success) console.log('Alert set command sent');`
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
          description: 'Alert time object(s)',
          items: { type: 'object' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
          description: 'Alert time object(s)',
          items: { type: 'object' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
          description: 'Alert time object(s)',
          items: { type: 'object' }
        },
        values: {
          type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
          description: 'Attribute value(s). Can be any JSON type.',
          items: {
            type: ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'],
            items: {}
          }
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
